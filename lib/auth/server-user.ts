import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getServerUserIdFromRequest } from "@/lib/supabase/for-request";

export { getServerUserIdFromRequest };

/**
 * Returns the Supabase auth user id for the current cookie session, or `null` if signed out.
 * Use for **server components** only (no `Request`).
 */
export async function getServerUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Same as `getServerUserId`, but redirects to `/login` when there is no session.
 */
export async function requireServerUserId(): Promise<string> {
  const id = await getServerUserId();
  if (!id) redirect("/login");
  return id;
}
