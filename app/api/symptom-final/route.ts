import { NextResponse } from "next/server";
import { apiJsonError } from "@/lib/api-errors";
import type { OpenAiResponsesCreateResult } from "@/lib/openai";
import { withOpenAiRetry } from "@/lib/openai-retry";
import { apiLog } from "@/lib/server/api-log";
import { calculateAgeInMonths } from "@/lib/child-age";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { createSymptomWorkflowObserver } from "@/lib/symptom-workflow-observability";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { mergeAiTriageWithSafetyFloor } from "@/lib/post-ai-triage-guard";
import { computeTriageDecisionDiff } from "@/lib/triage-decision-diff";
import { createSymptomCheckForUser } from "@/lib/services/symptom-check-service";
import { getSymptomRateLimitKey } from "@/lib/symptom-rate-limit-key";
import { formatZodError, symptomFinalBodySchema } from "@/lib/validation/api-schemas";
import {
  normalizeReasoning,
  normalizeTriageConfidence,
  runSafetyRules,
} from "@/lib/safety-rules";
import { symptomRateLimit } from "@/lib/ratelimit";
import {
  enrichSymptomTriageResult,
  extractOptionalAiFields,
} from "@/lib/triage-enrichment";
import type { SymptomTriageCore, SymptomTriageResult } from "@/lib/symptom-triage-result";

export const dynamic = "force-dynamic";

const OPENAI_FINAL_TIMEOUT_MS = 15_000;

function extractOutputJsonText(response: {
  output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  output_text?: string;
}): string | null {
  for (const item of response.output) {
    if (item.type === "message" && item.content) {
      const block = item.content.find((c) => c.type === "output_text" && c.text);
      if (block?.text) return block.text;
    }
  }
  return response.output_text?.trim() || null;
}

function buildInputText(
  symptomText: string,
  followupAnswers: { question: string; answer: string }[]
): string {
  return `${symptomText}\n\nFollow-up answers:\n${followupAnswers
    .map((item) => `${item.question}: ${item.answer}`)
    .join("\n")}`;
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const obs = createSymptomWorkflowObserver(requestId, "symptom-final");
  let userIdForLog: string | null = null;

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      obs.set({ httpStatus: 400, errorCode: "invalid_json" });
      return apiJsonError(
        400,
        { error: "Invalid JSON body.", code: "invalid_json" },
        correlationHeaders(requestId)
      );
    }

    const validated = symptomFinalBodySchema.safeParse(raw);
    if (!validated.success) {
      const { message, fields } = formatZodError(validated.error);
      obs.set({ httpStatus: 400, errorCode: "validation_failed" });
      return apiJsonError(
        400,
        { error: message, code: "validation_failed", fields },
        correlationHeaders(requestId)
      );
    }

    const { childId: bodyChildId, symptomText, followupAnswers, disclaimerAccepted } =
      validated.data;

    const loaded = await loadChildForUser(bodyChildId, request);
    if (!loaded.ok) {
      obs.set({ httpStatus: loaded.status, errorCode: "load_child_failed" });
      return apiJsonError(
        loaded.status,
        { error: loaded.message, code: "load_child_failed" },
        correlationHeaders(requestId)
      );
    }

    const { childId, userId, child } = loaded;
    userIdForLog = userId;

    const rateKey = await getSymptomRateLimitKey(userId);
    const { success, limit, remaining, reset } = await symptomRateLimit.limit(
      `final:${rateKey}`
    );

    if (!success) {
      obs.set({ httpStatus: 429, errorCode: "rate_limited" });
      return apiJsonError(
        429,
        {
          error:
            "Too many symptom checks. Please wait a few minutes and try again.",
          code: "rate_limited",
          limit,
          remaining,
          reset,
        },
        correlationHeaders(requestId)
      );
    }

    const safetyResult = runSafetyRules(child, symptomText, followupAnswers);

    if (safetyResult.matched) {
      const ageInMonths = calculateAgeInMonths(child.date_of_birth);
      const triageRaw: SymptomTriageResult = {
        urgency: safetyResult.urgency,
        summary: safetyResult.summary,
        recommended_action: safetyResult.recommended_action,
        red_flags: safetyResult.red_flags,
        disclaimer: safetyResult.disclaimer,
        decision_source: "safety_rule",
        rule_reason: safetyResult.reason,
        confidence: "high",
        reasoning:
          "This result was triggered by a built-in safety rule for higher-risk symptoms or age groups.",
      };
      const triage = enrichSymptomTriageResult(triageRaw, {
        ageMonths: ageInMonths,
        concernSnippet: buildInputText(symptomText, followupAnswers),
      });

      const saved = await createSymptomCheckForUser({
        userId,
        childId,
        inputText: buildInputText(symptomText, followupAnswers),
        triage,
        disclaimerAccepted: Boolean(disclaimerAccepted),
        followupCount: followupAnswers.length,
        flowVersion: "final-safety-shortcircuit-v1",
      });

      if (!saved.ok) {
        apiLog("error", {
          route: "symptom-final",
          requestId,
          userId: userIdForLog,
          message: saved.message ?? "persist_failed",
          code: "persist_failed",
          path: "safety_shortcircuit",
        });
        obs.set({
          httpStatus: 500,
          errorCode: "persist_failed",
          path: "safety_shortcircuit",
          urgency: triage.urgency,
          decisionSource: triage.decision_source,
          ruleReason: triage.rule_reason,
        });
        return apiJsonError(
          500,
          { error: "Could not save this check. Please try again.", code: "persist_failed" },
          correlationHeaders(requestId)
        );
      }

      obs.set({
        httpStatus: 200,
        urgency: triage.urgency,
        decisionSource: triage.decision_source,
        ruleReason: triage.rule_reason,
        path: "safety_shortcircuit",
        errorCode: null,
      });
      return NextResponse.json(
        { ...triage, checkId: saved.checkId },
        { headers: correlationHeaders(requestId) }
      );
    }

    const ageInMonths = calculateAgeInMonths(child.date_of_birth);

    const input = `
You are a pediatric symptom triage assistant for parents.

Your role:
- Give safety-first, non-diagnostic guidance
- Do NOT diagnose
- Use plain language
- Be conservative
- If there is meaningful risk, escalate appropriately
- This is for guidance only, not medical care

Child profile:
- Name: ${child.name}
- Age in months: ${ageInMonths}
- Date of birth: ${child.date_of_birth}
- Sex at birth: ${child.sex_at_birth ?? "not provided"}
- Premature: ${child.is_premature ? "yes" : "no"}
- Gestational age at birth: ${child.gestational_age_weeks ?? "not provided"}

Parent concern:
${symptomText}

Follow-up answers:
${followupAnswers.map((item) => `- ${item.question}: ${item.answer}`).join("\n")}

Important safety rules:
- If child is under 3 months and fever is mentioned, urgency should usually be "urgent_doctor" or "emergency" depending on severity
- If breathing difficulty is mentioned, escalate appropriately
- If seizure, blue lips, severe lethargy, dehydration, or unresponsiveness is suggested, escalate appropriately
- Never say the child definitely has a disease
- Never say "do not worry"
- Use wording like "may need urgent medical assessment"

Confidence rules:
- "high" means the symptoms strongly fit a known urgency pattern from the information provided
- "medium" means the guidance is reasonable but more information or assessment may change the decision
- "low" means the information is incomplete, vague, or uncertain

Reasoning rules:
- Give a short plain-English explanation
- Do not diagnose
- Do not say the child definitely has a condition
- Explain why the urgency level was chosen

Output rules:
- The disclaimer must say this is general guidance only, not a diagnosis, and not a substitute for in-person care
- If urgency is "emergency" or "urgent_doctor", recommended_action must clearly tell the parent to seek emergency or in-person medical care now (or today), using plain language

Structured add-ons (include when helpful; omit if unsure):
- urgency_score: integer 0–100 where higher means more acute / needs faster in-person attention (align with urgency band)
- immediate_actions: 2–5 short bullet strings the parent can do in the next minutes or hours (call 911, go to ER, fluids, monitor breathing, etc.)
- watch_next: 2–5 short bullet strings of what to observe in the next hours (breathing, alertness, fever trend, hydration, etc.)
- decision_factors: 2–5 short strings naming what shaped urgency (age, fever, breathing, duration, red-flag answers, etc.)
`;

    if (!process.env.OPENAI_API_KEY?.trim()) {
      obs.set({ httpStatus: 503, errorCode: "openai_not_configured" });
      return apiJsonError(
        503,
        { error: "AI is not configured on this server.", code: "openai_not_configured" },
        correlationHeaders(requestId)
      );
    }

    const response = await withOpenAiRetry(
      async () => {
        const { getOpenAI } = await import("@/lib/openai");
        const openai = await getOpenAI();
        const openAiPromise = openai.responses.create({
          model: "gpt-5-mini",
          input,
          text: {
            format: {
              type: "json_schema",
              name: "final_triage_result",
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  urgency: {
                    type: "string",
                    enum: ["emergency", "urgent_doctor", "monitor_home"],
                  },
                  summary: {
                    type: "string",
                  },
                  recommended_action: {
                    type: "string",
                  },
                  red_flags: {
                    type: "array",
                    items: { type: "string" },
                  },
                  disclaimer: {
                    type: "string",
                  },
                  confidence: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                  reasoning: {
                    type: "string",
                  },
                  urgency_score: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description:
                      "Higher = needs faster in-person attention; align with urgency band.",
                  },
                  immediate_actions: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 0,
                    maxItems: 10,
                  },
                  watch_next: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 0,
                    maxItems: 10,
                  },
                  decision_factors: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 0,
                    maxItems: 10,
                  },
                },
                required: [
                  "urgency",
                  "summary",
                  "recommended_action",
                  "red_flags",
                  "disclaimer",
                  "confidence",
                  "reasoning",
                ],
              },
              strict: true,
            },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("OpenAI request timed out")),
            OPENAI_FINAL_TIMEOUT_MS
          )
        );

        return (await Promise.race([
          openAiPromise,
          timeoutPromise,
        ])) as OpenAiResponsesCreateResult;
      },
      { requestId }
    );

    const jsonText = extractOutputJsonText(response);

    if (!jsonText) {
      obs.set({ httpStatus: 500, errorCode: "ai_no_output", path: "final_triage_ai" });
      return apiJsonError(
        500,
        { error: "AI did not return structured output.", code: "ai_no_output" },
        correlationHeaders(requestId)
      );
    }

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(jsonText);
    } catch {
      obs.set({ httpStatus: 500, errorCode: "ai_json_invalid", path: "final_triage_ai" });
      return apiJsonError(
        500,
        { error: "AI returned invalid JSON.", code: "ai_json_invalid" },
        correlationHeaders(requestId)
      );
    }

    const o = rawParsed as Record<string, unknown>;
    const parsed: SymptomTriageCore = {
      urgency: o.urgency as SymptomTriageCore["urgency"],
      summary: typeof o.summary === "string" ? o.summary : "",
      recommended_action:
        typeof o.recommended_action === "string" ? o.recommended_action : "",
      red_flags: Array.isArray(o.red_flags)
        ? o.red_flags.filter((x): x is string => typeof x === "string")
        : [],
      disclaimer: typeof o.disclaimer === "string" ? o.disclaimer : "",
      confidence: normalizeTriageConfidence(o.confidence),
      reasoning: normalizeReasoning(o.reasoning),
    };

    const optionalFromAi = extractOptionalAiFields(rawParsed);

    const merged = mergeAiTriageWithSafetyFloor(
      child,
      symptomText,
      followupAnswers,
      parsed
    );

    const baseTriage: SymptomTriageResult = {
      ...merged.triage,
      decision_source: merged.decision_source,
      rule_reason: merged.rule_reason,
      ...(merged.decision_source === "ai" ? optionalFromAi : {}),
    };

    const triageForDb = enrichSymptomTriageResult(baseTriage, {
      ageMonths: ageInMonths,
      concernSnippet: buildInputText(symptomText, followupAnswers),
    });

    const symptomOnlySafety = runSafetyRules(child, symptomText, []);
    const baselineUrgency = symptomOnlySafety.matched
      ? symptomOnlySafety.urgency
      : "monitor_home";
    const decision_diff = computeTriageDecisionDiff({
      baselineUrgency,
      finalUrgency: triageForDb.urgency,
    });
    const triageWithDiff: SymptomTriageResult = decision_diff
      ? { ...triageForDb, decision_diff }
      : triageForDb;

    const saved = await createSymptomCheckForUser({
      userId,
      childId,
      inputText: buildInputText(symptomText, followupAnswers),
      triage: triageWithDiff,
        disclaimerAccepted: Boolean(disclaimerAccepted),
        followupCount: followupAnswers.length,
        flowVersion: "followup-v1",
    });

    if (!saved.ok) {
      apiLog("error", {
        route: "symptom-final",
        requestId,
        userId: userIdForLog,
        message: saved.message ?? "persist_failed",
        code: "persist_failed",
        path:
          merged.decision_source === "safety_rule"
            ? "final_triage_ai_safety_override"
            : "final_triage_ai",
      });
      obs.set({
        httpStatus: 500,
        errorCode: "persist_failed",
        path:
          merged.decision_source === "safety_rule"
            ? "final_triage_ai_safety_override"
            : "final_triage_ai",
        urgency: merged.triage.urgency,
        decisionSource: merged.decision_source,
        ruleReason: merged.rule_reason,
      });
      return apiJsonError(
        500,
        { error: "Could not save this check. Please try again.", code: "persist_failed" },
        correlationHeaders(requestId)
      );
    }

    obs.set({
      httpStatus: 200,
      urgency: merged.triage.urgency,
      decisionSource: merged.decision_source,
      ruleReason: merged.rule_reason ?? null,
      path:
        merged.decision_source === "safety_rule"
          ? "final_triage_ai_safety_override"
          : "final_triage_ai",
      errorCode: null,
    });
    return NextResponse.json(
      {
        ...triageWithDiff,
        checkId: saved.checkId,
      },
      { headers: correlationHeaders(requestId) }
    );
  } catch (error) {
    apiLog("error", {
      route: "symptom-final",
      requestId,
      userId: userIdForLog,
      message: error instanceof Error ? error.message : "unknown_error",
      code: error instanceof Error ? error.name : "unknown_error",
    });
    if (error instanceof Error && error.message === "OpenAI request timed out") {
      obs.set({ httpStatus: 504, errorCode: "openai_timeout" });
      return apiJsonError(
        504,
        { error: "The request took too long. Please try again.", code: "openai_timeout" },
        correlationHeaders(requestId)
      );
    }
    obs.set({
      httpStatus: 500,
      errorCode: error instanceof Error ? error.name : "unknown_error",
    });
    return apiJsonError(
      500,
      {
        error: "Something went wrong during final symptom analysis.",
        code: "internal_error",
      },
      correlationHeaders(requestId)
    );
  } finally {
    obs.end();
  }
}
