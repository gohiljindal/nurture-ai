import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="nurture-page flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <div className="nurture-card w-full max-w-md p-8 text-center text-slate-600">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
