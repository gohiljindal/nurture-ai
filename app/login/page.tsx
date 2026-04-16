import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="nurture-page flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border p-8 text-center text-gray-600">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
