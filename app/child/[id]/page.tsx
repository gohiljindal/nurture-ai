import Link from "next/link";
import { notFound } from "next/navigation";
import ChildProvinceField from "@/components/child-province-field";
import RemoveChildButton from "@/components/remove-child-button";
import StartSymptomCheckLink from "@/components/start-symptom-check-link";
import { requireServerUserId } from "@/lib/auth/server-user";
import { getChildTimelineSummaryForUser } from "@/lib/services/child-summary-service";
import { safetyRuleReasonLabel } from "@/lib/safety-labels";
import { urgencyBadgeClass, urgencyDisplayLabel } from "@/lib/urgency-ui";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChildDetailPage({ params }: PageProps) {
  const { id } = await params;
  const userId = await requireServerUserId();

  const { summary, error: summaryError } = await getChildTimelineSummaryForUser(userId, id);

  if (summaryError) {
    return (
      <main className="nurture-page mx-auto max-w-4xl">
        <p className="text-sm text-red-600">{summaryError}</p>
        <Link href="/dashboard" className="nurture-text-link mt-4 inline-block text-sm">
          ⬅️ Back to dashboard
        </Link>
      </main>
    );
  }

  if (!summary) {
    notFound();
  }

  const child = summary.profile;
  const ageInMonths = summary.age_months;
  const nextVaccine = summary.next_vaccine_milestone;
  const expectation = summary.expectation;
  const symptomChecks = summary.recent_checks;
  const vaccine_records_count = summary.vaccine_records_count;
  const rawProvince = child.province;
  const province =
    typeof rawProvince === "string" && rawProvince.trim() !== ""
      ? rawProvince.trim()
      : null;

  return (
    <main className="nurture-page mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ⬅️ Back to dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{child.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Child profile, what to expect at this age, vaccine preview, and recent checks
          </p>
          <p className="mt-2 text-sm">
            <Link href="/history" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
              📈 View all symptom checks
            </Link>
          </p>
        </div>

        <StartSymptomCheckLink />
      </div>

      <section className="mb-8 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Profile</h2>

        {!province && (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            Add your province to unlock the personalised vaccine schedule.{" "}
            <Link
              href="#child-province"
              className="font-medium text-emerald-800 underline-offset-2 hover:underline"
            >
              Set province →
            </Link>
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Date of birth</p>
            <p className="font-medium">{child.date_of_birth}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Age</p>
            <p className="font-medium">
              {ageInMonths} month{ageInMonths === 1 ? "" : "s"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Sex</p>
            <p className="font-medium">{child.sex_at_birth || "Prefer not to say"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Premature</p>
            <p className="font-medium">{child.is_premature ? "Yes" : "No"}</p>
          </div>

          {child.is_premature && (
            <div>
              <p className="text-sm text-gray-500">Gestational age at birth</p>
              <p className="font-medium">
                {child.gestational_age_weeks
                  ? `${child.gestational_age_weeks} weeks`
                  : "Not provided"}
              </p>
            </div>
          )}

          <ChildProvinceField childId={id} initialProvince={province} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/milestones/${id}`}
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-emerald-950 transition hover:bg-emerald-50"
          >
            <span>
              <span className="font-semibold">Development milestones</span>
              <span className="mt-0.5 block text-sm text-emerald-900/80">
                Track skills by age and note what you observe at home
              </span>
            </span>
            <span className="text-emerald-700" aria-hidden>
              🧠
            </span>
          </Link>
          <Link
            href={`/growth/${id}`}
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-emerald-950 transition hover:bg-emerald-50"
          >
            <span>
              <span className="font-semibold">Growth</span>
              <span className="mt-0.5 block text-sm text-emerald-900/80">
                Measurements, percentiles, and trends
              </span>
            </span>
            <span className="text-emerald-700" aria-hidden>
              📏
            </span>
          </Link>
          <Link
            href={`/vaccines/${id}`}
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-emerald-950 transition hover:bg-emerald-50"
          >
            <span>
              <span className="font-semibold">Vaccines</span>
              <span className="mt-0.5 block text-sm text-emerald-900/80">
                Schedule and province-based reminders
              </span>
            </span>
            <span className="text-emerald-700" aria-hidden>
              💉
            </span>
          </Link>
          <Link
            href={`/feeding/${id}`}
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-emerald-950 transition hover:bg-emerald-50"
          >
            <span>
              <span className="font-semibold">Feeding</span>
              <span className="mt-0.5 block text-sm text-emerald-900/80">
                Guidance, solids, allergens, and optional food log
              </span>
            </span>
            <span className="text-emerald-700" aria-hidden>
              🥣
            </span>
          </Link>
          <Link
            href={`/sleep/${id}`}
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-emerald-950 transition hover:bg-emerald-50"
          >
            <span>
              <span className="font-semibold">Sleep Guide</span>
              <span className="mt-0.5 block text-sm text-emerald-900/80">
                Age-based guidance, safe sleep checklist, optional log
              </span>
            </span>
            <span className="text-emerald-700" aria-hidden>
              😴
            </span>
          </Link>
        </div>

        <div className="mt-6">
          <RemoveChildButton childId={id} />
        </div>
      </section>

      <section className="mb-8 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">What to Expect Now</h2>

        {!expectation ? (
          <p className="mt-4 text-sm text-gray-600">
            No guidance available for this age yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">

            <div>
              <p className="font-semibold">Highlights</p>
              <ul className="list-disc pl-5 text-sm">
                {expectation.highlights.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-semibold">Feeding</p>
              <ul className="list-disc pl-5 text-sm">
                {expectation.feeding.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-semibold">Sleep</p>
              <ul className="list-disc pl-5 text-sm">
                {expectation.sleep.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-semibold">Development</p>
              <ul className="list-disc pl-5 text-sm">
                {expectation.development.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="font-semibold">Watch for</p>
              <ul className="list-disc pl-5 text-sm">
                {expectation.watchFor.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </section>

      <section className="mb-8 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Next Vaccine Milestone</h2>

        {vaccine_records_count > 0 ? (
          <p className="mt-3 text-sm text-gray-600">
            {vaccine_records_count} dose{vaccine_records_count === 1 ? "" : "s"} recorded in your
            tracker. Open the vaccine planner for the full province schedule.
          </p>
        ) : null}

        {nextVaccine ? (
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="font-medium">{nextVaccine.label}</p>
            <p className="mt-2 text-sm text-gray-600">
              {nextVaccine.description}
            </p>
            <p className="mt-3 text-sm">
              <Link
                href={`/vaccines/${id}`}
                className="font-medium text-emerald-800 underline-offset-2 hover:underline"
              >
                💉 Open vaccine schedule preview
              </Link>
              {province ? null : (
                <span className="text-gray-600">
                  {" "}
                  — set province on this profile for province-specific timing.
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            No upcoming vaccine milestone found in the current MVP schedule.
          </p>
        )}
      </section>

      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Recent Symptom Checks</h2>

        {!symptomChecks || symptomChecks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-900">
              Start your first symptom check to get guidance for your child
            </p>
            <div className="mt-4 flex justify-center">
              <StartSymptomCheckLink />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {symptomChecks.map((check) => (
              <Link
                key={check.id}
                href={`/check/${check.id}`}
                className="block rounded-xl border p-4 transition hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${urgencyBadgeClass(check.urgency)}`}
                  >
                    {urgencyDisplayLabel(check.urgency)}
                  </span>

                  <p className="text-xs text-gray-500">
                    {new Date(check.created_at).toLocaleString()}
                  </p>
                </div>

                <p className="mt-3 text-sm text-gray-700">{check.input_text}</p>

                {check.triage.decision_source === "safety_rule" && (
                  <p className="mt-2 text-xs text-blue-700">
                    Escalated by safety check: {safetyRuleReasonLabel(check.triage.rule_reason)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
