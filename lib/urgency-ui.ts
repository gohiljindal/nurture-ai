/** Shared urgency badge styling for symptom check UI. */

export function urgencyBadgeClass(urgency: string): string {
  switch (urgency) {
    case "emergency":
      return "border-red-300 bg-red-50 text-red-700";
    case "urgent_doctor":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "monitor_home":
      return "border-green-300 bg-green-50 text-green-700";
    default:
      return "border-gray-300 bg-gray-50 text-gray-700";
  }
}

export function urgencyDisplayLabel(urgency: string): string {
  switch (urgency) {
    case "urgent_doctor":
      return "Doctor soon";
    case "monitor_home":
      return "Monitor at home";
    case "emergency":
      return "Emergency";
    default:
      if (!urgency?.trim()) return "See summary";
      return urgency
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
  }
}

export function previewInput(input: string, maxChars = 160): string {
  const firstLine = input.split("\n")[0]?.trim() ?? "";
  if (firstLine.length <= maxChars) return firstLine;
  return `${firstLine.slice(0, maxChars - 1)}…`;
}
