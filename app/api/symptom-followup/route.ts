import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { calculateAgeInMonths } from "@/lib/child-age";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { createSymptomWorkflowObserver } from "@/lib/symptom-workflow-observability";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { createSymptomCheckForUser } from "@/lib/services/symptom-check-service";
import { getSymptomRateLimitKey } from "@/lib/symptom-rate-limit-key";
import type { SymptomTriageResult } from "@/lib/symptom-triage-result";
import { formatZodError, symptomFollowupBodySchema } from "@/lib/validation/api-schemas";
import { runSafetyRules } from "@/lib/safety-rules";
import { symptomRateLimit } from "@/lib/ratelimit";

const OPENAI_FOLLOWUP_TIMEOUT_MS = 15_000;

/** Non-streaming response from `responses.create` (excludes `Stream` union member). */
type OpenAiResponsesCreateResult = Extract<
  Awaited<ReturnType<typeof openai.responses.create>>,
  { output: unknown }
>;

type FollowupResult = {
  questions: string[];
};

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

function parseQuestionsJson(text: string): FollowupResult | null {
  try {
    const parsed = JSON.parse(text) as { questions?: unknown };
    if (!parsed?.questions || !Array.isArray(parsed.questions)) return null;
    const questions = parsed.questions
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .map((q) => q.trim());
    if (questions.length !== 3) return null;
    return { questions };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const obs = createSymptomWorkflowObserver(requestId, "symptom-followup");

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

    const validated = symptomFollowupBodySchema.safeParse(raw);
    if (!validated.success) {
      const { message, fields } = formatZodError(validated.error);
      obs.set({ httpStatus: 400, errorCode: "validation_failed" });
      return NextResponse.json(
        { error: message, fields },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }

    const { childId: bodyChildId, symptomText, disclaimerAccepted } = validated.data;

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
      `followup:${rateKey}`
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

    const safetyResult = runSafetyRules(child, symptomText, []);

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
        inputText: symptomText,
        triage,
        disclaimerAccepted: Boolean(disclaimerAccepted),
        followupCount: 0,
        flowVersion: "followup-safety-shortcircuit-v1",
      });

      if (!saved.ok) {
        console.error(`[symptom-followup ${requestId}] save failed:`, saved.message);
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
You are a pediatric triage assistant.
Generate exactly 3 short follow-up questions in plain English.
Use simple language. Focus on urgency and safety. No diagnosis or explanations.

Child profile:
- Name: ${child.name}
- Age in months: ${ageInMonths}
- Premature: ${child.is_premature ? "yes" : "no"}
- Gestational age at birth: ${child.gestational_age_weeks ?? "not provided"}

Parent concern:
${symptomText}
`;

    const openAiPromise = openai.responses.create({
      model: "gpt-5-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "followup_questions",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              questions: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["questions"],
          },
          strict: true,
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenAI request timed out")),
        OPENAI_FOLLOWUP_TIMEOUT_MS
      )
    );

    const aiResponse = (await Promise.race([
      openAiPromise,
      timeoutPromise,
    ])) as OpenAiResponsesCreateResult;

    const text =
      (typeof aiResponse.output_text === "string" && aiResponse.output_text.trim()
        ? aiResponse.output_text.trim()
        : null) ?? extractOutputJsonText(aiResponse);

    if (!text) {
      obs.set({ httpStatus: 500, errorCode: "ai_no_output", path: "followup_questions_ai" });
      return NextResponse.json(
        { error: "No response from AI." },
        { status: 500, headers: correlationHeaders(requestId) }
      );
    }

    const parsed = parseQuestionsJson(text);
    if (!parsed) {
      obs.set({ httpStatus: 500, errorCode: "ai_parse_failed", path: "followup_questions_ai" });
      return NextResponse.json(
        { error: "Could not parse AI follow-up questions." },
        { status: 500, headers: correlationHeaders(requestId) }
      );
    }

    obs.set({
      httpStatus: 200,
      decisionSource: "ai",
      path: "followup_questions_ai",
      errorCode: null,
    });
    return NextResponse.json(
      {
        ...parsed,
        decision_source: "ai",
        rule_reason: null,
      },
      { headers: correlationHeaders(requestId) }
    );
  } catch (error) {
    console.error(`[symptom-followup ${requestId}]`, error);
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
      { error: "Something went wrong while generating follow-up questions." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  } finally {
    obs.end();
  }
}
