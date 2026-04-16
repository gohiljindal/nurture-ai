import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { getChildProfileForUser } from "@/lib/services/child-service";
import { loadChildForUser } from "@/lib/load-child-for-user";
import {
  generateVaccineTimeline,
  getNextVaccine,
  getOverdueVaccines,
  getScheduleForProvince,
  getUpcomingVaccines,
  parseProvinceFromDb,
} from "@/lib/canada-vaccine-schedule";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

function parseIsoDate(value: string): string | null {
  const s = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T12:00:00`);
  if (Number.isNaN(t)) return null;
  return s;
}

type ChildVaccineRow = {
  id: string;
  child_id: string;
  vaccine_code: string;
  vaccine_name: string;
  province: string;
  scheduled_date: string | null;
  administered_at: string | null;
  administered_by: string | null;
  lot_number: string | null;
  notes: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
};

function dateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function prismaToChildVaccineRow(r: {
  id: string;
  childId: string;
  vaccineCode: string;
  vaccineName: string;
  province: string;
  scheduledDate: Date | null;
  administeredAt: Date | null;
  administeredBy: string | null;
  lotNumber: string | null;
  notes: string | null;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ChildVaccineRow {
  return {
    id: r.id,
    child_id: r.childId,
    vaccine_code: r.vaccineCode,
    vaccine_name: r.vaccineName,
    province: r.province,
    scheduled_date: dateOnly(r.scheduledDate),
    administered_at: dateOnly(r.administeredAt),
    administered_by: r.administeredBy,
    lot_number: r.lotNumber,
    notes: r.notes,
    is_overdue: r.isOverdue,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

function buildCompletedVaccines(rows: ChildVaccineRow[]): Array<{ vaccine_code: string; administered_at: string }> {
  const byCode = new Map<string, string>();
  for (const r of rows) {
    if (r.administered_at == null) continue;
    const at = r.administered_at.slice(0, 10);
    const prev = byCode.get(r.vaccine_code);
    if (!prev || at > prev) {
      byCode.set(r.vaccine_code, at);
    }
  }
  return [...byCode.entries()].map(([vaccine_code, administered_at]) => ({ vaccine_code, administered_at }));
}

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

  const { childId: resolvedChildId, userId } = loaded;

  const { row: childRow, error: childPrismaErr } = await getChildProfileForUser(
    userId,
    resolvedChildId
  );

  if (childPrismaErr) {
    return NextResponse.json(
      { error: childPrismaErr },
      { status: 503, headers: correlationHeaders(requestId) }
    );
  }

  if (!childRow) {
    console.error(`[vaccines GET ${requestId}] missing child after loadChildForUser`);
    return NextResponse.json(
      { error: "Could not load child." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const province = parseProvinceFromDb(childRow.province);
  if (province == null) {
    return NextResponse.json(
      {
        requires_province: true,
        child: { id: childRow.id, name: childRow.name },
      },
      { headers: correlationHeaders(requestId) }
    );
  }

  try {
    const vaccineRows = await prisma.childVaccine.findMany({
      where: { childId: resolvedChildId },
      orderBy: { administeredAt: "asc" },
    });

    const rows = vaccineRows.map(prismaToChildVaccineRow);
    const completedVaccines = buildCompletedVaccines(rows);

    const dob = childRow.date_of_birth.slice(0, 10);
    const timeline = generateVaccineTimeline(dob, province, completedVaccines);
    const upcoming = getUpcomingVaccines(timeline, 90);
    const overdue = getOverdueVaccines(timeline);
    const next_vaccine = getNextVaccine(timeline);

    const sched = getScheduleForProvince(province);
    const administered = timeline.filter((v) => v.administered).length;
    const total = timeline.length;
    const completion_pct = total === 0 ? 0 : Math.round((administered / total) * 100);

    return NextResponse.json(
      {
        child: {
          id: resolvedChildId,
          name: childRow.name,
          dob,
          province,
          province_name: sched.provinceName,
        },
        timeline,
        upcoming,
        overdue,
        next_vaccine,
        stats: {
          total,
          administered,
          overdue: overdue.length,
          upcoming_90_days: upcoming.length,
          completion_pct,
        },
        province_info: {
          health_line: sched.healthLinePhone,
          schedule_url: sched.scheduleUrl,
        },
      },
      { headers: correlationHeaders(requestId) }
    );
  } catch (e) {
    console.error(`[vaccines GET ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not load vaccine records." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }
}

type PostBody = {
  vaccine_code?: string;
  vaccine_name?: string;
  administered_at?: string;
  administered_by?: string | null;
  lot_number?: string | null;
  notes?: string | null;
};

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

  const { childId: resolvedChildId, userId } = loaded;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const vaccineCode = typeof body.vaccine_code === "string" ? body.vaccine_code.trim() : "";
  const vaccineName = typeof body.vaccine_name === "string" ? body.vaccine_name.trim() : "";
  if (!vaccineCode || !vaccineName) {
    return NextResponse.json(
      { error: "vaccine_code and vaccine_name are required." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const administeredAt =
    typeof body.administered_at === "string" ? parseIsoDate(body.administered_at) : null;
  if (!administeredAt) {
    return NextResponse.json(
      { error: "administered_at is required (YYYY-MM-DD)." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const { row: childRow, error: childPrismaErr } = await getChildProfileForUser(
    userId,
    resolvedChildId
  );

  if (childPrismaErr) {
    return NextResponse.json(
      { error: childPrismaErr },
      { status: 503, headers: correlationHeaders(requestId) }
    );
  }

  if (!childRow) {
    console.error(`[vaccines POST ${requestId}] missing child`);
    return NextResponse.json(
      { error: "Could not load child." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const province = parseProvinceFromDb(childRow.province);
  if (province == null) {
    return NextResponse.json(
      { error: "Set a province on the child profile before recording vaccines." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const adminDate = new Date(`${administeredAt}T12:00:00.000Z`);

  const dataFields = {
    vaccineName,
    province,
    scheduledDate: adminDate,
    administeredAt: adminDate,
    administeredBy: body.administered_by != null ? String(body.administered_by) : null,
    lotNumber: body.lot_number != null ? String(body.lot_number) : null,
    notes: body.notes != null ? String(body.notes) : null,
  };

  try {
    const existing = await prisma.childVaccine.findFirst({
      where: { childId: resolvedChildId, vaccineCode },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.childVaccine.update({
        where: { id: existing.id },
        data: dataFields,
      });
      return NextResponse.json(
        { vaccine: prismaToChildVaccineRow(updated) },
        { headers: correlationHeaders(requestId) }
      );
    }

    const inserted = await prisma.childVaccine.create({
      data: {
        childId: resolvedChildId,
        vaccineCode,
        ...dataFields,
      },
    });

    return NextResponse.json(
      { vaccine: prismaToChildVaccineRow(inserted) },
      { status: 201, headers: correlationHeaders(requestId) }
    );
  } catch (e) {
    console.error(`[vaccines POST ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not save vaccine record." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }
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

  const vaccineId = new URL(request.url).searchParams.get("vaccineId");
  if (!vaccineId || !vaccineId.trim()) {
    return NextResponse.json(
      { error: "Missing vaccineId query parameter." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  try {
    const existing = await prisma.childVaccine.findFirst({
      where: {
        id: vaccineId.trim(),
        childId: resolvedChildId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Vaccine record not found for this child." },
        { status: 404, headers: correlationHeaders(requestId) }
      );
    }

    await prisma.childVaccine.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ deleted: true }, { headers: correlationHeaders(requestId) });
  } catch (e) {
    console.error(`[vaccines DELETE ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not delete vaccine record." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }
}
