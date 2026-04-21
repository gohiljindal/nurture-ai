import type { TriageConfidence, TriageUrgency } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

type UrgencyConfig = {
  icon: string;
  /** Short chip label e.g. "Emergency" */
  label: string;
  /** Full hero label e.g. "Go to Emergency Now" */
  actionLabel: string;
  sub: string;
  heroBg: string;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
  subColor: string;
  badgeBg: string;
  sectionText: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
};

// ── Urgency config ────────────────────────────────────────────────────────────

export const URGENCY_CONFIG: Record<TriageUrgency, UrgencyConfig> = {
  emergency: {
    icon: "🚨",
    label: "Emergency",
    actionLabel: "Go to Emergency Now",
    sub: "This needs immediate medical attention. Do not wait.",
    heroBg: "bg-red-600",
    cardBg: "bg-red-50",
    cardBorder: "border-red-200",
    labelColor: "text-white",
    subColor: "text-red-100",
    badgeBg: "bg-red-600",
    sectionText: "text-red-700",
    chipBg: "bg-red-100",
    chipText: "text-red-700",
    chipBorder: "border-red-200",
  },
  urgent_doctor: {
    icon: "📞",
    label: "Urgent",
    actionLabel: "See a Doctor Today",
    sub: "Contact your doctor or a walk-in clinic today.",
    heroBg: "bg-amber-500",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-200",
    labelColor: "text-white",
    subColor: "text-amber-100",
    badgeBg: "bg-amber-500",
    sectionText: "text-amber-700",
    chipBg: "bg-amber-100",
    chipText: "text-amber-700",
    chipBorder: "border-amber-200",
  },
  monitor_home: {
    icon: "🏠",
    label: "Monitor",
    actionLabel: "Monitor at Home",
    sub: "Comfort care at home — keep watching for changes.",
    heroBg: "bg-green-600",
    cardBg: "bg-green-50",
    cardBorder: "border-green-200",
    labelColor: "text-white",
    subColor: "text-green-100",
    badgeBg: "bg-green-600",
    sectionText: "text-green-700",
    chipBg: "bg-green-100",
    chipText: "text-green-700",
    chipBorder: "border-green-200",
  },
};

// ── Confidence config ─────────────────────────────────────────────────────────

export const CONFIDENCE_LABEL: Record<TriageConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — consider calling your doctor",
};

export const CONFIDENCE_STYLE: Record<TriageConfidence, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
};

// ── Date helper ───────────────────────────────────────────────────────────────

export function formatCheckDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}
