/**
 * Child service layer — PostgreSQL via Prisma only.
 * UI and routes should call these helpers (or `/api/children`) instead of Supabase for `children` data.
 */
import { upsertAppUserFromAuth } from "@/lib/ensure-app-user";
import { friendlyPrismaErrorMessage, logPrismaWarning } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

/** Shape expected by the dashboard “Your children” section. */
export type DashboardChildRow = {
  id: string;
  name: string;
  photo_url?: string | null;
  date_of_birth: string;
  sex_at_birth: string | null;
  is_premature: boolean;
  gestational_age_weeks: number | null;
  province?: string | null;
};

/** Full profile row for child detail page and vaccine APIs. */
export type ChildProfileRow = {
  id: string;
  name: string;
  photo_url: string | null;
  date_of_birth: string;
  sex_at_birth: string | null;
  is_premature: boolean;
  gestational_age_weeks: number | null;
  province: string | null;
};

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns true if this child row belongs to the given user (for inserts / defense in depth).
 * Always pair with the authenticated session’s user id — never trust `childId` from the client alone.
 */
export async function isChildOwnedByUser(userId: string, childId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  try {
    const row = await prisma.child.findFirst({
      where: { id: childId, userId },
      select: { id: true },
    });
    return row != null;
  } catch (e) {
    console.error("[isChildOwnedByUser]", e);
    return false;
  }
}

/**
 * Lists all children for a user (newest first), for dashboard and similar views.
 */
export async function listChildrenForUser(userId: string): Promise<{
  rows: DashboardChildRow[];
  error: string | null;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { rows: [], error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const rows = await prisma.child.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const mapped: DashboardChildRow[] = rows.map((c) => ({
      id: c.id,
      name: c.name,
      photo_url: c.photoUrl,
      date_of_birth: formatDateOnly(c.dateOfBirth),
      sex_at_birth: c.sexAtBirth,
      is_premature: c.isPremature,
      gestational_age_weeks: c.gestationalAgeWeeks,
      province: c.province,
    }));

    return { rows: mapped, error: null };
  } catch (e) {
    console.error("[listChildrenForUser]", e);
    return { rows: [], error: "Could not load children. Try again shortly." };
  }
}

/**
 * One child profile, scoped to the owning user (for child detail page and vaccine child reads).
 */
export async function getChildProfileForUser(
  userId: string,
  childId: string
): Promise<{ row: ChildProfileRow | null; error: string | null }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { row: null, error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const c = await prisma.child.findFirst({
      where: { id: childId, userId },
    });

    if (!c) {
      return { row: null, error: null };
    }

    const row: ChildProfileRow = {
      id: c.id,
      name: c.name,
      photo_url: c.photoUrl,
      date_of_birth: formatDateOnly(c.dateOfBirth),
      sex_at_birth: c.sexAtBirth,
      is_premature: c.isPremature,
      gestational_age_weeks: c.gestationalAgeWeeks,
      province: c.province,
    };

    return { row, error: null };
  } catch (e) {
    console.error("[getChildProfileForUser]", e);
    return { row: null, error: "Could not load child." };
  }
}

export type CreateChildInput = {
  name: string;
  photoUrl: string | null;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  sexAtBirth: string | null;
  isPremature: boolean;
  gestationalAgeWeeks: number | null;
};

/**
 * Creates a child row for the given user.
 */
export async function createChildForUser(
  userId: string,
  input: CreateChildInput,
  options?: { userEmail?: string | null }
): Promise<{ id: string } | { error: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { error: "Database is not configured (missing DATABASE_URL)." };
  }

  const dob = new Date(`${input.dateOfBirth.trim()}T12:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) {
    return { error: "Invalid date of birth." };
  }

  try {
    await upsertAppUserFromAuth({ id: userId, email: options?.userEmail ?? null });
  } catch (e) {
    console.error("[createChildForUser] upsertAppUserFromAuth failed:", e);
    logPrismaWarning("createChildForUser/upsertAppUser", e);
    return {
      error: friendlyPrismaErrorMessage(
        e,
        "Could not sync your account. Try signing out and signing in again, then retry."
      ),
    };
  }

  try {
    const c = await prisma.child.create({
      data: {
        userId,
        name: input.name.trim(),
        photoUrl: input.photoUrl?.trim() || null,
        dateOfBirth: dob,
        sexAtBirth: input.sexAtBirth?.trim() || null,
        isPremature: input.isPremature,
        gestationalAgeWeeks: input.gestationalAgeWeeks,
      },
      select: { id: true },
    });

    return { id: c.id };
  } catch (e) {
    console.error("[createChildForUser] prisma.child.create failed:", e);
    logPrismaWarning("createChildForUser/child.create", e);
    return {
      error: friendlyPrismaErrorMessage(
        e,
        "Could not save your child’s profile. Please try again in a moment."
      ),
    };
  }
}

/**
 * Updates province on a child owned by `userId`.
 */
export async function updateChildProvinceForUser(
  userId: string,
  childId: string,
  province: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const result = await prisma.child.updateMany({
      where: { id: childId, userId },
      data: { province },
    });

    if (result.count === 0) {
      return { ok: false, error: "Child not found." };
    }

    return { ok: true };
  } catch (e) {
    console.error("[updateChildProvinceForUser]", e);
    return { ok: false, error: "Could not update province." };
  }
}

/**
 * Updates child photo on a child owned by `userId`.
 */
export async function updateChildPhotoForUser(
  userId: string,
  childId: string,
  photoUrl: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const result = await prisma.child.updateMany({
      where: { id: childId, userId },
      data: { photoUrl: photoUrl?.trim() || null },
    });

    if (result.count === 0) {
      return { ok: false, error: "Child not found." };
    }

    return { ok: true };
  } catch (e) {
    console.error("[updateChildPhotoForUser]", e);
    return { ok: false, error: "Could not update child photo." };
  }
}

/**
 * Deletes a child profile owned by `userId`.
 */
export async function deleteChildForUser(
  userId: string,
  childId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const result = await prisma.child.deleteMany({
      where: { id: childId, userId },
    });

    if (result.count === 0) {
      return { ok: false, error: "Child not found." };
    }

    return { ok: true };
  } catch (e) {
    console.error("[deleteChildForUser]", e);
    return { ok: false, error: "Could not remove child profile." };
  }
}
