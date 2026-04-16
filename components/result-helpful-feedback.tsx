"use client";

import { useEffect, useState } from "react";

type Props = {
  checkId: string;
  /** Loaded from the server for this user (if they already submitted). */
  initialHelpful?: boolean | null;
};

export default function ResultHelpfulFeedback({ checkId, initialHelpful }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [choice, setChoice] = useState<boolean | null>(initialHelpful ?? null);

  useEffect(() => {
    setChoice(initialHelpful ?? null);
  }, [checkId, initialHelpful]);

  const submit = async (helpful: boolean) => {
    setStatus("saving");
    try {
      const res = await fetch("/api/symptom-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checkId, helpful }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setChoice(helpful);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="text-sm text-slate-600" role="status">
        Thanks—your feedback helps us improve.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-medium text-slate-900">Was this helpful?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={status === "saving"}
          aria-pressed={choice === true}
          onClick={() => submit(true)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            choice === true
              ? "border-violet-600 bg-violet-50 text-violet-950"
              : "border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          disabled={status === "saving"}
          aria-pressed={choice === false}
          onClick={() => submit(false)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            choice === false
              ? "border-violet-600 bg-violet-50 text-violet-950"
              : "border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          No
        </button>
      </div>
      {status === "error" ? (
        <p className="mt-2 text-sm text-red-600">Could not save. Try again in a moment.</p>
      ) : null}
    </div>
  );
}
