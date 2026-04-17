import { NextResponse } from "next/server";
import { getOpenAI, type OpenAiResponsesCreateResult } from "@/lib/openai";
import { calculateAgeInMonths } from "@/lib/child-age";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { createSymptomWorkflowObserver } from "@/lib/symptom-workflow-observability";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { mergeAiTriageWithSafetyFloor } from "@/lib/post-ai-triage-guard";
import { createSymptomCheckForUser } from "@/lib/services/symptom-check-service";
import { getSymptomRateLimitKey } from "@/lib/symptom-rate-limit-key";
import { formatZodError, symptomFinalBodySchema } from "@/lib/validation/api-schemas";
import {
  normalizeReasoning,
  normalizeTriageConfidence,
  runSafetyRules,
} from "@/lib/safety-rules";
import { symptomRateLimit } from "@/lib/ratelimit";
import type { SymptomTriageCore, SymptomTriageResult } from "@/lib/symptom-triage-result";

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

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      obs.set({ httpStatus: 400, errorCode: "invalid_json" });
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }

    const validated = symptomFinalBodySchema.safeParse(raw);
    if (!validated.success) {
      const { message, fields } = formatZodError(validated.error);
      obs.set({ httpStatus: 400, errorCode: "validation_failed" });
      return NextResponse.json(
        { error: message, fields },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }

    const { childId: bodyChildId, symptomText, followupAnswers, disclaimerAccepted } =
      validated.data;

    const loaded = await loadChildForUser(bodyChildId, request);
    if (!loaded.ok) {
      obs.set({ httpStatus: loaded.status, errorCode: "load_child_failed" });
      return NextResponse.json(
        { error: loaded.message },
        { status: loaded.status, headers: correlationHeaders(requestId) }
      );
    }

    const { childId, userId, child } = loaded;

    const rateKey = await getSymptomRateLimitKey(userId);
    const { success, limit, remaining, reset } = await symptomRateLimit.limit(
      `final:${rateKey}`
    );

    if (!success) {
      obs.set({ httpStatus: 429, errorCode: "rate_limited" });
      return NextResponse.json(
        {
          error: "Too many symptom checks. Please wait a few minutes and try again.",
          limit,
          remaining,
          reset,
        },
        { status: 429, headers: correlationHeaders(requestId) }
      );
    }

    const safetyResult = runSafetyRules(child, symptomText, followupAnswers);

    if (safetyResult.matched) {
      const triage: SymptomTriageResult = {
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
        console.error(`[symptom-final ${requestId}] save failed:`, saved.message);
        obs.set({
          httpStatus: 500,
          errorCode: "persist_failed",
          path: "safety_shortcircuit",
          urgency: triage.urgency,
          decisionSource: triage.decision_source,
        });
        return NextResponse.json(
          { error: "Could not save this check. Please try again." },
          { status: 500, headers: correlationHeaders(requestId) }
        );
      }

      obs.set({
        httpStatus: 200,
        urgency: triage.urgency,
        decisionSource: triage.decision_source,
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
`;

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

    const response = (await Promise.race([
      openAiPromise,
      timeoutPromise,
    ])) as OpenAiResponsesCreateResult;

    const jsonText = extractOutputJsonText(response);

    if (!jsonText) {
      obs.set({ httpStatus: 500, errorCode: "ai_no_output", path: "final_triage_ai" });
      return NextResponse.json(
        { error: "AI did not return structured output." },
        { status: 500, headers: correlationHeaders(requestId) }
      );
    }

    let parsed: SymptomTriageCore;
    try {
      parsed = JSON.parse(jsonText) as SymptomTriageCore;
    } catch {
      obs.set({ httpStatus: 500, errorCode: "ai_json_invalid", path: "final_triage_ai" });
      return NextResponse.json(
        { error: "AI returned invalid JSON." },
        { status: 500, headers: correlationHeaders(requestId) }
      );
    }

    parsed = {
      ...parsed,
      confidence: normalizeTriageConfidence(parsed.confidence),
      reasoning: normalizeReasoning(parsed.reasoning),
    };

    const merged = mergeAiTriageWithSafetyFloor(
      child,
      symptomText,
      followupAnswers,
      parsed
    );

    const triageForDb = {
      ...merged.triage,
      decision_source: merged.decision_source,
      rule_reason: merged.rule_reason,
    };

    const saved = await createSymptomCheckForUser({
      userId,
      childId,
      inputText: buildInputText(symptomText, followupAnswers),
      triage: triageForDb,
        disclaimerAccepted: Boolean(disclaimerAccepted),
        followupCount: followupAnswers.length,
        flowVersion: "followup-v1",
    });

    if (!saved.ok) {
      console.error(`[symptom-final ${requestId}] save failed:`, saved.message);
      obs.set({
        httpStatus: 500,
        errorCode: "persist_failed",
        path: "final_triage_ai",
        urgency: merged.triage.urgency,
        decisionSource: merged.decision_source,
      });
      return NextResponse.json(
        { error: "Could not save this check. Please try again." },
        { status: 500, headers: correlationHeaders(requestId) }
      );
    }

    obs.set({
      httpStatus: 200,
      urgency: merged.triage.urgency,
      decisionSource: merged.decision_source,
      path: "final_triage_ai",
      errorCode: null,
    });
    return NextResponse.json(
      {
        ...merged.triage,
        decision_source: merged.decision_source,
        rule_reason: merged.rule_reason,
        checkId: saved.checkId,
      },
      { headers: correlationHeaders(requestId) }
    );
  } catch (error) {
    console.error(`[symptom-final ${requestId}]`, error);
    if (error instanceof Error && error.message === "OpenAI request timed out") {
      obs.set({ httpStatus: 504, errorCode: "openai_timeout" });
      return NextResponse.json(
        { error: "The request took too long. Please try again." },
        { status: 504, headers: correlationHeaders(requestId) }
      );
    }
    obs.set({
      httpStatus: 500,
      errorCode: error instanceof Error ? error.name : "unknown_error",
    });
    return NextResponse.json(
      { error: "Something went wrong during final symptom analysis." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  } finally {
    obs.end();
  }
}
