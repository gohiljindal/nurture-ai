"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type GrowthSummaryWidgetProps = {
  childId: string;
  childName: string;
};

type LatestMetric = {
  value: number;
  percentile: number;
} | null;

type GrowthPayload = {
  measurements: Array<{
    measured_at: string;
    weight_kg: number | null;
    height_cm: number | null;
    head_cm: number | null;
  }>;
  latest_summary: {
    weight: LatestMetric;
    height: LatestMetric;
    head: LatestMetric;
  };
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

/** Green = 15th–85th; amber = outside that band but not extreme; red = &lt;3rd or &gt;97th */
function percentileBadgeClass(percentile: number): string {
  if (!Number.isFinite(percentile)) {
    return "border-stone-200 bg-stone-100 text-stone-600";
  }
  if (percentile < 3 || percentile > 97) {
    return "border-red-200 bg-red-50 text-red-900";
  }
  if (percentile >= 15 && percentile <= 85) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function WeightSparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 36;
  const pad = 4;
  if (values.length === 0 || values.length < 2) {
    return (
      <div className="h-9 w-[120px] rounded-md bg-stone-50" aria-hidden />
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pts = values.map((v, i) => {
    const x = pad + (innerW * i) / (values.length - 1);
    const y = pad + innerH - ((v - min) / span) * innerH;
    return `${x},${y}`;
  });
  const d = `M ${pts.join(" L ")}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="text-violet-600"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = pad + (innerW * i) / (values.length - 1);
        const y = pad + innerH - ((v - min) / span) * innerH;
        return <circle key={i} cx={x} cy={y} r={2.5} className="fill-violet-600" />;
      })}
    </svg>
  );
}

function WidgetSkeleton() {
  return (
    <div
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      aria-hidden
    >
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-stone-200" />
        <div className="h-4 w-28 rounded bg-stone-200" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-14 rounded-xl bg-stone-100" />
        <div className="h-14 rounded-xl bg-stone-100" />
        <div className="h-14 rounded-xl bg-stone-100" />
      </div>
      <div className="mt-3 h-9 w-full max-w-[120px] rounded-md bg-stone-100" />
      <div className="mt-3 h-3 w-40 rounded bg-stone-200" />
    </div>
  );
}

function formatMeasuredDate(iso: string): string {
  const t = Date.parse(`${iso}T12:00:00`);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GrowthSummaryWidget({ childId, childName }: GrowthSummaryWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<GrowthPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/growth/${childId}`, { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) {
            setPayload(null);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as GrowthPayload & { error?: string };
        if (!cancelled) {
          setPayload({
            measurements: Array.isArray(json.measurements) ? json.measurements : [],
            latest_summary: {
              weight: json.latest_summary?.weight ?? null,
              height: json.latest_summary?.height ?? null,
              head: json.latest_summary?.head ?? null,
            },
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

  const weightSparkValues = useMemo(() => {
    if (!payload?.measurements.length) return [];
    const withW = payload.measurements
      .filter((m) => m.weight_kg != null && Number.isFinite(Number(m.weight_kg)))
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
      .slice(-6)
      .map((m) => Number(m.weight_kg));
    return withW.filter((n) => Number.isFinite(n));
  }, [payload]);

  const lastMeasuredAt = useMemo(() => {
    if (!payload?.measurements.length) return null;
    const first = payload.measurements[0];
    if (!first) return null;
    return payload.measurements.reduce(
      (latest, m) => (m.measured_at >= latest ? m.measured_at : latest),
      first.measured_at
    );
  }, [payload]);

  if (loading) {
    return <WidgetSkeleton />;
  }

  if (!payload) {
    return null;
  }

  const hasAnyMeasurement = payload.measurements.length > 0;
  const { latest_summary } = payload;

  return (
    <Link
      href={`/growth/${childId}`}
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Growth</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-stone-900">{childName}</p>
        </div>
      </div>

      {!hasAnyMeasurement ? (
        <div className="mt-3">
          <p className="text-sm text-stone-600">No measurements yet</p>
          <p className="mt-2 text-sm font-medium text-violet-800">Add first measurement →</p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                { key: "weight", label: "Wt", unit: "kg", m: latest_summary.weight },
                { key: "height", label: "Ht", unit: "cm", m: latest_summary.height },
                { key: "head", label: "HC", unit: "cm", m: latest_summary.head },
              ] as const
            ).map(({ key, label, unit, m }) => (
              <div
                key={key}
                className="rounded-xl border border-stone-100 bg-stone-50/80 px-2 py-2 text-center"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
                  {label}
                </p>
                {m ? (
                  <>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
                      {m.value.toFixed(1)}
                      <span className="text-[10px] font-normal text-stone-500"> {unit}</span>
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${percentileBadgeClass(m.percentile)}`}
                    >
                      {m.percentile.toFixed(0)}th
                    </span>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-stone-400">—</p>
                )}
              </div>
            ))}
          </div>

          {weightSparkValues.length >= 2 ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                Weight trend
              </span>
              <WeightSparkline values={weightSparkValues} />
            </div>
          ) : null}
        </>
      )}

      {hasAnyMeasurement && lastMeasuredAt ? (
        <p className="mt-2 text-xs text-stone-500">
          Last measured{" "}
          <span className="font-medium text-stone-700">{formatMeasuredDate(lastMeasuredAt)}</span>
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm font-medium text-violet-800">
        <span>Tap to track growth →</span>
        <ChevronRight className="size-5 shrink-0 text-violet-600" />
      </div>
    </Link>
  );
}
