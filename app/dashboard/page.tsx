import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import StartSymptomCheckLink from "@/components/start-symptom-check-link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardHomeSummaryForUser } from "@/lib/services/child-summary-service";
import type { ChildProfileRow } from "@/lib/services/child-service";
import { calculateAgeInMonths } from "@/lib/child-age";
import { safetyRuleReasonLabel } from "@/lib/safety-labels";
import { urgencyBadgeClass, urgencyDisplayLabel } from "@/lib/urgency-ui";
import { FeedingSummaryWidget } from "@/components/feeding-summary-widget";
import { GrowthSummaryWidget } from "@/components/growth-summary-widget";
import { MilestoneSummaryWidget } from "@/components/milestone-summary-widget";
import { SleepSummaryWidget } from "@/components/sleep-summary-widget";
import { VaccineSummaryWidget } from "@/components/vaccine-summary-widget";
import { getCorrectedAgeMonths } from "@/lib/milestone-engine";
import { isRegressionAge } from "@/lib/sleep-engine";

function embeddedChildName(
  embed: { name: string } | { name: string }[] | null | undefined
) {
  if (embed == null) return "Child";
  if (Array.isArray(embed)) return embed[0]?.name ?? "Child";
  return embed.name ?? "Child";
}

function pickYoungestChild(children: ChildProfileRow[]): ChildProfileRow | null {
  if (children.length === 0) return null;
  return children.reduce((youngest, c) =>
    calculateAgeInMonths(c.date_of_birth) < calculateAgeInMonths(youngest.date_of_birth)
      ? c
      : youngest
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    children: childSummaries,
    recent_symptom_checks_global: symptomChecks,
    error: homeError,
  } = await getDashboardHomeSummaryForUser(user.id);

  const childProfiles = childSummaries.map((s) => s.profile);
  const youngest = pickYoungestChild(childProfiles);
  const youngestSummary = youngest
    ? childSummaries.find((s) => s.profile.id === youngest.id) ?? null
    : null;

  const someChildMissingProvince = childProfiles.some(
    (c) => c.province == null || String(c.province).trim() === ""
  );
  const expectation = youngestSummary?.expectation ?? null;
  const highlights = expectation?.highlights.slice(0, 2) ?? [];
  const watchOne = expectation?.watchFor[0] ?? null;
  const youngestAgeMonthsForSleep = youngest
    ? getCorrectedAgeMonths(
        youngest.date_of_birth,
        youngest.gestational_age_weeks ?? null,
        Boolean(youngest.is_premature)
      )
    : 0;
  const inSleepRegressionWindow = youngest
    ? isRegressionAge(youngestAgeMonthsForSleep)
    : false;

  return (
    <main className="nurture-page mx-auto max-w-5xl">
      <div className="nurture-hero-solid mb-8 sm:mb-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="nurture-kicker">Today</p>
            <h1 className="mt-2 text-2xl leading-tight text-slate-900 sm:text-4xl">
              🏠 Your parenting hub
            </h1>
            <p className="mt-2 break-all text-sm text-slate-600">Signed in as {user.email}</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <StartSymptomCheckLink className="w-full min-h-12 justify-center text-base sm:w-auto sm:min-h-11 sm:text-sm" />
            <Link
              href="/add-child"
              className="btn-nurture-secondary w-full justify-center sm:w-auto"
            >
              👶 Add child
            </Link>
            <Link href="/history" className="btn-nurture-secondary w-full justify-center sm:w-auto">
              📈 History
            </Link>
            <LogoutButton className="w-full min-h-12 sm:w-auto sm:min-h-11" />
          </div>
        </div>
      </div>

      {someChildMissingProvince && childSummaries.length > 0 && (
        <div className="mb-6 rounded-2xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-sm leading-relaxed text-violet-950 shadow-[0_10px_25px_rgba(15,23,42,0.05)] sm:mb-8">
          <span className="font-medium">Vaccine preview:</span> set each child&apos;s{" "}
          <span className="font-medium">province</span> on their profile so the schedule matches
          your area.{" "}
          <Link href={`/child/${youngest?.id ?? childProfiles[0]?.id}`} className="font-medium underline">
            👶 Open a child profile
          </Link>
        </div>
      )}

      {childSummaries.length > 0 && expectation && highlights.length > 0 && (
        <section className="mb-8 rounded-[1.75rem] border border-violet-200/50 bg-gradient-to-br from-violet-50/80 via-white to-sky-50/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-violet-100/70 sm:mb-10 sm:p-6">
          <h2 className="text-base font-semibold text-violet-950 sm:text-lg">What to expect now</h2>
          <p className="mt-1 text-sm text-slate-700">
            For {youngest?.name} · {expectation.ageRangeLabel}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-800">
            {highlights.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-medium text-violet-600">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {inSleepRegressionWindow ? (
            <p className="mt-3 text-sm text-amber-900/95">
              Sleep regression window — this is normal
            </p>
          ) : null}
          {watchOne ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Watch for
              </p>
              <p className="mt-1 text-sm text-amber-950">{watchOne}</p>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            General patterns for this age—not medical advice. Call your clinician or emergency
            services if you are worried.
          </p>
        </section>
      )}

      <section className="mb-8 space-y-4 sm:mb-10">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Your children</h2>

        {homeError && (
          <p className="text-sm text-red-600">{homeError}</p>
        )}

        {childSummaries.length === 0 ? (
          <div className="nurture-empty-dashed">
            <h3 className="text-lg font-semibold text-slate-900">
              Add your child to get started
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Add a name and date of birth so symptom checks and age-based tips apply to your
              family.
            </p>
            <Link
              href="/add-child"
              className="btn-nurture-primary mt-5 inline-flex w-full min-h-12 justify-center px-6 py-3 sm:w-auto sm:min-h-11 sm:py-2.5"
            >
              👶 Add child
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {childSummaries.map((s) => {
              const child = s.profile;
              const ageInMonths = s.age_months;
              const nextVaccine = s.next_vaccine_milestone;

              return (
                <div
                  key={child.id}
                  className="flex flex-col gap-4 lg:flex-row lg:items-stretch"
                >
                  <div className="min-w-0 lg:flex-1">
                    <div className="rounded-[1.75rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)] transition hover:border-violet-200/90 hover:shadow-md sm:p-5">
                      <Link href={`/child/${child.id}`} className="block rounded-xl outline-offset-2">
                        <h3 className="text-lg font-semibold">{child.name}</h3>

                        <p className="mt-2 text-sm text-gray-600">
                          Date of birth: {child.date_of_birth}
                        </p>

                        <p className="text-sm text-gray-600">
                          Age: {ageInMonths} month{ageInMonths === 1 ? "" : "s"}
                        </p>

                        <p className="text-sm text-gray-600">
                          Premature: {child.is_premature ? "Yes" : "No"}
                        </p>

                        {child.gestational_age_weeks != null && (
                          <p className="text-sm text-gray-600">
                            Gestational age: {child.gestational_age_weeks} weeks
                          </p>
                        )}
                      </Link>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold">Vaccine preview</p>

                        {s.vaccine_records_count > 0 ? (
                          <p className="mt-1 text-xs text-gray-600">
                            {s.vaccine_records_count} dose
                            {s.vaccine_records_count === 1 ? "" : "s"} recorded in your tracker (see
                            full schedule for details).
                          </p>
                        ) : null}

                        {nextVaccine ? (
                          <>
                            <p className="mt-1 text-sm text-slate-800">{nextVaccine.label}</p>
                            <p className="mt-1 text-sm text-gray-600">{nextVaccine.description}</p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-gray-600">
                            No upcoming vaccine milestone found in the current MVP schedule.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3 lg:flex-1 lg:gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <GrowthSummaryWidget childId={child.id} childName={child.name} />
                      <MilestoneSummaryWidget childId={child.id} childName={child.name} />
                      <FeedingSummaryWidget childId={child.id} childName={child.name} />
                      <VaccineSummaryWidget childId={child.id} childName={child.name} />
                      <SleepSummaryWidget childId={child.id} childName={child.name} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Recent symptom checks</h2>
          <Link
            href="/history"
            className="text-sm font-medium text-violet-700 hover:underline sm:shrink-0"
          >
            📈 View full history
          </Link>
        </div>

        {!symptomChecks || symptomChecks.length === 0 ? (
          <div className="nurture-panel-muted">
            {childSummaries.length === 0 ? (
              <>
                <p className="text-base font-medium text-slate-900">
                  Add a child profile to run symptom checks
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Your recent checks will show up here.
                </p>
                <Link
                  href="/add-child"
                  className="btn-nurture-primary mt-6 inline-flex w-full min-h-12 justify-center px-6 py-3 sm:w-auto sm:min-h-11 sm:py-2.5"
                >
                  👶 Add child
                </Link>
              </>
            ) : (
              <>
                <p className="text-base font-medium text-slate-900">
                  Start your first symptom check to get guidance for your child
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Describe what you are seeing. We will ask a few follow-up questions when needed.
                </p>
                <div className="mt-6 flex justify-center">
                  <StartSymptomCheckLink className="w-full min-h-12 justify-center text-base sm:w-auto sm:min-h-11 sm:text-sm" />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {symptomChecks.map((check) => (
              <Link
                key={check.id}
                href={`/check/${check.id}`}
                className="block rounded-[1.75rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)] transition active:bg-slate-50/80 hover:border-violet-200/90 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <h3 className="min-w-0 font-semibold text-slate-900">
                    {embeddedChildName(check.children)}
                  </h3>
                  <span
                    className={`shrink-0 self-start rounded-full border px-3 py-1 text-xs font-medium sm:self-center ${urgencyBadgeClass(check.urgency)}`}
                  >
                    {urgencyDisplayLabel(check.urgency)}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-700">{check.input_text}</p>

                {check.triage.decision_source === "safety_rule" && (
                  <p className="mt-2 text-xs text-violet-700">
                    Escalated by safety check: {safetyRuleReasonLabel(check.triage.rule_reason)}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500">
                  {new Date(check.created_at).toLocaleString()}
                </p>
              </Link>
            ))}
            <div className="flex justify-center pt-2">
              <StartSymptomCheckLink
                variant="outline"
                className="w-full min-h-12 justify-center sm:w-auto sm:min-h-11"
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
