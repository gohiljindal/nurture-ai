import type { FollowupAnswer, SafetyChild } from "@/lib/safety-rules";
import { runSafetyRules } from "@/lib/safety-rules";
import type { SymptomTriageCore } from "@/lib/symptom-triage-result";

export type FinalTriageShape = SymptomTriageCore;

/**
 * Task 5: If deterministic rules match the same parent input, prefer them over the model.
 * Normally the API returns before calling OpenAI when rules match; this is a defensive second pass.
 */
export function mergeAiTriageWithSafetyFloor(
  child: SafetyChild,
  symptomText: string,
  followupAnswers: FollowupAnswer[],
  ai: SymptomTriageCore
): {
  triage: SymptomTriageCore;
  decision_source: "ai" | "safety_rule";
  rule_reason: string | null;
} {
  const rules = runSafetyRules(child, symptomText, followupAnswers);
  if (!rules.matched) {
    return {
      triage: ai,
      decision_source: "ai",
      rule_reason: null,
    };
  }

  return {
    triage: {
      urgency: rules.urgency,
      summary: rules.summary,
      recommended_action: rules.recommended_action,
      red_flags: rules.red_flags,
      disclaimer: rules.disclaimer,
      confidence: rules.confidence,
      reasoning: rules.reasoning,
    },
    decision_source: "safety_rule",
    rule_reason: rules.reason,
  };
}
