"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  };

  return (
    <form
      onSubmit={handleLogin}
      className="nurture-card w-full max-w-md space-y-4"
    >
      <h1 className="text-2xl text-slate-900">Log in</h1>

      {registered ? (
        <p className="rounded-2xl border border-violet-200/80 bg-violet-50 px-3 py-2 text-sm text-violet-950">
          Account created. Log in with the email and password you used.
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        No account?{" "}
        <Link href="/signup" className="nurture-text-link">
          Create one
        </Link>
      </p>

      <div>
        <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-800">
          Email
        </label>
        <input
          id="login-email"
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
          htmlFor="login-password"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="nurture-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-nurture-primary w-full py-3 disabled:opacity-50"
      >
        {loading ? "Logging in…" : "Log in"}
      </button>

      {message ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
