import Link from "next/link";
import { notFound } from "next/navigation";
import CareActions from "@/components/care-actions";
import ModelAssistNote from "@/components/model-assist-note";
import ResultHelpfulFeedback from "@/components/result-helpful-feedback";
import StartSymptomCheckLink from "@/components/start-symptom-check-link";
import UrgencyResultHero from "@/components/urgency-result-hero";
import { requireServerUserId } from "@/lib/auth/server-user";
import { getSymptomCheckDetailForUser } from "@/lib/services/symptom-check-service";
import { safetyRuleReasonLabel } from "@/lib/safety-labels";
import { urgencyBadgeClass, urgencyDisplayLabel } from "@/lib/urgency-ui";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CheckDetailPage({ params }: PageProps) {
  const { id } = await params;
  const userId = await requireServerUserId();

  const { row: detailRow, error: detailError } = await getSymptomCheckDetailForUser(
    userId,
    id
  );

  if (detailError) {
    return (
      <main className="nurture-page mx-auto max-w-3xl">
        <p className="text-sm text-red-600">{detailError}</p>
        <Link href="/history" className="nurture-text-link mt-4 inline-block text-sm">
          Back to history
        </Link>
      </main>
    );
  }

  if (!detailRow) notFound();

  const row = detailRow;
  const triage = row.triage;

  const decisionSource = triage.decision_source;
  const ruleReason = triage.rule_reason;

  const confidence = triage.confidence;
  const reasoning = triage.reasoning.trim();

  const redFlags = triage.red_flags;

  return (
    <main className="nurture-page mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="nurture-kicker">Saved check</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Check details</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StartSymptomCheckLink />
          <Link href="/history" className="btn-nurture-secondary">
            📈 History
          </Link>
          <Link href="/dashboard" className="btn-nurture-secondary">
            🏠 Dashboard
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        {new Date(row.created_at).toLocaleString()}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${urgencyBadgeClass(row.urgency)}`}
        >
          {urgencyDisplayLabel(row.urgency)}
        </span>
      </div>

      {(row.urgency === "emergency" || row.urgency === "urgent_doctor") && (
        <div className="mt-6">
          <UrgencyResultHero urgency={row.urgency} />
        </div>
      )}

      {(row.urgency === "emergency" ||
        row.urgency === "urgent_doctor" ||
        row.urgency === "monitor_home") && (
        <div className="mt-6">
          <CareActions
            urgency={
              row.urgency as "emergency" | "urgent_doctor" | "monitor_home"
            }
          />
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Decision source</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {decisionSource === "safety_rule" ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900">
              Built-in safety rule
            </span>
          ) : decisionSource === "ai" ? (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900">
              AI-assisted
            </span>
          ) : (
            <span className="text-sm text-slate-600">—</span>
          )}
        </div>
        {decisionSource === "safety_rule" && ruleReason ? (
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-medium">Safety check:</span>{" "}
            {safetyRuleReasonLabel(ruleReason)}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <p className="font-semibold">Your input</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
          {row.input_text}
        </p>
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-slate-200 p-4">
        <p className="font-semibold">Guidance</p>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Recommended action
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {triage.recommended_action || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Summary
          </p>
          <p className="mt-1 text-sm text-slate-800">{triage.summary || "—"}</p>
        </div>

        <ModelAssistNote confidence={confidence} reasoning={reasoning} />

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Red flags to watch for
          </p>
          {redFlags.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
              {redFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gray-500">—</p>
          )}
        </div>

        {triage.disclaimer ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Disclaimer</p>
            <p className="mt-1">{triage.disclaimer}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Disclaimer</p>
            <p className="mt-1">
              This tool gives general guidance only. It does not replace a clinician. Call emergency
              services if you believe your child is in danger.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ResultHelpfulFeedback
          checkId={row.id}
          initialHelpful={row.feedback?.helpful ?? null}
        />
      </div>

      <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:flex-wrap sm:justify-center">
        <StartSymptomCheckLink />
        <Link href="/history" className="btn-nurture-secondary">
          📈 History
        </Link>
        <Link href="/dashboard" className="btn-nurture-secondary">
          🏠 Dashboard
        </Link>
      </div>
    </main>
  );
}
