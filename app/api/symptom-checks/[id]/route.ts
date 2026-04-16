import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { getSymptomCheckDetailForUser } from "@/lib/services/symptom-check-service";

/**
 * GET — detail for one saved symptom check owned by the authenticated user.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const { row, error } = await getSymptomCheckDetailForUser(userId, id);

  if (error) {
    return NextResponse.json({ error }, { status: 503 });
  }
  if (!row) {
    return NextResponse.json({ error: "Check not found." }, { status: 404 });
  }

  return NextResponse.json({ check: row });
}
