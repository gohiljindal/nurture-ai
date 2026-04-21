import { prisma } from "@/lib/prisma";

const VACCINE_KIND = "vaccine_due";

/**
 * Rebuild vaccine-linked reminders from `child_vaccines` (scheduled, not yet given).
 * Idempotent — safe to run from cron (task 29).
 */
export async function syncVaccineRemindersFromSchedule(): Promise<{
  deleted: number;
  inserted: number;
}> {
  const del = await prisma.reminder.deleteMany({
    where: { kind: VACCINE_KIND },
  });

  const pending = await prisma.childVaccine.findMany({
    where: {
      administeredAt: null,
      scheduledDate: { not: null },
    },
    include: {
      child: { select: { userId: true, name: true } },
    },
  });

  let inserted = 0;
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 365);

  for (const v of pending) {
    if (!v.scheduledDate) continue;
    if (v.scheduledDate > horizon) continue;

    await prisma.reminder.create({
      data: {
        userId: v.child.userId,
        childId: v.childId,
        kind: VACCINE_KIND,
        title: `${v.vaccineName} due`,
        body: `Scheduled for ${v.scheduledDate.toISOString().slice(0, 10)} · ${v.child.name}`,
        dueAt: v.scheduledDate,
        sourceId: v.id,
      },
    });
    inserted += 1;
  }

  return { deleted: del.count, inserted };
}

export async function listRemindersForUser(
  userId: string,
  daysAhead = 90
): Promise<
  Array<{
    id: string;
    child_id: string;
    kind: string;
    title: string;
    body: string | null;
    due_at: string;
  }>
> {
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);

  const rows = await prisma.reminder.findMany({
    where: {
      userId,
      dueAt: { lte: end },
    },
    orderBy: { dueAt: "asc" },
    take: 50,
  });

  return rows.map((r) => ({
    id: r.id,
    child_id: r.childId,
    kind: r.kind,
    title: r.title,
    body: r.body,
    due_at: r.dueAt.toISOString().slice(0, 10),
  }));
}
