import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { getAuthUserFromRequest } from "@/lib/supabase/for-request";
import { createChildForUser, listChildrenForUser } from "@/lib/services/child-service";
import { createChildBodySchema, formatZodError } from "@/lib/validation/api-schemas";

/**
 * GET — list children for the logged-in user (Prisma).
 * POST — create a child for the logged-in user (Prisma).
 * Session: Supabase auth only via `getServerUserId`; all reads/writes use Prisma.
 */
export async function GET(request: Request) {
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { rows, error } = await listChildrenForUser(userId);
  if (error) {
    return NextResponse.json({ error }, { status: 503 });
  }

  return NextResponse.json({ children: rows });
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const userId = user.id;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createChildBodySchema.safeParse(raw);
  if (!parsed.success) {
    const { message, fields } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, fields }, { status: 400 });
  }

  const {
    name,
    photo_url: photoUrl,
    date_of_birth: dateOfBirth,
    sex_at_birth: sexAtBirth,
    is_premature: isPremature,
    gestational_age_weeks: gestationalAgeWeeksRaw,
  } = parsed.data;

  const result = await createChildForUser(
    userId,
    {
      name,
      photoUrl,
      dateOfBirth,
      sexAtBirth,
      isPremature,
      gestationalAgeWeeks: isPremature ? gestationalAgeWeeksRaw ?? null : null,
    },
    { userEmail: user.email }
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
