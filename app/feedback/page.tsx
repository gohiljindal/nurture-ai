import Link from "next/link";

export default function FeedbackPage() {
  const external = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() || "";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";
  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="nurture-page mx-auto max-w-lg">
      <div className="nurture-card">
        <h1 className="text-2xl text-slate-900">Feedback</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Found something confusing, wrong, or unclear? Tell us—your notes directly shape what we fix
          next.
        </p>

        <div className="mt-8 space-y-4">
          {external ? (
            <a
              href={external}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-nurture-primary inline-flex px-6 py-2.5"
            >
              Open feedback form
            </a>
          ) : supportEmail ? (
            <a
              href={`mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent("NurtureAI feedback")}`}
              className="btn-nurture-primary inline-flex px-6 py-2.5"
            >
              Email us
            </a>
          ) : (
            <p className="text-sm text-slate-600">
              We&apos;re not showing a form or inbox link on this deployment yet. If you need help,
              contact your care team or local health line for medical concerns.
            </p>
          )}

          {supportEmail && external ? (
            <p className="text-sm text-slate-600">
              Or email{" "}
              <a
                className="nurture-text-link"
                href={`mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent("NurtureAI feedback")}`}
              >
                {supportEmail}
              </a>
              .
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
        <Link href="/dashboard" className="nurture-text-link">
          Dashboard
        </Link>
        <Link href="/" className="nurture-text-link">
          Home
        </Link>
      </div>

      {isDev ? (
        <p className="mt-6 text-center text-xs text-slate-400">Development build</p>
      ) : null}
    </main>
  );
}
