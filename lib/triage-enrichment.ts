import type {
  SymptomTriageOptionalFields,
  SymptomTriageResult,
  SymptomTriageUrgency,
} from "@/lib/symptom-triage-result";

export type EnrichContext = {
  ageMonths: number;
  /** First ~120 chars of parent concern for audit-style factors */
  concernSnippet: string;
};

function scoreFromUrgency(u: SymptomTriageUrgency): number {
  switch (u) {
    case "emergency":
      return 94;
    case "urgent_doctor":
      return 72;
    case "monitor_home":
      return 38;
    default:
      return 40;
  }
}

function defaultImmediate(u: SymptomTriageUrgency): string[] {
  switch (u) {
    case "emergency":
      return [
        "If you believe this is life-threatening, call emergency services (911) now.",
        "If you are going to hospital, bring this summary and a list of medications.",
      ];
    case "urgent_doctor":
      return [
        "Arrange in-person assessment today (doctor, walk-in, or urgent care).",
        "If symptoms worsen before you are seen, use emergency care.",
      ];
    default:
      return [
        "Continue comfort care at home unless red-flag symptoms appear.",
        "Contact your clinician if you are unsure or things change.",
      ];
  }
}

function defaultWatchNext(u: SymptomTriageUrgency): string[] {
  switch (u) {
    case "emergency":
      return [
        "Breathing, colour, responsiveness, and level of alertness.",
        "Any new vomiting, seizure, or loss of consciousness.",
      ];
    case "urgent_doctor":
      return [
        "Fever trend, fluid intake, urine output, and behaviour.",
        "Whether symptoms are stable, improving, or worsening over the next few hours.",
      ];
    default:
      return [
        "Appetite, energy, and hydration over the next 24–48 hours.",
        "Any new symptoms from the red-flag list above.",
      ];
  }
}

const MAX_LIST_ITEMS = 10;
const MAX_STRING_LEN = 400;

function trimStr(s: string): string {
  const t = s.trim();
  return t.length > MAX_STRING_LEN ? `${t.slice(0, MAX_STRING_LEN)}…` : t;
}

/**
 * Pulls optional structured fields from the raw model JSON (when present).
 * Ignores invalid shapes. Used only when the safety floor did not override the model.
 */
export function extractOptionalAiFields(raw: unknown): Partial<SymptomTriageOptionalFields> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<SymptomTriageOptionalFields> = {};

  if (typeof o.urgency_score === "number" && Number.isFinite(o.urgency_score)) {
    const n = Math.round(o.urgency_score);
    if (n >= 0 && n <= 100) out.urgency_score = n;
  }

  for (const key of ["immediate_actions", "watch_next", "decision_factors"] as const) {
    const arr = o[key];
    if (!Array.isArray(arr)) continue;
    const strings = arr
      .filter((item): item is string => typeof item === "string")
      .map(trimStr)
      .filter((s) => s.length > 0)
      .slice(0, MAX_LIST_ITEMS);
    if (strings.length) out[key] = strings;
  }

  return out;
}

/**
 * Fills standard optional triage fields for API + mobile when the model
 * did not emit them. Existing values are preserved.
 *
 * Used on live `symptom-final` / safety responses and on **read** paths via
 * `triageFromStoredRow` so clients always receive `urgency_score`, `immediate_actions`,
 * `watch_next`, and `decision_factors` with non-empty defaults when missing in DB.
 */
export function enrichSymptomTriageResult(
  triage: SymptomTriageResult,
  ctx: EnrichContext
): SymptomTriageResult {
  const snippet = ctx.concernSnippet.trim();
  const factors: string[] = triage.decision_factors ?? [
    `Child age: ${ctx.ageMonths} month(s)`,
    `Guidance band: ${triage.urgency.replace(/_/g, " ")}`,
    ...(snippet
      ? [
          `Concern excerpt: ${snippet.slice(0, 120)}${snippet.length > 120 ? "…" : ""}`,
        ]
      : []),
  ];

  return {
    ...triage,
    urgency_score: triage.urgency_score ?? scoreFromUrgency(triage.urgency),
    immediate_actions: triage.immediate_actions ?? defaultImmediate(triage.urgency),
    watch_next: triage.watch_next ?? defaultWatchNext(triage.urgency),
    decision_factors: triage.decision_factors ?? factors,
  };
}
