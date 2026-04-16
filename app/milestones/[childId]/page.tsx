"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatAgeMonths,
  type AgeGroup,
  type DelayStatus,
  type DomainSummary,
  type MilestoneOverview,
  type MilestoneWithStatus,
} from "@/lib/milestone-engine";

const BUCKETS = [1, 2, 4, 6, 9, 12, 15, 18, 24] as const;

function childCurrentBucket(ageMonths: number): number {
  for (const b of BUCKETS) {
    if (ageMonths <= b) return b;
  }
  return 24;
}

type ApiChild = {
  id: string;
  name: string;
  age_months: number;
  is_premature: boolean;
  gestational_age_weeks: number | null;
};

type MilestonesPayload = {
  child: ApiChild;
  overview: MilestoneOverview;
  age_groups: AgeGroup[];
  domain_summaries: DomainSummary[];
};

function delayBadgeLabel(ds: DelayStatus): string {
  if (ds === "achieved") return "Achieved ✓";
  if (ds === "watch") return "Worth watching";
  if (ds === "delayed") return "Worth discussing";
  return "Coming up";
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function needsAttentionFilter(m: MilestoneWithStatus): boolean {
  return m.delay_status === "delayed" || m.delay_status === "watch";
}

function statusCircleClass(ds: DelayStatus): string {
  if (ds === "achieved")
    return "border-violet-500 bg-violet-500 text-white";
  if (ds === "delayed") return "border-red-400 bg-white text-red-500";
  if (ds === "watch") return "border-amber-400 bg-amber-50 text-amber-700";
  return "border-slate-300 bg-slate-50 text-slate-400";
}

export default function MilestonesPage() {
  const params = useParams();
  const childId = typeof params.childId === "string" ? params.childId : "";

  const [data, setData] = useState<MilestonesPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [needsOnly, setNeedsOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/milestones/${childId}`);
      const json = (await res.json()) as MilestonesPayload & { error?: string };
      if (!res.ok) {
        setLoadError(json.error || "Could not load milestones.");
        setData(null);
        return;
      }
      setData(json);
      const bucket = childCurrentBucket(json.child.age_months);
      setExpandedGroups(new Set([bucket]));
    } catch {
      setLoadError("Something went wrong. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  const allMilestones = useMemo(() => {
    if (!data) return [];
    return data.age_groups.flatMap((g) => g.milestones);
  }, [data]);

  const watchCount = useMemo(
    () => allMilestones.filter((m) => m.delay_status === "watch").length,
    [allMilestones]
  );

  const filterMilestones = useCallback(
    (milestones: MilestoneWithStatus[]) => {
      return milestones.filter((m) => {
        if (domainFilter && m.domain !== domainFilter) return false;
        if (needsOnly && !needsAttentionFilter(m)) return false;
        return true;
      });
    },
    [domainFilter, needsOnly]
  );

  const visibleGroupCount = useMemo(() => {
    if (!data) return 0;
    return data.age_groups.filter((g) => {
      const n = filterMilestones(g.milestones).length;
      if (domainFilter !== null || needsOnly) return n > 0;
      return true;
    }).length;
  }, [data, domainFilter, needsOnly, filterMilestones]);

  const toggleGroup = (ageMonths: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(ageMonths)) next.delete(ageMonths);
      else next.add(ageMonths);
      return next;
    });
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const postStatus = async (milestoneId: string, status: "pending" | "achieved" | "skipped") => {
    setSavingId(milestoneId);
    try {
      const res = await fetch(`/api/milestones/${childId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId, status }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setLoadError(j.error || "Save failed.");
        return;
      }
      setLoadError(null);
      await load();
    } finally {
      setSavingId(null);
    }
  };

  if (!childId) {
    return (
      <main className="nurture-page mx-auto max-w-3xl">
        <p className="text-slate-600">Invalid child.</p>
      </main>
    );
  }

  if (loading && !data) {
    return (
      <main className="nurture-page mx-auto min-h-screen max-w-3xl pb-20 pt-2">
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded-lg bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (loadError && !data) {
    return (
      <main className="nurture-page mx-auto max-w-3xl">
        <p className="text-red-700">{loadError}</p>
        <Link href={`/child/${childId}`} className="mt-4 inline-block text-violet-700 underline">
          Back to child profile
        </Link>
      </main>
    );
  }

  if (!data) return null;

  const { child, overview, age_groups, domain_summaries } = data;
  const currentBucket = childCurrentBucket(child.age_months);
  const ageLabel = formatAgeMonths(Math.max(0, Math.floor(child.age_months)));

  return (
    <div className="nurture-app-bg pb-28">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f8fafc]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3">
          <Link
            href={`/child/${childId}`}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
            aria-label="Back to child profile"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-slate-900">{child.name}</h1>
              {child.is_premature ? (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900">
                  Corrected age
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-600">{ageLabel}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Progress</p>
            <p className="text-xl font-semibold tabular-nums text-violet-700">
              {overview.progress_pct}%
            </p>
          </div>
        </div>
      </header>

      <main className="nurture-page mx-auto max-w-3xl space-y-6 pt-2">
        {loadError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : null}

        {/* Overview cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/90 p-3 shadow-sm">
            <p className="text-xs font-medium text-violet-800">Achieved</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-violet-900">
              {overview.achieved}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-3 shadow-sm">
            <p className="text-xs font-medium text-slate-600">Coming up</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">
              {overview.upcoming_count}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3 shadow-sm">
            <p className="text-xs font-medium text-amber-900">Watch</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
              {watchCount}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/90 p-3 shadow-sm">
            <p className="text-xs font-medium text-red-800">Red flag</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-900">
              {overview.red_flag_delayed}
            </p>
          </div>
        </section>

        {/* Red flag banner */}
        {overview.red_flag_delayed > 0 ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm leading-relaxed text-red-950">
            <p className="font-medium text-red-900">A gentle heads-up</p>
            <p className="mt-1 text-red-900/90">
              One or more items may be worth mentioning at your next pediatrician visit—this app
              does not diagnose; your clinician can put things in context.
            </p>
          </div>
        ) : null}

        {/* Overall progress bar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex justify-between text-sm text-slate-600">
            <span>Overall</span>
            <span className="tabular-nums">
              {overview.achieved} / {overview.total} milestones
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${overview.progress_pct}%` }}
            />
          </div>
        </section>

        {/* Domain chips + filter */}
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDomainFilter(null)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                domainFilter === null
                  ? "border-violet-600 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              All domains
            </button>
            {domain_summaries.map((d) => (
              <button
                key={d.domain}
                type="button"
                onClick={() => setDomainFilter(d.domain)}
                className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  domainFilter === d.domain
                    ? "border-violet-600 bg-violet-50 text-violet-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden>{d.emoji}</span>
                {d.label}
                {d.delayed > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                ) : null}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={needsOnly}
              onChange={(e) => setNeedsOnly(e.target.checked)}
              className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            Show needs-attention only
          </label>
        </section>

        {/* Age groups */}
        <section className="space-y-3">
          {visibleGroupCount === 0 && (domainFilter !== null || needsOnly) ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
              No milestones match your filters. Try another domain or turn off “needs-attention
              only.”
            </div>
          ) : null}
          {age_groups.map((group) => {
            const filtered = filterMilestones(group.milestones);
            const isOpen = expandedGroups.has(group.age_months);
            const isCurrent = group.age_months === currentBucket;
            const achievedInGroup = group.milestones.filter(
              (m) => m.delay_status === "achieved"
            ).length;
            const totalInGroup = group.milestones.length;

            if (filtered.length === 0 && (domainFilter !== null || needsOnly)) {
              return null;
            }

            return (
              <div
                key={group.age_months}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.age_months)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
                >
                  <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{group.label}</span>
                      {isCurrent ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
                          Current age
                        </span>
                      ) : null}
                      {group.any_red_flag_delayed ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">
                          Needs attention
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {achievedInGroup}/{totalInGroup} in this group
                    </p>
                    <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${group.progress}%` }}
                      />
                    </div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="space-y-3 border-t border-slate-100 px-3 pb-4 pt-2">
                    {filtered.length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-500">
                        No milestones match your filters.
                      </p>
                    ) : (
                      filtered.map((m) => (
                        <MilestoneCard
                          key={m.id}
                          milestone={m}
                          expanded={expandedMilestones.has(m.id)}
                          onToggle={() => toggleMilestone(m.id)}
                          saving={savingId === m.id}
                          onAchieve={() => postStatus(m.id, "achieved")}
                          onUndo={() => postStatus(m.id, "pending")}
                          onSkip={() => postStatus(m.id, "skipped")}
                        />
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        {child.is_premature ? (
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-950">
            <p className="font-medium text-indigo-900">Premature birth</p>
            <p className="mt-1 leading-relaxed">
              Milestone timing can vary when a baby arrives early. Your clinician may use{" "}
              <strong>corrected age</strong>
              {child.gestational_age_weeks != null
                ? ` (based on ${child.gestational_age_weeks} weeks gestation)`
                : ""}{" "}
              alongside your child’s unique story—use this tracker as a conversation starter, not a
              scorecard.
            </p>
          </section>
        ) : null}

        <footer className="rounded-2xl border border-slate-200 bg-slate-100/50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Milestones are <strong>guides, not deadlines</strong>. They are not a medical assessment or
          developmental diagnosis. When in doubt, ask your pediatrician.
        </footer>
      </main>
    </div>
  );
}

function MilestoneCard({
  milestone: m,
  expanded,
  onToggle,
  saving,
  onAchieve,
  onUndo,
  onSkip,
}: {
  milestone: MilestoneWithStatus;
  expanded: boolean;
  onToggle: () => void;
  saving: boolean;
  onAchieve: () => void;
  onUndo: () => void;
  onSkip: () => void;
}) {
  const ds = m.delay_status;
  const achieved = ds === "achieved";

  return (
    <div
      className={`rounded-2xl border bg-white px-3 py-3 shadow-sm ${
        ds === "delayed"
          ? "border-red-200"
          : ds === "watch"
            ? "border-amber-200"
            : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-left"
      >
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${statusCircleClass(ds)}`}
        >
          {achieved ? "✓" : ds === "delayed" ? "!" : ""}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold text-slate-900 ${achieved ? "line-through decoration-slate-400" : ""}`}
          >
            {m.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {m.domain}
            </span>
            <span className="text-xs text-slate-500">
              {m.age_months_min}–{m.age_months_max} mo
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                ds === "achieved"
                  ? "bg-violet-100 text-violet-900"
                  : ds === "watch"
                    ? "bg-amber-100 text-amber-900"
                    : ds === "delayed"
                      ? m.red_flag
                        ? "bg-red-100 text-red-900"
                        : "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-700"
              }`}
            >
              {delayBadgeLabel(ds)}
            </span>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
          <p>{m.description}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why it matters
            </p>
            <p className="mt-1">{m.why_it_matters}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">
              If you are wondering what to do next
            </p>
            <p className="mt-1">{m.what_to_do_if_delayed}</p>
          </div>
          {m.premature_notes ? (
            <p className="text-xs text-indigo-900">
              <span className="font-medium">Prematurity: </span>
              {m.premature_notes}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {!achieved ? (
              <button
                type="button"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  onAchieve();
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Mark achieved"
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  onUndo();
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Undo"
                )}
              </button>
            )}
            {!achieved ? (
              <button
                type="button"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Skip"
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
