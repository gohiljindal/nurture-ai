/** Human-readable labels for internal safety rule keys (never show raw keys in UI). */

export function safetyRuleReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case "critical_emergency_keywords":
      return "Emergency-related wording detected";
    case "infant_under_3_fever":
      return "Fever in an infant under 3 months";
    case "dehydration_keywords":
      return "Possible dehydration or fluid concern";
    default:
      if (!reason?.trim()) return "Built-in safety check";
      return reason.replace(/_/g, " ");
  }
}
