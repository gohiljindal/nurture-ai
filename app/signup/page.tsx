"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const toFriendlyAuthError = (value: unknown) => {
    const msg = value instanceof Error ? value.message : String(value ?? "");
    if (/failed to fetch|network request failed|networkerror|load failed/i.test(msg)) {
      return "Could not reach Supabase. In Vercel, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, redeploy, then try again.";
    }
    return msg || "Something went wrong. Please try again.";
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabasePublicEnvConfigured()) {
      setIsError(true);
      setMessage(
        "Supabase is not configured for this deployment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables, then redeploy."
      );
      return;
    }
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setIsError(true);
        setMessage(toFriendlyAuthError(error));
        return;
      }

      router.push("/login?registered=1");
      router.refresh();
    } catch (e) {
      setIsError(true);
      setMessage(toFriendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="nurture-page flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSignup}
        className="nurture-card w-full max-w-md space-y-4"
      >
        <p className="nurture-kicker">Account</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Create account</h1>
        <p className="text-sm text-slate-600">
          Already have one?{" "}
          <Link href="/login" className="nurture-text-link">
            Log in
          </Link>
        </p>

        <div>
          <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-slate-800">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            className="nurture-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            className="nurture-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">At least 6 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-nurture-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>

        {message ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              isError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-violet-200 bg-violet-50 text-violet-950"
            }`}
            role={isError ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}
