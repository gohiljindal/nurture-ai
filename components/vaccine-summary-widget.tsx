"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVaccineCountdown, type ScheduledVaccine } from "@/lib/canada-vaccine-schedule";

export type VaccineSummaryWidgetProps = {
  childId: string;
  childName: string;
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

function parseScheduled(raw: Record<string, unknown>): ScheduledVaccine {
  return {
    code: String(raw.code),
    name: String(raw.name),
    shortName: String(raw.shortName),
    ageMonths: raw.ageMonths == null ? null : Number(raw.ageMonths),
    gradeNote: raw.gradeNote == null ? null : String(raw.gradeNote),
    diseases: Array.isArray(raw.diseases) ? (raw.diseases as string[]) : [],
    doses: Number(raw.doses),
    notes: raw.notes == null ? null : String(raw.notes),
    isSchoolAge: Boolean(raw.isSchoolAge),
    scheduledDate: new Date(String(raw.scheduledDate)),
    isOverdue: Boolean(raw.isOverdue),
    daysUntilDue: Number(raw.daysUntilDue),
    administered: Boolean(raw.administered),
    administeredDate: raw.administeredDate ? new Date(String(raw.administeredDate)) : null,
  };
}

type VaccinePayload = {
  child: {
    id: string;
    name: string;
    dob: string;
    province: string;
    province_name: string;
  };
  stats?: {
    total: number;
    administered: number;
    overdue: number;
    upcoming_90_days: number;
    completion_pct: number;
  };
  next_vaccine: Record<string, unknown> | null;
};

const EMPTY_STATS: NonNullable<VaccinePayload["stats"]> = {
  total: 0,
  administered: 0,
  overdue: 0,
  upcoming_90_days: 0,
  completion_pct: 0,
};

function WidgetSkeleton() {
  return (
    <div
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      aria-hidden
    >
      <div className="animate-pulse space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-stone-200" />
            <div className="h-4 w-32 rounded bg-stone-200" />
          </div>
          <div className="h-6 w-12 rounded-full bg-stone-100" />
        </div>
        <div className="h-2 rounded-full bg-stone-100" />
        <div className="h-12 rounded-xl bg-stone-100" />
        <div className="h-3 w-40 rounded bg-stone-200" />
      </div>
    </div>
  );
}

function nextPillClass(v: ScheduledVaccine): string {
  if (v.isOverdue || v.daysUntilDue < 0) {
    return "border-red-200 bg-red-50 text-red-950";
  }
  if (v.daysUntilDue <= 30) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

export function VaccineSummaryWidget({ childId, childName }: VaccineSummaryWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [requiresProvince, setRequiresProvince] = useState<{ child: { id: string; name: string } } | null>(
    null
  );
  const [payload, setPayload] = useState<VaccinePayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(`/api/vaccines/${childId}`);
        const json: unknown = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setFailed(true);
            setPayload(null);
            setRequiresProvince(null);
            setLoading(false);
          }
          return;
        }
        const j = json as Record<string, unknown>;
        if (j.requires_province === true) {
          if (!cancelled) {
            setRequiresProvince({ child: j.child as { id: string; name: string } });
            setPayload(null);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setRequiresProvince(null);
          setPayload(json as VaccinePayload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setPayload(null);
          setRequiresProvince(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  const nextVaccine = useMemo(() => {
    if (!payload?.next_vaccine) return null;
    return parseScheduled(payload.next_vaccine as Record<string, unknown>);
  }, [payload]);

  if (loading) {
    return <WidgetSkeleton />;
  }

  if (failed || (!requiresProvince && !payload)) {
    return null;
  }

  if (requiresProvince) {
    return (
      <Link
        href={`/vaccines/${childId}`}
        className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md"
      >
        <div className="flex gap-3">
          <MapPinned className="mt-0.5 size-9 shrink-0 text-stone-400" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Vaccines</p>
            <p className="mt-2 text-sm leading-snug text-stone-700">
              Set your province to see {childName}&rsquo;s vaccine schedule →
            </p>
          </div>
        </div>
      </Link>
    );
  }

  if (!payload) return null;

  const stats = { ...EMPTY_STATS, ...payload.stats };
  const administered = stats.administered;
  const isNewTracker = administered === 0;
  const progressPct = stats.total === 0 ? 0 : Math.min(100, Math.round((administered / stats.total) * 100));

  if (isNewTracker) {
    return (
      <Link
        href={`/vaccines/${childId}`}
        className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Vaccines</p>
        <p className="mt-1 truncate text-sm font-semibold text-stone-900">{childName}</p>
        <p className="mt-3 text-sm font-medium text-violet-800">Vaccine schedule ready</p>
        {nextVaccine && !nextVaccine.administered ? (
          <div className="mt-2 rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2 text-sm">
            <p className="font-medium text-stone-900">{nextVaccine.shortName}</p>
            <p className="mt-0.5 text-xs text-stone-600">
              Due ~ {nextVaccine.scheduledDate.toLocaleDateString()}
            </p>
            <p className="mt-0.5 text-xs font-medium text-violet-800">
              {getVaccineCountdown(nextVaccine)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Open the planner to see what&rsquo;s due next.</p>
        )}
        <p className="mt-3 text-sm font-medium text-violet-800">Start tracking →</p>
      </Link>
    );
  }

  const showGivenStat = stats.administered > 0;
  const showOverdueStat = stats.overdue > 0;

  return (
    <Link
      href={`/vaccines/${childId}`}
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Vaccines</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-stone-900">{childName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-700">
            {payload.child.province}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-900">
            {stats.completion_pct}%
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-stone-500">
          <span>Progress</span>
          <span className="tabular-nums">
            {stats.administered}/{stats.total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {nextVaccine && !nextVaccine.administered ? (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${nextPillClass(nextVaccine)}`}
        >
          <p className="font-medium leading-tight">{nextVaccine.shortName}</p>
          <p className="mt-1 text-xs opacity-90">{getVaccineCountdown(nextVaccine)}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-stone-600">You&rsquo;re caught up on scheduled doses.</p>
      )}

      {(showGivenStat || showOverdueStat) && (
        <p className="mt-3 text-xs text-stone-600">
          {showGivenStat ? (
            <span>
              Given <span className="font-semibold tabular-nums text-stone-800">{stats.administered}</span>
            </span>
          ) : null}
          {showGivenStat && showOverdueStat ? <span className="mx-1 text-stone-400">|</span> : null}
          {showOverdueStat ? (
            <span>
              Overdue{" "}
              <span className="font-semibold tabular-nums text-amber-800">{stats.overdue}</span>
            </span>
          ) : null}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-medium text-violet-800">
        <span>Tap to manage vaccines →</span>
        <ChevronRight className="size-5 shrink-0 text-violet-600" />
      </div>
    </Link>
  );
}
