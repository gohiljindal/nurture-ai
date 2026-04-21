import { NextResponse } from "next/server";

import { loadChildForUser } from "@/lib/load-child-for-user";
import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ childId: string }> };

type TimelineItem = {
  id: string;
  kind: string;
  date: string;
  title: string;
  detail: string;
};

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

  const events: TimelineItem[] = [];
  const [checks, growth, milestones, vaccines] = await Promise.all([
    prisma.symptomCheck.findMany({
      where: { userId: loaded.userId, childId: loaded.childId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, createdAt: true, urgency: true, inputText: true },
    }),
    prisma.growthMeasurement.findMany({
      where: { childId: loaded.childId },
      orderBy: { measuredAt: "desc" },
      take: 30,
      select: { id: true, measuredAt: true, weightKg: true, heightCm: true, headCm: true },
    }),
    prisma.childMilestone.findMany({
      where: { childId: loaded.childId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { milestone: { select: { title: true } } },
    }),
    prisma.childVaccine.findMany({
      where: { childId: loaded.childId, administeredAt: { not: null } },
      orderBy: { administeredAt: "desc" },
      take: 30,
      select: { id: true, vaccineName: true, administeredAt: true },
    }),
  ]);

  for (const c of checks) {
    events.push({
      id: `symptom:${c.id}`,
      kind: "symptom_check",
      date: c.createdAt.toISOString(),
      title: `Symptom check (${c.urgency})`,
      detail: c.inputText.slice(0, 90),
    });
  }
  for (const g of growth) {
    events.push({
      id: `growth:${g.id}`,
      kind: "growth",
      date: g.measuredAt.toISOString(),
      title: "Growth measurement",
      detail: [g.weightKg ? `${g.weightKg}kg` : null, g.heightCm ? `${g.heightCm}cm` : null, g.headCm ? `${g.headCm}cm hc` : null].filter(Boolean).join(" · ") || "Recorded",
    });
  }
  for (const m of milestones) {
    events.push({
      id: `milestone:${m.id}`,
      kind: "milestone",
      date: m.updatedAt.toISOString(),
      title: `Milestone ${m.status}`,
      detail: m.milestone.title,
    });
  }
  for (const v of vaccines) {
    events.push({
      id: `vaccine:${v.id}`,
      kind: "vaccine",
      date: v.administeredAt!.toISOString(),
      title: "Vaccine recorded",
      detail: v.vaccineName,
    });
  }

  // Task 50: use TimelineEvent table if present.
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; kind: string; occurred_at: Date; title: string; detail: string | null }>>`
      select id::text, kind::text, occurred_at, title::text, detail::text
      from timeline_events
      where child_id = ${loaded.childId}::uuid
      order by occurred_at desc
      limit 50
    `;
    for (const r of rows) {
      events.push({
        id: `timeline:${r.id}`,
        kind: r.kind,
        date: r.occurred_at.toISOString(),
        title: r.title,
        detail: r.detail ?? "",
      });
    }
  } catch {
    // optional table not present yet
  }

  events.sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json(
    {
      child: { id: loaded.childId, name: loaded.child.name },
      events: events.slice(0, 100),
    },
    { headers: correlationHeaders(requestId) }
  );
}
