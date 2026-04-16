import type { GrowthMeasurement } from "@prisma/client";
import { NextResponse } from "next/server";
import { calculateAgeInMonths } from "@/lib/child-age";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import {
  buildChartData,
  getGrowthPercentile,
  getGrowthVelocity,
  interpretPercentile,
  type GrowthPercentileResult,
  type GrowthSex,
} from "@/lib/who-growth-charts";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

/** Matches `latest_summary.weight_velocity` shape */
export type GrowthVelocity = NonNullable<ReturnType<typeof getGrowthVelocity>>;

type GrowthMeasurementRow = {
  id: string;
  child_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  head_cm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toGrowthSex(sexAtBirth: string | null | undefined): GrowthSex {
  const s = String(sexAtBirth ?? "").toLowerCase();
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  return "female";
}

function ageMonthsAtMeasurement(dob: string, measuredAt: string): number {
  const birth = new Date(dob.includes("T") ? dob : `${dob}T12:00:00`);
  const m = new Date(measuredAt.includes("T") ? measuredAt : `${measuredAt}T12:00:00`);
  const days = (m.getTime() - birth.getTime()) / 86400000;
  return Math.max(0, days / 30.4375);
}

function computePercentiles(
  row: Pick<GrowthMeasurementRow, "measured_at" | "weight_kg" | "height_cm" | "head_cm">,
  dob: string,
  sex: GrowthSex
): {
  weight: GrowthPercentileResult | null;
  height: GrowthPercentileResult | null;
  head: GrowthPercentileResult | null;
} {
  const ageMonths = ageMonthsAtMeasurement(dob, row.measured_at);
  const w =
    row.weight_kg != null && Number.isFinite(Number(row.weight_kg))
      ? Number(row.weight_kg)
      : null;
  const h =
    row.height_cm != null && Number.isFinite(Number(row.height_cm))
      ? Number(row.height_cm)
      : null;
  const hc =
    row.head_cm != null && Number.isFinite(Number(row.head_cm))
      ? Number(row.head_cm)
      : null;

  return {
    weight: w != null ? getGrowthPercentile("weight_for_age", sex, ageMonths, w) : null,
    height: h != null ? getGrowthPercentile("length_for_age", sex, ageMonths, h) : null,
    head: hc != null ? getGrowthPercentile("head_for_age", sex, ageMonths, hc) : null,
  };
}

function toMeasurementRow(r: GrowthMeasurement): GrowthMeasurementRow {
  return {
    id: r.id,
    child_id: r.childId,
    measured_at: r.measuredAt.toISOString().slice(0, 10),
    weight_kg: r.weightKg != null ? Number(r.weightKg) : null,
    height_cm: r.heightCm != null ? Number(r.heightCm) : null,
    head_cm: r.headCm != null ? Number(r.headCm) : null,
    notes: r.notes,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

function parseIsoDate(value: string): string | null {
  const s = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T12:00:00`);
  if (Number.isNaN(t)) return null;
  return s;
}

function buildLatestSummary(
  measurements: GrowthMeasurementRow[],
  dob: string,
  sex: GrowthSex
): {
  weight: {
    value: number;
    percentile: number;
    interpretation: ReturnType<typeof interpretPercentile>;
  } | null;
  height: {
    value: number;
    percentile: number;
    interpretation: ReturnType<typeof interpretPercentile>;
  } | null;
  head: {
    value: number;
    percentile: number;
    interpretation: ReturnType<typeof interpretPercentile>;
  } | null;
  weight_velocity: GrowthVelocity | null;
} {
  const sortedDesc = [...measurements].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
  );

  const latestW = sortedDesc.find((m) => m.weight_kg != null);
  const latestH = sortedDesc.find((m) => m.height_cm != null);
  const latestHd = sortedDesc.find((m) => m.head_cm != null);

  const mapLatest = (
    m: GrowthMeasurementRow | undefined,
    key: "weight_kg" | "height_cm" | "head_cm",
    indicator: "weight_for_age" | "length_for_age" | "head_for_age"
  ) => {
    if (!m || m[key] == null) return null;
    const raw = Number(m[key]);
    if (!Number.isFinite(raw)) return null;
    const ageMonths = ageMonthsAtMeasurement(dob, m.measured_at);
    const p = getGrowthPercentile(indicator, sex, ageMonths, raw);
    if (!p) return null;
    return {
      value: raw,
      percentile: p.percentile,
      interpretation: interpretPercentile(p.percentile),
    };
  };

  const weightSeriesAsc = [...measurements]
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .filter((m) => m.weight_kg != null && Number.isFinite(Number(m.weight_kg)))
    .map((m) => ({ measured_at: m.measured_at, value: Number(m.weight_kg) }));

  const vel = getGrowthVelocity(weightSeriesAsc, "weight", dob);

  return {
    weight: mapLatest(latestW, "weight_kg", "weight_for_age"),
    height: mapLatest(latestH, "height_cm", "length_for_age"),
    head: mapLatest(latestHd, "head_cm", "head_for_age"),
    weight_velocity: vel,
  };
}

/**
 * GET — growth measurements + percentiles + chart data + latest summary.
 * POST — add measurement (validated ranges).
 * DELETE — `?measurementId=` removes one row for this child.
 *
 * Auth / ownership: `loadChildForUser` (401 if not signed in, 404 if child not on account).
 * Data: Prisma `growth_measurements` (same DB as `children`).
 */
export async function GET(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId, child } = loaded;

  const sex = toGrowthSex(child.sex_at_birth);
  const dob = child.date_of_birth;
  const age_months = calculateAgeInMonths(dob);

  let rows: GrowthMeasurement[];
  try {
    rows = await prisma.growthMeasurement.findMany({
      where: { childId: resolvedChildId },
      orderBy: { measuredAt: "asc" },
    });
  } catch (e) {
    console.error(`[growth GET ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not load growth measurements." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const measurements = rows.map((r) => toMeasurementRow(r));

  const measurementsWithPercentiles = measurements.map((m) => ({
    ...m,
    percentiles: computePercentiles(m, dob, sex),
  }));

  const chartInput = measurements.map((m) => ({
    measured_at: m.measured_at,
    weight_kg: m.weight_kg ?? undefined,
    height_cm: m.height_cm ?? undefined,
    head_cm: m.head_cm ?? undefined,
  }));

  const fullChart = buildChartData(chartInput, dob, sex);

  const chart_data = {
    weight: fullChart.filter((p) => p.weight_kg != null),
    height: fullChart.filter((p) => p.height_cm != null),
    head: fullChart.filter((p) => p.head_cm != null),
  };

  const latest_summary = buildLatestSummary(measurements, dob, sex);

  return NextResponse.json(
    {
      child: {
        id: resolvedChildId,
        name: child.name,
        dob,
        sex: child.sex_at_birth ?? null,
        age_months,
      },
      measurements: measurementsWithPercentiles,
      chart_data,
      latest_summary,
    },
    { headers: correlationHeaders(requestId) }
  );
}

function inRange(n: number, lo: number, hi: number): boolean {
  return n >= lo && n <= hi;
}

/** Accepts JSON numbers or numeric strings; null/empty omits the metric */
function parseOptionalMetric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId, child } = loaded;
  const sex = toGrowthSex(child.sex_at_birth);
  const dob = child.date_of_birth;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const measuredAtRaw = typeof body.measured_at === "string" ? body.measured_at.trim() : "";
  const measuredAt = parseIsoDate(measuredAtRaw);
  if (!measuredAt) {
    return NextResponse.json(
      { error: "measured_at is required (YYYY-MM-DD)." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const w = parseOptionalMetric(body.weight_kg);
  const h = parseOptionalMetric(body.height_cm);
  const hd = parseOptionalMetric(body.head_cm);

  if (w == null && h == null && hd == null) {
    return NextResponse.json(
      { error: "Provide at least one of weight_kg, height_cm, or head_cm." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  if (w != null && (!Number.isFinite(w) || !inRange(w, 0.5, 30))) {
    return NextResponse.json(
      { error: "weight_kg must be between 0.5 and 30 kg." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }
  if (h != null && (!Number.isFinite(h) || !inRange(h, 30, 120))) {
    return NextResponse.json(
      { error: "height_cm must be between 30 and 120 cm." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }
  if (hd != null && (!Number.isFinite(hd) || !inRange(hd, 20, 65))) {
    return NextResponse.json(
      { error: "head_cm must be between 20 and 65 cm." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  let saved: GrowthMeasurement;
  try {
    saved = await prisma.growthMeasurement.create({
      data: {
        childId: resolvedChildId,
        measuredAt: new Date(`${measuredAt}T12:00:00`),
        weightKg: w,
        heightCm: h,
        headCm: hd,
        notes: body.notes != null ? String(body.notes) : null,
      },
    });
  } catch (e) {
    console.error(`[growth POST ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not save measurement." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const row = toMeasurementRow(saved);
  const percentiles = computePercentiles(row, dob, sex);

  return NextResponse.json(
    { measurement: row, percentiles },
    { status: 201, headers: correlationHeaders(requestId) }
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId } = loaded;

  const measurementId = new URL(request.url).searchParams.get("measurementId");
  if (!measurementId || !measurementId.trim()) {
    return NextResponse.json(
      { error: "Missing measurementId query parameter." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  let existing: GrowthMeasurement | null;
  try {
    existing = await prisma.growthMeasurement.findFirst({
      where: { id: measurementId.trim(), childId: resolvedChildId },
    });
  } catch (e) {
    console.error(`[growth DELETE ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not verify measurement." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Measurement not found for this child." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }

  try {
    await prisma.growthMeasurement.delete({
      where: { id: measurementId.trim() },
    });
  } catch (e) {
    console.error(`[growth DELETE ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not delete measurement." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json({ deleted: true }, { headers: correlationHeaders(requestId) });
}
