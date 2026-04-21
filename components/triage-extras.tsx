import type { SymptomTriageResult } from "@/lib/symptom-triage-result";

type Props = {
  triage: SymptomTriageResult;
  className?: string;
};

/**
 * Structured triage add-ons (score, immediate actions, watch list, factors).
 * Shown when present — after read-path hydration, lists are usually non-empty.
 */
export default function TriageExtras({ triage, className = "" }: Props) {
  const score =
    typeof triage.urgency_score === "number" && Number.isFinite(triage.urgency_score)
      ? triage.urgency_score
      : null;
  const actions = triage.immediate_actions?.filter(Boolean) ?? [];
  const watch = triage.watch_next?.filter(Boolean) ?? [];
  const factors = triage.decision_factors?.filter(Boolean) ?? [];

  if (score == null && actions.length === 0 && watch.length === 0 && factors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {score != null ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Urgency score
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{score}</p>
          <p className="mt-1 text-xs text-slate-500">
            Higher suggests faster in-person attention (aligned with the urgency band, not a
            clinical score).
          </p>
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Do next
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-800">
            {actions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {watch.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Watch next
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-800">
            {watch.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {factors.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What shaped this guidance
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
            {factors.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
