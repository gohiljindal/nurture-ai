import Link from "next/link";

export default function Home() {
  return (
    <main className="nurture-page flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-8 sm:px-6">
      <div className="w-full max-w-lg sm:max-w-2xl">
        <div className="nurture-hero text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700/90">
            NurtureAI
          </p>
          <h1 className="mt-3 text-3xl leading-tight text-slate-900 sm:text-4xl">
            Calmer decisions when your child seems unwell
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Safety-first guidance—not a diagnosis. Built for parents who need a clear next step in
            the first 1,000 days and beyond.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href="/signup" className="btn-nurture-primary-lg sm:min-w-[200px]">
              Create account
            </Link>
            <Link
              href="/login"
              className="btn-nurture-secondary inline-flex min-h-12 items-center justify-center sm:min-w-[200px]"
            >
              Log in
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Not a substitute for emergency services or your clinician.
        </p>
      </div>
    </main>
  );
}
