"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }

    router.push("/login?registered=1");
    router.refresh();
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
