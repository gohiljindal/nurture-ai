/**
 * Task 4 — Supabase Auth: public URL + anon key (safe to expose in the browser).
 * Set both in `.env.local` from your Supabase project → Settings → API.
 *
 * Production / `next build`: if vars are missing (e.g. CI or Vercel not configured yet),
 * return placeholders so prerender does not crash. Configure NEXT_PUBLIC_* in the host
 * for real auth; the app will not work against Supabase until those are set.
 */
const BUILD_FALLBACK_URL = "https://placeholder.supabase.co";
const BUILD_FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid-missing-public-supabase-env";

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (url && anonKey) {
    return { url, anonKey };
  }

  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy `.env.example` to `.env.local`, add your Supabase Project URL and anon key, then restart `npm run dev`."
    );
  }

  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — using placeholder for build/runtime. Add both in Vercel (or your host) Environment Variables."
  );

  return {
    url: url || BUILD_FALLBACK_URL,
    anonKey: anonKey || BUILD_FALLBACK_ANON_KEY,
  };
}
