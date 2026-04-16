import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/supabase/for-request";

/**
 * Simple authenticated probe for mobile/web clients.
 * Confirms:
 * 1. Supabase auth token/cookie is valid
 * 2. API can read the current user
 * 3. Prisma app-user row exists (after sync-app-user)
 */
export async function GET(request: Request) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const appUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    authUser: {
      id: authUser.id,
      email: authUser.email ?? null,
    },
    appUser: appUser
      ? {
          id: appUser.id,
          email: appUser.email ?? null,
          createdAt: appUser.createdAt.toISOString(),
        }
      : null,
  });
}
