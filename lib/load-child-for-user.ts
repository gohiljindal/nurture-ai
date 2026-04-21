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
    let row: Array<{
      id: string;
      name: string;
      date_of_birth: Date;
      sex_at_birth: string | null;
      is_premature: boolean;
      gestational_age_weeks: number | null;
    }> = [];
    try {
      row = await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          date_of_birth: Date;
          sex_at_birth: string | null;
          is_premature: boolean;
          gestational_age_weeks: number | null;
        }>
      >`
        select c.id::text, c.name, c.date_of_birth, c.sex_at_birth, c.is_premature, c.gestational_age_weeks
        from children c
        left join child_accesses ca on ca.child_id = c.id and ca.user_id = ${user.id}::uuid
        where c.id = ${childId.trim()}::uuid
          and (c.user_id = ${user.id}::uuid or ca.id is not null)
        limit 1
      `;
    } catch {
      row = [];
    }
    if (!row[0]) {
      const owned = await prisma.child.findFirst({
        where: { id: childId.trim(), userId: user.id },
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          sexAtBirth: true,
          isPremature: true,
          gestationalAgeWeeks: true,
        },
      });
      if (owned) {
        row = [
          {
            id: owned.id,
            name: owned.name,
            date_of_birth: owned.dateOfBirth,
            sex_at_birth: owned.sexAtBirth,
            is_premature: owned.isPremature,
            gestational_age_weeks: owned.gestationalAgeWeeks,
          },
        ];
      }
    }

    if (!row[0]) {
      return {
        ok: false,
        status: 404,
        message: "We could not find that child on your account.",
      };
    }
    const childRow = row[0];

    const child: SafetyChild = {
      name: childRow.name,
      date_of_birth: formatDateOnly(childRow.date_of_birth),
      sex_at_birth: childRow.sex_at_birth,
      is_premature: childRow.is_premature ?? false,
      gestational_age_weeks: childRow.gestational_age_weeks,
    };

    return {
      ok: true,
      childId: childRow.id,
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
