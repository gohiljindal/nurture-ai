import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { listRemindersForUser } from "@/lib/services/reminder-service";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

export const dynamic = "force-dynamic";

/** GET — upcoming reminders for the signed-in user (task 29). */
export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  const rows = await listRemindersForUser(userId);
  return NextResponse.json({ reminders: rows }, { headers: correlationHeaders(requestId) });
}
