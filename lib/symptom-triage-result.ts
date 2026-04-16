import { z } from "zod";

import { normalizeReasoning, normalizeTriageConfidence } from "@/lib/safety-rules";

/** Stored in `symptom_checks.urgency` and inside `ai_response`. */
export const symptomUrgencySchema = z.enum(["emergency", "urgent_doctor", "monitor_home"]);
export type SymptomTriageUrgency = z.infer<typeof symptomUrgencySchema>;

export const symptomConfidenceSchema = z.enum(["low", "medium", "high"]);
export type SymptomTriageConfidence = z.infer<typeof symptomConfidenceSchema>;

export const symptomDecisionSourceSchema = z.enum(["ai", "safety_rule"]);
export type SymptomDecisionSource = z.infer<typeof symptomDecisionSourceSchema>;

/** Core triage fields produced by AI or safety rules (no provenance). */
export type SymptomTriageCore = {
  urgency: SymptomTriageUrgency;
  summary: string;
  recommended_action: string;
  red_flags: string[];
  disclaimer: string;
  confidence: SymptomTriageConfidence;
  reasoning: string;
};

/**
 * Full persisted + API triage payload: core fields plus how the outcome was chosen.
 * Matches JSON in `symptom_checks.ai_response` and successful `symptom-followup` / `symptom-final` bodies (plus optional `checkId`).
 */
export type SymptomTriageResult = SymptomTriageCore & {
  decision_source: SymptomDecisionSource;
  rule_reason: string | null;
};

/** Successful symptom API responses include the full triage plus an optional saved check id. */
export type SymptomTriageApiPayload = SymptomTriageResult & { checkId?: string };

export const symptomTriageResultSchema: z.ZodType<SymptomTriageResult> = z.object({
  urgency: symptomUrgencySchema,
  summary: z.string(),
  recommended_action: z.string(),
  red_flags: z.array(z.string()),
  disclaimer: z.string(),
  confidence: symptomConfidenceSchema,
  reasoning: z.string(),
  decision_source: symptomDecisionSourceSchema,
  rule_reason: z.string().nullable(),
});

const URGENCY_VALUES: readonly SymptomTriageUrgency[] = [
  "emergency",
  "urgent_doctor",
  "monitor_home",
];

function normalizeUrgency(value: unknown, columnFallback: string): SymptomTriageUrgency {
  if (typeof value === "string" && URGENCY_VALUES.includes(value as SymptomTriageUrgency)) {
    return value as SymptomTriageUrgency;
  }
  if (URGENCY_VALUES.includes(columnFallback as SymptomTriageUrgency)) {
    return columnFallback as SymptomTriageUrgency;
  }
  return "monitor_home";
}

function normalizeDecisionSource(value: unknown): SymptomDecisionSource {
  if (value === "safety_rule") return "safety_rule";
  return "ai";
}

function normalizeRedFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Builds a canonical triage object from `ai_response` JSON and denormalized columns.
 * Columns win for `urgency` / `decision_source` / `rule_reason` when JSON is missing or partial (older rows).
 */
export function parseSymptomTriageResult(
  aiResponse: unknown,
  columns: {
    urgency: string;
    decisionSource: string | null;
    ruleReason: string | null;
  }
): SymptomTriageResult {
  const obj =
    aiResponse && typeof aiResponse === "object" && !Array.isArray(aiResponse)
      ? (aiResponse as Record<string, unknown>)
      : {};

  const urgency = normalizeUrgency(obj.urgency, columns.urgency);

  const decision_source = normalizeDecisionSource(
    obj.decision_source !== undefined ? obj.decision_source : columns.decisionSource
  );

  let rule_reason: string | null = null;
  if (typeof obj.rule_reason === "string") {
    rule_reason = obj.rule_reason;
  } else if (obj.rule_reason === null) {
    rule_reason = null;
  } else if (columns.ruleReason != null) {
    rule_reason = columns.ruleReason;
  }

  const candidate: SymptomTriageResult = {
    urgency,
    summary: typeof obj.summary === "string" ? obj.summary : "",
    recommended_action: typeof obj.recommended_action === "string" ? obj.recommended_action : "",
    red_flags: normalizeRedFlags(obj.red_flags),
    disclaimer: typeof obj.disclaimer === "string" ? obj.disclaimer : "",
    confidence: normalizeTriageConfidence(obj.confidence),
    reasoning: normalizeReasoning(obj.reasoning),
    decision_source,
    rule_reason,
  };

  const parsed = symptomTriageResultSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    urgency: "monitor_home",
    summary: candidate.summary,
    recommended_action: candidate.recommended_action,
    red_flags: candidate.red_flags,
    disclaimer: candidate.disclaimer || "This tool gives general guidance only.",
    confidence: "medium",
    reasoning: candidate.reasoning,
    decision_source: "ai",
    rule_reason: null,
  };
}
