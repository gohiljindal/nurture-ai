/**
 * Task 4 — Supabase Auth: public URL + anon key (safe to expose in the browser).
 * Set both in `.env.local` from your Supabase project → Settings → API.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy `.env.example` to `.env.local`, add your Supabase Project URL and anon key, then restart `npm run dev`."
    );
  }

  return { url, anonKey };
}
