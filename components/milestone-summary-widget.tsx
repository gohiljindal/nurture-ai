"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DomainSummary, MilestoneOverview } from "@/lib/milestone-engine";

export type MilestoneSummaryWidgetProps = {
  childId: string;
  childName: string;
};

type Payload = {
  overview: MilestoneOverview;
  domain_summaries: DomainSummary[];
};

const RING = 56;
const R = 22;
const STROKE = 3;
const CIRC = 2 * Math.PI * R;

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
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      aria-hidden
    >
      <div className="flex animate-pulse gap-4">
        <div className="size-14 shrink-0 rounded-full bg-stone-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-stone-200" />
          <div className="h-4 w-32 rounded bg-stone-200" />
          <div className="h-3 w-full max-w-[180px] rounded bg-stone-200" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2 rounded-full bg-stone-200" />
        <div className="h-2 rounded-full bg-stone-200" />
      </div>
      <div className="mt-3 h-3 w-40 rounded bg-stone-200" />
    </div>
  );
}

export function MilestoneSummaryWidget({ childId, childName }: MilestoneSummaryWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/milestones/${childId}`);
        if (!res.ok) {
          if (!cancelled) {
            setPayload(null);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as Payload & { error?: string };
        if (!cancelled) {
          setPayload({
            overview: json.overview,
            domain_summaries: json.domain_summaries ?? [],
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

  if (loading) {
    return <WidgetSkeleton />;
  }

  if (!payload) {
    return null;
  }

  const { overview, domain_summaries } = payload;
  const pct = Math.min(100, Math.max(0, overview.progress_pct));
  const dashOffset = CIRC * (1 - pct / 100);
  const needsAttention = overview.needs_attention;
  const ringStrokeClass = needsAttention ? "stroke-red-500" : "stroke-violet-500";
  const textClass = needsAttention ? "text-red-600" : "text-violet-700";

  const domains = domain_summaries.slice(0, 4);

  return (
    <Link
      href={`/milestones/${childId}`}
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0" style={{ width: RING, height: RING }}>
          <svg
            width={RING}
            height={RING}
            viewBox={`0 0 ${RING} ${RING}`}
            className="-rotate-90"
            aria-hidden
          >
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-stone-200"
            />
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              className={ringStrokeClass}
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div
            className={`absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums ${textClass}`}
          >
            {pct}%
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Milestones</p>
            {overview.red_flag_delayed > 0 ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
                Needs attention
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-stone-900">{childName}</p>
          <p className="mt-2 text-sm">
            <span className="font-medium text-emerald-700">
              Achieved: {overview.achieved}/{overview.total}
            </span>
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Coming up: <span className="font-medium text-stone-800">{overview.upcoming_count}</span>
          </p>
          {overview.delayed > 0 ? (
            <p className="mt-1 text-sm font-medium text-red-600">
              Worth discussing: {overview.delayed}
            </p>
          ) : null}
        </div>
      </div>

      {domains.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {domains.map((d) => {
            const hasDelayed = d.delayed > 0;
            const barClass = hasDelayed ? "bg-amber-400" : "bg-violet-500";
            const trackClass = hasDelayed ? "bg-amber-100" : "bg-violet-100";
            return (
              <li key={d.domain} className="flex items-center gap-2 text-xs">
                <span className="w-5 shrink-0 text-center" aria-hidden>
                  {d.emoji}
                </span>
                <div className={`h-1 min-w-0 flex-1 overflow-hidden rounded-full ${trackClass}`}>
                  <div
                    className={`h-full rounded-full transition-all ${barClass}`}
                    style={{ width: `${d.progress}%` }}
                  />
                </div>
                <span className="shrink-0 tabular-nums text-stone-600">
                  {d.achieved}/{d.total}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-sm font-medium text-violet-800">
        <span>Tap to see all milestones</span>
        <ChevronRight className="size-5 shrink-0 text-violet-600" />
      </div>
    </Link>
  );
}
