"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CareActions from "@/components/care-actions";
import ModelAssistNote from "@/components/model-assist-note";
import ResultHelpfulFeedback from "@/components/result-helpful-feedback";
import UrgencyResultHero from "@/components/urgency-result-hero";
import { createClient } from "@/lib/supabase/client";
import type { SymptomTriageApiPayload, SymptomTriageResult } from "@/lib/symptom-triage-result";
import { urgencyBadgeClass, urgencyDisplayLabel } from "@/lib/urgency-ui";

type Child = {
  id: string;
  name: string;
  date_of_birth: string;
  sex_at_birth: string | null;
  is_premature: boolean;
  gestational_age_weeks: number | null;
};

type FollowupResponse = {
  questions: string[];
  decision_source?: "safety_rule" | "ai";
  rule_reason?: string | null;
  checkId?: string;
};

const FOLLOWUP_FETCH_TIMEOUT_MS = 18_000;
const FINAL_FETCH_TIMEOUT_MS = 20_000;
const PREPARING_TO_ASKING_MS = 2_000;

function AlertError({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      {children}
    </p>
  );
}

/** Maps API status codes to friendly copy for symptom routes (Task 1: authenticated APIs). */
function symptomApiErrorMessage(
  status: number,
  fallback: string,
  body?: { error?: string }
) {
  if (status === 401) {
    return "Your session expired or you are not signed in. Please sign in again.";
  }
  if (status === 404) {
    return (
      body?.error ||
      "We could not find that child on your account. Go back to the dashboard and try again."
    );
  }
  return body?.error || fallback;
}

export default function CheckSymptomPage() {
  const supabase = createClient();

  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [symptomText, setSymptomText] = useState("");
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupAnswers, setFollowupAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SymptomTriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    null | "preparing" | "asking" | "guidance"
  >(null);
  const followupFetchActiveRef = useRef(false);
  const phaseLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] = useState<"initial" | "followup" | "result">("initial");
  const [message, setMessage] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [savedCheckId, setSavedCheckId] = useState<string | null>(null);

  useEffect(() => {
    const loadChildren = async () => {
      const res = await fetch("/api/children", { credentials: "include" });
      const json = (await res.json()) as {
        children?: Child[];
        error?: string;
      };

      if (!res.ok) {
        setMessage(json.error ?? "Could not load children.");
        setChildrenLoaded(true);
        return;
      }

      const data = json.children ?? [];
      setChildren(data);
      if (data.length > 0) {
        setSelectedChildId(data[0].id);
      }
      setChildrenLoaded(true);
    };

    void loadChildren();
  }, []);

  const selectedChild = children.find((child) => child.id === selectedChildId);

  const clearPhaseLabelTimer = () => {
    if (phaseLabelTimerRef.current) {
      clearTimeout(phaseLabelTimerRef.current);
      phaseLabelTimerRef.current = null;
    }
  };

  const handleGetFollowups = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingPhase("preparing");
    setMessage("");
    setResult(null);
    setSavedCheckId(null);

    if (!disclaimerAccepted) {
      setLoading(false);
      setLoadingPhase(null);
      setMessage("Please accept the disclaimer before continuing.");
      return;
    }

    if (!selectedChild) {
      setLoading(false);
      setLoadingPhase(null);
      setMessage("Please select a child.");
      return;
    }

    if (symptomText.trim().length < 5) {
      setLoading(false);
      setLoadingPhase(null);
      setMessage("Please add a few more words about what you are seeing.");
      return;
    }

    followupFetchActiveRef.current = true;
    clearPhaseLabelTimer();
    phaseLabelTimerRef.current = setTimeout(() => {
      if (followupFetchActiveRef.current) {
        setLoadingPhase("asking");
      }
    }, PREPARING_TO_ASKING_MS);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FOLLOWUP_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch("/api/symptom-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          childId: selectedChild.id,
          symptomText,
          disclaimerAccepted,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: FollowupResponse | SymptomTriageApiPayload | { error?: string };
      try {
        data = (await response.json()) as
          | FollowupResponse
          | SymptomTriageApiPayload
          | { error?: string };
      } catch {
        setMessage("Could not read the server response. Please try again.");
        return;
      }

      if (!response.ok) {
        setMessage(
          symptomApiErrorMessage(
            response.status,
            "Could not prepare follow-up questions.",
            data as { error?: string }
          )
        );
        return;
      }

      if ("urgency" in data && "summary" in data) {
        const triage = data as SymptomTriageApiPayload;
        const { checkId, ...rest } = triage;
        setResult(rest);
        if (checkId) setSavedCheckId(checkId);
        setStage("result");
        return;
      }

      if (!("questions" in data)) {
        setMessage("Something went wrong preparing questions. Please try again.");
        return;
      }

      const followup = data as FollowupResponse;
      setFollowupQuestions(followup.questions || []);
      const initialAnswers: Record<string, string> = {};
      (followup.questions || []).forEach((q) => {
        initialAnswers[q] = "";
      });
      setFollowupAnswers(initialAnswers);
      setStage("followup");
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        setMessage("That took too long. Please try again.");
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      followupFetchActiveRef.current = false;
      clearPhaseLabelTimer();
      setLoading(false);
      setLoadingPhase(null);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingPhase("guidance");
    setMessage("");
    setResult(null);
    setSavedCheckId(null);

    if (!selectedChild) {
      setLoading(false);
      setLoadingPhase(null);
      setMessage("Please select a child.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setLoadingPhase(null);
      setMessage("You must be logged in.");
      return;
    }

    const formattedAnswers = followupQuestions.map((question) => ({
      question,
      answer: followupAnswers[question] || "",
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FINAL_FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("/api/symptom-final", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          childId: selectedChild.id,
          symptomText,
          followupAnswers: formattedAnswers,
          disclaimerAccepted,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadingPhase(null);
      if (error instanceof Error && error.name === "AbortError") {
        setMessage("That took too long. Please try again.");
      } else {
        setMessage("Something went wrong. Please try again.");
      }
      return;
    }

    clearTimeout(timeoutId);

    let data: SymptomTriageApiPayload & { error?: string };
    try {
      data = (await response.json()) as SymptomTriageApiPayload & { error?: string };
    } catch {
      setLoading(false);
      setLoadingPhase(null);
      setMessage("Could not read the server response. Please try again.");
      return;
    }

    if (!response.ok) {
      setLoading(false);
      setLoadingPhase(null);
      setMessage(
        symptomApiErrorMessage(
          response.status,
          "Could not complete this check. Please try again.",
          data
        )
      );
      return;
    }

    const { checkId, ...rest } = data;
    setResult(rest);
    if (checkId) setSavedCheckId(checkId);
    setStage("result");
    setLoading(false);
    setLoadingPhase(null);
  };

  const initialSubmitLabel =
    loading && loadingPhase !== "guidance"
      ? loadingPhase === "asking"
        ? "Working on questions…"
        : "Preparing…"
      : "Continue";

  const finalSubmitLabel =
    loading && loadingPhase === "guidance" ? "Getting guidance…" : "Get guidance";

  return (
    <main className="nurture-page mx-auto max-w-xl pb-20">
      <div className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Symptom check
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Describe what you are seeing
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          This is general guidance, not a diagnosis. If you believe it is an emergency, call
          emergency services now.
        </p>
      </div>

      {!childrenLoaded ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          Loading…
        </div>
      ) : children.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Add a child to continue</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            We use your child&apos;s age to tailor safety checks and guidance.
          </p>
          <Link
            href="/add-child"
            className="btn-nurture-primary-lg mt-6 max-w-xs"
          >
            👶 Add a child
          </Link>
          <p className="mt-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 underline">
              ⬅️ Back to dashboard
            </Link>
          </p>
        </section>
      ) : (
        <>
          {stage === "initial" && (
            <form
              onSubmit={handleGetFollowups}
              aria-busy={loading}
              className="nurture-card space-y-6"
            >
              <div>
                <label
                  htmlFor="symptom-child"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Which child is this about?
                </label>
                <select
                  id="symptom-child"
                  className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  required
                >
                  <option value="">Select a child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="symptom-detail"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  What is going on?
                </label>
                <textarea
                  id="symptom-detail"
                  className="min-h-[11rem] w-full resize-y rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Example: 6-month-old, fever 38.7°C since this evening, mild cough. Drinking OK."
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  required
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-gray-500">
                  A few sentences help. You can edit before you continue.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="mt-1 size-4 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    required
                  />
                  <span className="text-sm leading-relaxed text-gray-800">
                    I understand this tool gives general guidance only. It does not replace a
                    doctor, emergency services, or in-person care.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-nurture-primary-lg flex w-full disabled:opacity-50"
              >
                {loading ? initialSubmitLabel : "➡️ Continue"}
              </button>

              {message ? <AlertError>{message}</AlertError> : null}
            </form>
          )}

          {stage === "followup" && (
            <form
              onSubmit={handleFinalSubmit}
              aria-busy={loading}
              className="nurture-card space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900">A few quick questions</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Short answers help us suggest safer next steps. This is still not a diagnosis.
                </p>
              </div>

              {followupQuestions.map((question) => (
                <div key={question}>
                  <label className="mb-2 block text-sm font-medium text-gray-900">{question}</label>
                  <input
                    className="min-h-12 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    value={followupAnswers[question] || ""}
                    onChange={(e) =>
                      setFollowupAnswers((prev) => ({
                        ...prev,
                        [question]: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              ))}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    setStage("initial");
                  }}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50 sm:w-1/3"
                >
                  ⬅️ Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-nurture-primary-lg flex w-full flex-1 disabled:opacity-50"
                >
                  {loading && loadingPhase === "guidance" ? finalSubmitLabel : "✅ Get guidance"}
                </button>
              </div>

              {message ? <AlertError>{message}</AlertError> : null}
            </form>
          )}

          {stage === "result" && result && (
            <section className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                    Your guidance summary
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    For {selectedChild?.name ?? "your child"}. Not a medical diagnosis.
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${urgencyBadgeClass(result.urgency)}`}
                >
                  {urgencyDisplayLabel(result.urgency)}
                </span>
              </div>

              <UrgencyResultHero urgency={result.urgency} />

              {savedCheckId ? (
                <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-medium text-violet-950">
                    This check is saved to your account.
                  </p>
                  <Link
                    href={`/check/${savedCheckId}`}
                    className="btn-nurture-primary mt-3 inline-flex min-h-11 w-full sm:w-auto"
                  >
                  📄 Open saved check
                  </Link>
                </div>
              ) : null}

              {result.decision_source === "safety_rule" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
                  <p className="font-medium">Safety check</p>
                  <p className="mt-1">
                    We escalated this using built-in rules (not a diagnosis). If you are unsure,
                    seek in-person care.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border-2 border-gray-900 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Recommended next step
                </p>
                <p className="mt-2 text-base font-medium leading-relaxed text-gray-900">
                  {result.recommended_action}
                </p>
              </div>

              {(result.urgency === "emergency" || result.urgency === "urgent_doctor") && (
                <CareActions urgency={result.urgency} />
              )}

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Summary
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-800">{result.summary}</p>
              </div>

              <ModelAssistNote confidence={result.confidence} reasoning={result.reasoning} />

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Watch for
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
                  {result.red_flags.map((flag, index) => (
                    <li key={index}>{flag}</li>
                  ))}
                </ul>
              </div>

              {result.urgency === "monitor_home" && <CareActions urgency={result.urgency} />}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                <p className="font-semibold text-amber-950">Disclaimer</p>
                <p className="mt-2">{result.disclaimer}</p>
                <p className="mt-3 text-amber-900/90">
                  When in doubt, contact your clinician or seek urgent or emergency care.
                </p>
              </div>

              {savedCheckId ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <ResultHelpfulFeedback checkId={savedCheckId} />
                </div>
              ) : null}

              {message ? <AlertError>{message}</AlertError> : null}

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStage("initial");
                    setResult(null);
                    setFollowupQuestions([]);
                    setFollowupAnswers({});
                    setSymptomText("");
                    setDisclaimerAccepted(false);
                    setMessage("");
                    setSavedCheckId(null);
                  }}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  🔄 Start another check
                </button>
                <Link
                  href="/history"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  📈 View history
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 text-base font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
                >
                  🏠 Dashboard
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
