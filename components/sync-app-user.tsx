"use client";

import { useEffect, useRef } from "react";

/**
 * Ensures the Prisma `users` row exists after login (local Postgres + Supabase auth).
 * Fails silently if the API returns non-OK (e.g. DB not running).
 */
export default function SyncAppUser() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void fetch("/api/auth/sync-app-user", { method: "POST", credentials: "include" });
  }, []);

  return null;
}
