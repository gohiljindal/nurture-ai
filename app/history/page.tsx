import Link from "next/link";
import StartSymptomCheckLink from "@/components/start-symptom-check-link";
import { requireServerUserId } from "@/lib/auth/server-user";
import { listSymptomChecksForHistory } from "@/lib/services/symptom-check-service";
import {
  previewInput,
  urgencyBadgeClass,
  urgencyDisplayLabel,
} from "@/lib/urgency-ui";

export default async function HistoryPage() {
  const userId = await requireServerUserId();

  const { rows, error: historyError } = await listSymptomChecksForHistory(userId, 50);

  return (
    <main className="nurture-page mx-auto max-w-4xl">
      <div className="mb-2">
        <p className="nurture-kicker">Past checks</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-900">History</h1>
          <StartSymptomCheckLink />
        </div>
      </div>

      {historyError ? (
        <p className="mt-4 text-sm text-red-600">{historyError}</p>
      ) : null}

      {rows.length > 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          Your latest {rows.length} saved check{rows.length === 1 ? "" : "es"} (up to 50).
        </p>
      ) : null}

      {!rows.length ? (
        <div className="nurture-panel-muted mt-8">
          <p className="text-base font-medium text-slate-900">
            Start your first symptom check to get guidance for your child
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Nothing saved yet—your past checks will appear here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <StartSymptomCheckLink />
            <Link href="/dashboard" className="btn-nurture-secondary">
              🏠 Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {rows.map((check) => {
              const childName = check.childName;
              return (
                <li key={check.id}>
                  <Link
                    href={`/check/${check.id}`}
                    className="block rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)] transition hover:border-violet-200/90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{childName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(check.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${urgencyBadgeClass(check.urgency)}`}
                      >
                        {urgencyDisplayLabel(check.urgency)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-700">
                      {previewInput(check.input_text)}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">View details →</p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-8">
            <StartSymptomCheckLink />
            <Link href="/dashboard" className="btn-nurture-secondary">
              🏠 Dashboard
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
