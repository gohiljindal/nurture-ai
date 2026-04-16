import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { listSymptomChecksForHistory } from "@/lib/services/symptom-check-service";

/**
 * GET — list symptom checks history for the authenticated user.
 * Auth comes from Supabase session (cookie or Bearer). Data comes from Prisma.
 */
export async function GET(request: Request) {
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { rows, error } = await listSymptomChecksForHistory(userId, 50);
  if (error) {
    return NextResponse.json({ error }, { status: 503 });
  }

  return NextResponse.json({ checks: rows });
}
