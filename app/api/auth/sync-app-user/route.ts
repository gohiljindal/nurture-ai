import { NextResponse } from "next/server";
import { upsertAppUserFromAuth } from "@/lib/ensure-app-user";
import { getAuthUserFromRequest } from "@/lib/supabase/for-request";

/**
 * Task 4 — after Supabase login, sync `public.users` for Prisma FKs (skipped if `DATABASE_URL` unset).
 * POST — creates/updates the Prisma `User` row for the current session. Safe to call often.
 * Supports cookie sessions (web) and `Authorization: Bearer` (mobile).
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_database_url" });
  }

  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await upsertAppUserFromAuth({ id: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync-app-user]", e);
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 }
    );
  }
}
