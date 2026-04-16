"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatAgeMonths } from "@/lib/milestone-engine";
import {
  getNapSchedule,
  getSleepExpectations,
  type NapSchedule,
  type SafeSleepItem,
  type SleepExpectations,
  type SleepRegression,
  type SleepSummary,
} from "@/lib/sleep-engine";

const EMPTY_SLEEP_SUMMARY: SleepSummary = {
  total_sleep_minutes: 0,
  night_sleep_minutes: 0,
  nap_minutes: 0,
  nap_count: 0,
  longest_stretch_minutes: 0,
  last_wake_time: null,
  currently_sleeping: false,
};

export type SleepSummaryWidgetProps = {
  childId: string;
  childName: string;
};

type GuidancePayload = {
  child: { id: string; name: string; age_months: number };
  expectations: SleepExpectations;
  nap_schedule: NapSchedule;
  is_regression_age: boolean;
  current_regression: SleepRegression | null;
  safe_sleep_checklist: {
    items: SafeSleepItem[];
    completed_codes: string[];
  };
  recent_summary: SleepSummary;
};

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WidgetSkeleton() {
  return (
    <div
      className="block h-full rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"
      aria-hidden
    >
      <div className="flex gap-3">
        <div className="size-12 shrink-0 rounded-2xl bg-indigo-100/80" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-indigo-100" />
          <div className="h-4 w-36 rounded bg-indigo-100" />
          <div className="h-3 w-full max-w-[200px] rounded bg-indigo-100" />
        </div>
      </div>
      <div className="mt-4 h-10 rounded-xl bg-slate-100" />
      <div className="mt-3 h-3 w-44 rounded bg-indigo-100" />
    </div>
  );
}

function shortAgeLabel(ageMonths: number): string {
  const a = Math.max(0, ageMonths);
  if (a < 1) return a <= 0 ? "Newborn" : "Under 1 month";
  if (a < 12) {
    const m = Math.floor(a);
    return m === 1 ? "1 month" : `${m} months`;
  }
  return formatAgeMonths(Math.floor(a));
}

function formatWakeWindowRange(exp: SleepExpectations): string {
  const lo = exp.wake_window_minutes_min;
  const hi = exp.wake_window_minutes_max;
  const fmt = (m: number) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  };
  return `${fmt(lo)}–${fmt(hi)}`;
}

function criticalChecklistProgress(items: SafeSleepItem[], completed: Set<string>) {
  const critical = items.filter((i) => i.is_critical);
  const total = critical.length;
  const done = critical.filter((i) => completed.has(i.code)).length;
  return { done, total, showNudge: total > 0 && done < total };
}

export function SleepSummaryWidget({ childId, childName }: SleepSummaryWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<GuidancePayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sleep/guidance/${childId}`);
        if (!res.ok) {
          if (!cancelled) {
            setPayload(null);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as GuidancePayload & { error?: string };
        if (!cancelled) {
          const rawAge =
            typeof json.child?.age_months === "number" &&
            Number.isFinite(json.child.age_months)
              ? Math.max(0, json.child.age_months)
              : 0;
          const expectations: SleepExpectations =
            json.expectations != null && typeof json.expectations === "object"
              ? json.expectations
              : getSleepExpectations(rawAge);

          setPayload({
            child: {
              id: json.child?.id ?? childId,
              name: json.child?.name ?? childName,
              age_months: rawAge,
            },
            expectations,
            nap_schedule: json.nap_schedule ?? getNapSchedule(rawAge),
            is_regression_age: Boolean(json.is_regression_age),
            current_regression: json.current_regression ?? null,
            safe_sleep_checklist: {
              items: json.safe_sleep_checklist?.items ?? [],
              completed_codes: json.safe_sleep_checklist?.completed_codes ?? [],
            },
            recent_summary: json.recent_summary ?? EMPTY_SLEEP_SUMMARY,
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  const completedSet = useMemo(() => {
    if (!payload) return new Set<string>();
    return new Set(payload.safe_sleep_checklist.completed_codes);
  }, [payload]);

  const checklistProgress = useMemo(() => {
    if (!payload) return { done: 0, total: 0, showNudge: false };
    return criticalChecklistProgress(
      payload.safe_sleep_checklist.items,
      completedSet
    );
  }, [payload, completedSet]);

  if (loading) {
    return <WidgetSkeleton />;
  }

  if (!payload) {
    return null;
  }

  const exp = payload.expectations;
  const ageMonths = payload.child.age_months;
  const ageStr = shortAgeLabel(ageMonths);
  const regressionDetail =
    payload.is_regression_age && payload.current_regression != null
      ? payload.current_regression
      : null;

  const borderClass = regressionDetail
    ? "border-amber-300 hover:border-amber-400"
    : "border-stone-200 hover:border-indigo-400";

  let body: ReactNode;

  if (regressionDetail) {
    body = (
      <>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950">
            Regression age
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{ageStr}</span>
          <span className="text-slate-500"> · </span>
          <span>{regressionDetail.age_label} regression</span>
        </p>
        <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
          This is temporary — tap for guidance
        </p>
      </>
    );
  } else {
    body = (
      <>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          <li>
            <span className="font-medium text-slate-900">Total expected: </span>
            {exp.total_hours_min}–{exp.total_hours_max}h
          </li>
          <li>
            <span className="font-medium text-slate-900">Naps: </span>
            {exp.nap_count_typical} per day
          </li>
          <li>
            <span className="font-medium text-slate-900">Wake windows: </span>
            {formatWakeWindowRange(exp)}
          </li>
        </ul>
        <p className="mt-3 line-clamp-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm leading-snug text-indigo-950">
          <span className="font-medium">Tip: </span>
          {exp.parent_tip}
        </p>
      </>
    );
  }

  const checklistNudge = checklistProgress.showNudge && (
    <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5">
      <p className="text-sm font-medium text-violet-950">
        Safe sleep checklist: {checklistProgress.done}/{checklistProgress.total} confirmed
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-200/80">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width: `${checklistProgress.total ? (checklistProgress.done / checklistProgress.total) * 100 : 0}%`,
          }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-violet-900">Tap to review →</p>
    </div>
  );

  return (
    <Link
      href={`/sleep/${childId}`}
      className={`block h-full rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${borderClass}`}
    >
      <div className="flex gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 text-2xl shadow-inner"
          aria-hidden
        >
          🌙
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600/80">
            Sleep
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{childName}</p>
        </div>
      </div>

      <div className="mt-3">{body}</div>
      {checklistNudge}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-medium text-indigo-900">
        <span>Tap for sleep guide →</span>
        <ChevronRight className="size-5 shrink-0 text-indigo-500" />
      </div>
    </Link>
  );
}
