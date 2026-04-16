import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/supabase/for-request";
import type { SafetyChild } from "@/lib/safety-rules";

export type LoadChildFailure = {
  ok: false;
  status: 400 | 401 | 404 | 503;
  message: string;
};

export type LoadChildSuccess = {
  ok: true;
  /** Row id in `public.children` — use for inserts and APIs */
  childId: string;
  userId: string;
  child: SafetyChild;
};

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Loads a child row from PostgreSQL (Prisma) for the current Supabase session user.
 * Pass the incoming `Request` so mobile clients can use `Authorization: Bearer`.
 */
export async function loadChildForUser(
  childId: unknown,
  request: Request
): Promise<LoadChildSuccess | LoadChildFailure> {
  if (typeof childId !== "string" || !childId.trim()) {
    return {
      ok: false,
      status: 400,
      message: "Missing or invalid child id.",
    };
  }

  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return {
      ok: false,
      status: 401,
      message: "You must be signed in to run a symptom check.",
    };
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      ok: false,
      status: 503,
      message: "Database is not configured (missing DATABASE_URL).",
    };
  }

  try {
    const row = await prisma.child.findFirst({
      where: {
        id: childId.trim(),
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        sexAtBirth: true,
        isPremature: true,
        gestationalAgeWeeks: true,
      },
    });

    if (!row) {
      return {
        ok: false,
        status: 404,
        message: "We could not find that child on your account.",
      };
    }

    const child: SafetyChild = {
      name: row.name,
      date_of_birth: formatDateOnly(row.dateOfBirth),
      sex_at_birth: row.sexAtBirth,
      is_premature: row.isPremature ?? false,
      gestational_age_weeks: row.gestationalAgeWeeks,
    };

    return {
      ok: true,
      childId: row.id,
      userId: user.id,
      child,
    };
  } catch (e) {
    console.error("[loadChildForUser]", e);
    return {
      ok: false,
      status: 503,
      message: "Could not load child profile. Try again shortly.",
    };
  }
}
