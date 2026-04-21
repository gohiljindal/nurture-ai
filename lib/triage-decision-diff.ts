/**
 * When follow-up answers change urgency vs symptom-only safety baseline (task 21).
 * Standalone types (no import from symptom-triage-result) to avoid circular deps.
 */
export type TriageDecisionDiffUrgency =
  | "emergency"
  | "urgent_doctor"
  | "monitor_home";

export type TriageDecisionDiff = {
  baseline_urgency: TriageDecisionDiffUrgency;
  final_urgency: TriageDecisionDiffUrgency;
  /** Plain-language summary for parents */
  summary: string;
};

const RANK: Record<TriageDecisionDiffUrgency, number> = {
  emergency: 3,
  urgent_doctor: 2,
  monitor_home: 1,
};

function describeUrgency(u: TriageDecisionDiffUrgency): string {
  switch (u) {
    case "emergency":
      return "emergency care";
    case "urgent_doctor":
      return "same-day medical care";
    default:
      return "home monitoring";
  }
}

/**
 * Compares symptom-only baseline (safety rules with no follow-up answers) to the final triage.
 * Returns `null` when urgency is unchanged.
 */
export function computeTriageDecisionDiff(args: {
  baselineUrgency: TriageDecisionDiffUrgency;
  finalUrgency: TriageDecisionDiffUrgency;
}): TriageDecisionDiff | null {
  const { baselineUrgency, finalUrgency } = args;
  if (baselineUrgency === finalUrgency) return null;

  const b = RANK[baselineUrgency];
  const f = RANK[finalUrgency];
  const from = describeUrgency(baselineUrgency);
  const to = describeUrgency(finalUrgency);

  const summary =
    f > b
      ? `After your follow-up answers, guidance moved from ${from} toward ${to}. Your additional details matter for safety.`
      : `After your follow-up answers, guidance moved from ${from} toward ${to}.`;

  return {
    baseline_urgency: baselineUrgency,
    final_urgency: finalUrgency,
    summary,
  };
}
