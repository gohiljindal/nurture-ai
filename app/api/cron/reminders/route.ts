import { NextResponse } from "next/server";

import { syncVaccineRemindersFromSchedule } from "@/lib/services/reminder-service";

export const dynamic = "force-dynamic";

/**
 * GET — rebuild vaccine reminders (task 29). Protect with `CRON_SECRET`.
 * Vercel Cron: set Authorization: Bearer <CRON_SECRET> or `x-cron-secret` header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  const h =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (h !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await syncVaccineRemindersFromSchedule();
  return NextResponse.json({ ok: true, ...result });
}
