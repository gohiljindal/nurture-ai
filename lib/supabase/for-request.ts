import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "./env";
import { createClient as createCookieClient } from "./server";

/**
 * Auth for Route Handlers: supports browser cookie sessions (web) and
 * `Authorization: Bearer <access_token>` (mobile / non-browser clients).
 */
export async function getAuthUserFromRequest(request: Request): Promise<User | null> {
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (bearer) {
    const { url, anonKey } = getSupabasePublicEnv();
    const supabase = createClient(url, anonKey);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearer);
    if (error || !user) return null;
    return user;
  }
  const supabase = await createCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getServerUserIdFromRequest(request: Request): Promise<string | null> {
  const user = await getAuthUserFromRequest(request);
  return user?.id ?? null;
}

/**
 * Supabase JS client for Route Handlers — use for `.from()` when RLS applies.
 * Prefer `getAuthUserFromRequest` when you only need the user id with Prisma.
 */
export async function createClientForRequest(request: Request): Promise<SupabaseClient> {
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (bearer) {
    const { url, anonKey } = getSupabasePublicEnv();
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${bearer}` },
      },
    });
  }
  return createCookieClient();
}
