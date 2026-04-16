import { prisma } from "@/lib/prisma";

/**
 * Keeps `public.users` in sync with the auth provider id (e.g. Supabase `auth.users.id`).
 * Required for Prisma FKs (`children.user_id`, etc.) when using local PostgreSQL.
 */
export async function upsertAppUserFromAuth(user: {
  id: string;
  email?: string | null;
}): Promise<void> {
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? null,
    },
    update: {
      email: user.email ?? null,
    },
  });
}
