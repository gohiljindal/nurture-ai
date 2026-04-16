"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint, PercentileInterpretation } from "@/lib/who-growth-charts";

type GrowthPercentileBundle = {
  weight: { percentile: number; zScore: number } | null;
  height: { percentile: number; zScore: number } | null;
  head: { percentile: number; zScore: number } | null;
};

type MeasurementRow = {
  id: string;
  child_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  head_cm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  percentiles: GrowthPercentileBundle;
};

type LatestMetric = {
  value: number;
  percentile: number;
  interpretation: PercentileInterpretation;
} | null;

type WeightVelocity = {
  velocity: number;
  unit: string;
  interpretation: string;
};

type GrowthPayload = {
  child: {
    id: string;
    name: string;
    dob: string;
    sex: string | null;
    age_months: number;
  };
  measurements: MeasurementRow[];
  chart_data: {
    weight: ChartDataPoint[];
    height: ChartDataPoint[];
    head: ChartDataPoint[];
  };
  latest_summary: {
    weight: LatestMetric;
    height: LatestMetric;
    head: LatestMetric;
    weight_velocity: WeightVelocity | null;
  };
};

type ChartTab = "weight" | "height" | "head";

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

function badgeClass(color: PercentileInterpretation["color"]): string {
  if (color === "green") {
    return "border-violet-200 bg-violet-50 text-violet-900";
  }
  if (color === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-red-200 bg-red-50 text-red-900";
}

function bandKey(tab: ChartTab): keyof NonNullable<ChartDataPoint["bands"]> {
  if (tab === "weight") return "weight";
  if (tab === "height") return "length";
  return "head";
}

function valueKey(tab: ChartTab): "weight_kg" | "height_cm" | "head_cm" {
  if (tab === "weight") return "weight_kg";
  if (tab === "height") return "height_cm";
  return "head_cm";
}

function pctField(tab: ChartTab): "weight" | "length" | "head" {
  if (tab === "weight") return "weight";
  if (tab === "height") return "length";
  return "head";
}

function tabLabel(tab: ChartTab): string {
  if (tab === "weight") return "Weight";
  if (tab === "height") return "Height";
  return "Head";
}

function unitLabel(tab: ChartTab): string {
  if (tab === "weight") return "kg";
  if (tab === "height") return "cm";
  return "cm";
}

type StackedRow = {
  age_months: number;
  /** Offset from chart yMin — matches stacked Areas */
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  /** Offset — same scale as p3…p97 */
  value: number;
  /** Actual measurement (for tooltip) */
  valueActual: number;
  percentile: number | null;
};

function buildStackedRows(points: ChartDataPoint[], tab: ChartTab): {
  rows: StackedRow[];
  yMin: number;
  yMax: number;
} | null {
  const bk = bandKey(tab);
  const vk = valueKey(tab);
  const pf = pctField(tab);

  const withBands = points.filter((p) => {
    const b = p.bands?.[bk];
    const v = p[vk];
    return (
      b != null &&
      Number.isFinite(b.p3) &&
      Number.isFinite(b.p97) &&
      v != null &&
      typeof v === "number" &&
      Number.isFinite(v)
    );
  });

  if (withBands.length === 0) return null;

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of withBands) {
    const b = p.bands?.[bk];
    const v = p[vk];
    if (!b || typeof v !== "number" || !Number.isFinite(v)) continue;
    yMin = Math.min(yMin, b.p3, b.p97, v);
    yMax = Math.max(yMax, b.p3, b.p97, v);
  }
  const span = yMax - yMin || 1;
  const pad = span * 0.06;
  yMin -= pad;
  yMax += pad;

  const rows: StackedRow[] = withBands.flatMap((p) => {
    const b = p.bands?.[bk];
    const valueActual = p[vk];
    if (
      !b ||
      typeof valueActual !== "number" ||
      !Number.isFinite(valueActual) ||
      !Number.isFinite(b.p3) ||
      !Number.isFinite(b.p15) ||
      !Number.isFinite(b.p50) ||
      !Number.isFinite(b.p85) ||
      !Number.isFinite(b.p97)
    ) {
      return [];
    }
    const pct = p[pf]?.percentile ?? null;
    const p3 = b.p3 - yMin;
    const p15 = b.p15 - yMin;
    const p50 = b.p50 - yMin;
    const p85 = b.p85 - yMin;
    const p97 = b.p97 - yMin;
    const value = valueActual - yMin;
    return [
      {
        age_months: p.age_months,
        p3,
        p15,
        p50,
        p85,
        p97,
        s0: Math.max(0, p3),
        s1: Math.max(0, p15 - p3),
        s2: Math.max(0, p85 - p15),
        s3: Math.max(0, p97 - p85),
        s4: Math.max(0, yMax - yMin - p97),
        value,
        valueActual,
        percentile: pct,
      },
    ];
  });

  return { rows, yMin, yMax };
}

function formatVelocityLine(v: WeightVelocity | null): string | null {
  if (!v) return null;
  if (v.unit === "g/week") {
    const n = Math.round(Math.abs(v.velocity));
    const dir = v.velocity >= 0 ? "Gaining" : "Losing";
    let tail = "— in line with typical patterns for this age";
    if (v.interpretation.includes("Within a typical range")) {
      tail = "— right on track";
    } else if (v.interpretation.includes("Slower than typical")) {
      tail = "— slower than typical; mention at the next visit if it continues";
    } else if (v.interpretation.includes("Faster than typical")) {
      tail = "— faster than typical; worth mentioning if you are unsure";
    }
    return `${dir} ${n} g/week ${tail}`;
  }
  const n = Math.abs(v.velocity);
  const dir = v.velocity >= 0 ? "Growing" : "Change";
  return `${dir} ${n.toFixed(2)} ${v.unit} — ${v.interpretation}`;
}

function hasLatestData(summary: GrowthPayload["latest_summary"]): boolean {
  return (
    summary.weight != null || summary.height != null || summary.head != null
  );
}

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function GrowthPage() {
  const params = useParams();
  const childId = typeof params.childId === "string" ? params.childId : "";

  const [data, setData] = useState<GrowthPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [chartTab, setChartTab] = useState<ChartTab>("weight");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [measuredAt, setMeasuredAt] = useState(todayISODate);
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCm, setHeadCm] = useState("");
  const [notes, setNotes] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/growth/${childId}`, { credentials: "include" });
      const json = (await res.json()) as GrowthPayload & { error?: string };
      if (!res.ok) {
        setLoadError(json.error || "Could not load growth data.");
        setData(null);
        return;
      }
      setData(json);
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

  const chartPoints = useMemo(() => {
    if (!data) return [];
    if (chartTab === "weight") return data.chart_data.weight;
    if (chartTab === "height") return data.chart_data.height;
    return data.chart_data.head;
  }, [data, chartTab]);

  const stacked = useMemo(() => buildStackedRows(chartPoints, chartTab), [chartPoints, chartTab]);

  const tableRows = useMemo(() => {
    if (!data) return [];
    return [...data.measurements].sort(
      (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
    );
  }, [data]);

  const resetForm = () => {
    setMeasuredAt(todayISODate());
    setWeightKg("");
    setHeightCm("");
    setHeadCm("");
    setNotes("");
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!measuredAt.trim()) return "Please choose a date.";
    const w =
      weightKg.trim() === "" ? null : Number(weightKg);
    const h =
      heightCm.trim() === "" ? null : Number(heightCm);
    const hd =
      headCm.trim() === "" ? null : Number(headCm);
    if (w == null && h == null && hd == null) {
      return "Enter at least one of weight, height, or head circumference.";
    }
    if (w != null) {
      if (!Number.isFinite(w) || w < 0.5 || w > 30) {
        return "Weight must be between 0.5 and 30 kg.";
      }
    }
    if (h != null) {
      if (!Number.isFinite(h) || h < 30 || h > 120) {
        return "Height must be between 30 and 120 cm.";
      }
    }
    if (hd != null) {
      if (!Number.isFinite(hd) || hd < 20 || hd > 65) {
        return "Head circumference must be between 20 and 65 cm.";
      }
    }
    return null;
  };

  const submitMeasurement = async () => {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        measured_at: measuredAt.trim().slice(0, 10),
        notes: notes.trim() || undefined,
      };
      if (weightKg.trim() !== "") body.weight_kg = Number(weightKg);
      if (heightCm.trim() !== "") body.height_cm = Number(heightCm);
      if (headCm.trim() !== "") body.head_cm = Number(headCm);

      const res = await fetch(`/api/growth/${childId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(j.error || "Could not save.");
        return;
      }
      setFormOpen(false);
      resetForm();
      await load();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeasurement = async (id: string) => {
    if (!confirm("Delete this measurement? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/growth/${childId}?measurementId=${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLoadError(j.error || "Could not delete.");
        return;
      }
      setLoadError(null);
      await load();
    } catch {
      setLoadError("Delete failed. Try again.");
    } finally {
      setDeletingId(null);
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
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (loadError && !data) {
    return (
      <main className="nurture-page mx-auto max-w-3xl">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-red-800">{loadError}</p>
        <Link href={`/child/${childId}`} className="mt-4 inline-block text-violet-700 underline">
          Back to child profile
        </Link>
      </main>
    );
  }

  if (!data) return null;

  const { child, latest_summary } = data;
  const lastIdx = stacked ? stacked.rows.length - 1 : -1;

  return (
    <div className="nurture-app-bg pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f8fafc]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href={`/child/${childId}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
            aria-label="Back to child profile"
          >
            ←
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
            {child.name}&rsquo;s growth
          </h1>
          <button
            type="button"
            onClick={() => {
              setFormOpen((o) => !o);
              setFormError(null);
            }}
            className="shrink-0 rounded-full border border-violet-600 bg-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            {formOpen ? "Hide form" : "Add measurement"}
          </button>
        </div>
      </header>

      <main className="nurture-page mx-auto max-w-3xl space-y-6 pt-2">
        {loadError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : null}

        {/* Latest summary */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["weight", "height", "head"] as const).map((key) => {
            const label =
              key === "weight" ? "Weight" : key === "height" ? "Height" : "Head circumference";
            const unit = key === "weight" ? "kg" : "cm";
            const m = latest_summary[key];
            return (
              <div
                key={key}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                {m ? (
                  <>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                      {m.value.toFixed(2)} {unit}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {m.percentile.toFixed(1)}th percentile
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass(m.interpretation.color)}`}
                    >
                      {m.interpretation.color === "green"
                        ? "Normal"
                        : m.interpretation.color === "amber"
                          ? "Watch"
                          : "Discuss with doctor"}
                    </span>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Not recorded</p>
                )}
              </div>
            );
          })}
        </section>

        {/* Add form */}
        {formOpen ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">New measurement</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Date</span>
                <input
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Weight (kg)</span>
                <input
                  inputMode="decimal"
                  step="0.01"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 7.2"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="mt-0.5 block text-xs text-slate-500">0.5–30 kg</span>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Height (cm)</span>
                <input
                  inputMode="decimal"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 68"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="mt-0.5 block text-xs text-slate-500">30–120 cm</span>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Head circumference (cm)</span>
                <input
                  inputMode="decimal"
                  step="0.1"
                  value={headCm}
                  onChange={(e) => setHeadCm(e.target.value)}
                  placeholder="e.g. 42"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="mt-0.5 block text-xs text-slate-500">20–65 cm</span>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-slate-600">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </label>
            </div>
            {formError ? (
              <p className="mt-3 text-sm text-red-700">{formError}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={submitMeasurement}
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving ? <Spinner className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        {/* Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
            {(["weight", "height", "head"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setChartTab(t)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  chartTab === t
                    ? "border-violet-600 bg-violet-50 text-violet-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tabLabel(t)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            WHO reference bands apply from birth to 24 months. Values are plotted at age in months.
          </p>
          <div className="mt-4 flex min-h-[280px] gap-2">
            {stacked && stacked.rows.length > 0 ? (
              <>
              <div className="h-80 min-h-[280px] min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={stacked.rows}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis
                    dataKey="age_months"
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    label={{
                      value: "Age (months)",
                      position: "insideBottom",
                      offset: -2,
                      fill: "#78716c",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    domain={[0, stacked.yMax - stacked.yMin]}
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    tickFormatter={(v) => Number(v + stacked.yMin).toFixed(1)}
                    label={{
                      value: `${tabLabel(chartTab)} (${unitLabel(chartTab)})`,
                      angle: -90,
                      position: "insideLeft",
                      fill: "#78716c",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as StackedRow;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-medium text-slate-900">
                            {row.age_months.toFixed(2)} mo
                          </p>
                          <p className="text-slate-700">
                            Value: {row.valueActual.toFixed(2)} {unitLabel(chartTab)}
                          </p>
                          {row.percentile != null ? (
                            <p className="text-slate-600">
                              Percentile: {row.percentile.toFixed(1)}
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="s0"
                    stackId="a"
                    stroke="none"
                    fill="#fecaca"
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="s1"
                    stackId="a"
                    stroke="none"
                    fill="#fde68a"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="s2"
                    stackId="a"
                    stroke="none"
                    fill="#bbf7d0"
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="s3"
                    stackId="a"
                    stroke="none"
                    fill="#fde68a"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="s4"
                    stackId="a"
                    stroke="none"
                    fill="#fecaca"
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p3"
                    stroke="#b91c1c"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p15"
                    stroke="#d97706"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p50"
                    stroke="#059669"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p85"
                    stroke="#d97706"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p97"
                    stroke="#b91c1c"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#0d9488", strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
              {lastIdx >= 0 ? (
                <div
                  className="hidden flex-col justify-center gap-2 border-l border-slate-100 pl-2 text-[10px] leading-tight text-slate-600 sm:flex sm:w-[5.5rem] sm:shrink-0"
                  aria-label="Percentile curve values at latest measurement age"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    Curve
                  </p>
                  <div className="tabular-nums text-red-800">
                    <span className="font-medium">3rd</span>{" "}
                    {(stacked.rows[lastIdx].p3 + stacked.yMin).toFixed(2)}
                  </div>
                  <div className="tabular-nums text-amber-800">
                    <span className="font-medium">15th</span>{" "}
                    {(stacked.rows[lastIdx].p15 + stacked.yMin).toFixed(2)}
                  </div>
                  <div className="tabular-nums text-violet-800">
                    <span className="font-medium">50th</span>{" "}
                    {(stacked.rows[lastIdx].p50 + stacked.yMin).toFixed(2)}
                  </div>
                  <div className="tabular-nums text-amber-800">
                    <span className="font-medium">85th</span>{" "}
                    {(stacked.rows[lastIdx].p85 + stacked.yMin).toFixed(2)}
                  </div>
                  <div className="tabular-nums text-red-800">
                    <span className="font-medium">97th</span>{" "}
                    {(stacked.rows[lastIdx].p97 + stacked.yMin).toFixed(2)}
                  </div>
                </div>
              ) : null}
              </>
            ) : (
              <div className="flex h-80 min-h-[280px] w-full items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-600">
                {chartPoints.length === 0
                  ? `No ${tabLabel(chartTab).toLowerCase()} measurements yet.`
                  : "WHO reference bands apply up to 24 months — add a measurement in that range to see shaded percentile zones."}
              </div>
            )}
          </div>
          {stacked && stacked.rows.length > 0 && lastIdx >= 0 ? (
            <div className="mt-2 flex flex-wrap justify-end gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-600 sm:hidden">
              <span className="tabular-nums text-red-800">
                3rd {(stacked.rows[lastIdx].p3 + stacked.yMin).toFixed(2)}
              </span>
              <span className="tabular-nums text-amber-800">
                15th {(stacked.rows[lastIdx].p15 + stacked.yMin).toFixed(2)}
              </span>
              <span className="tabular-nums text-violet-800">
                50th {(stacked.rows[lastIdx].p50 + stacked.yMin).toFixed(2)}
              </span>
              <span className="tabular-nums text-amber-800">
                85th {(stacked.rows[lastIdx].p85 + stacked.yMin).toFixed(2)}
              </span>
              <span className="tabular-nums text-red-800">
                97th {(stacked.rows[lastIdx].p97 + stacked.yMin).toFixed(2)}
              </span>
            </div>
          ) : null}
        </section>

        {/* History */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Measurement history</h2>
          </div>
          {tableRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-600">
              Add your first measurement above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Weight</th>
                    <th className="px-3 py-2 font-medium">Height</th>
                    <th className="px-3 py-2 font-medium">Head</th>
                    <th className="px-3 py-2 font-medium">Percentiles (W / H / HC)</th>
                    <th className="px-3 py-2 font-medium w-24" />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-2 tabular-nums text-slate-800">{row.measured_at}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {row.weight_kg != null ? `${row.weight_kg.toFixed(2)} kg` : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {row.height_cm != null ? `${row.height_cm.toFixed(2)} cm` : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {row.head_cm != null ? `${row.head_cm.toFixed(2)} cm` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {row.percentiles.weight
                          ? `${row.percentiles.weight.percentile.toFixed(1)}`
                          : "—"}
                        {" / "}
                        {row.percentiles.height
                          ? `${row.percentiles.height.percentile.toFixed(1)}`
                          : "—"}
                        {" / "}
                        {row.percentiles.head
                          ? `${row.percentiles.head.percentile.toFixed(1)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => deleteMeasurement(row.id)}
                          className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                        >
                          {deletingId === row.id ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Interpretation */}
        {hasLatestData(latest_summary) ? (
          <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm leading-relaxed text-slate-800 shadow-sm">
            <h2 className="font-semibold text-violet-950">How things look</h2>
            <p className="mt-2">
              {[
                latest_summary.weight
                  ? `Weight: ${latest_summary.weight.interpretation.description}`
                  : null,
                latest_summary.height
                  ? `Height: ${latest_summary.height.interpretation.description}`
                  : null,
                latest_summary.head
                  ? `Head circumference: ${latest_summary.head.interpretation.description}`
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
            {latest_summary.weight_velocity ? (
              <p className="mt-3 text-slate-800">
                <span className="font-semibold text-violet-950">Growth velocity: </span>
                {formatVelocityLine(latest_summary.weight_velocity)}
              </p>
            ) : null}
            <p className="mt-3 text-slate-700">
              <span className="font-medium text-slate-900">What to watch: </span>
              Trends matter more than a single visit. If feeding, energy, or sleep seem off between
              checkups, mention it to your pediatrician. This screen is informational—not a
              diagnosis.
            </p>
          </section>
        ) : null}

        <footer className="pb-8 pt-2 text-center text-xs leading-relaxed text-slate-500">
          Growth charts are based on WHO Child Growth Standards. They show how children are growing,
          not how they should grow. Always discuss your child&apos;s growth with their pediatrician.
        </footer>
      </main>
    </div>
  );
}
