/**
 * MVP observability for symptom API routes — structured JSON logs, no PII.
 * Logs: requestId, route, phase, durationMs, httpStatus, urgency, decisionSource, errorCode, path.
 * Never log symptom text, child names, or raw user identifiers.
 */

export type SymptomRouteName = "symptom-followup" | "symptom-final";

export type SymptomWorkflowOutcome = {
  httpStatus: number;
  /** Triage urgency when applicable */
  urgency?: string | null;
  /** decision_source when applicable */
  decisionSource?: string | null;
  /** Safety rule id when decision_source is safety_rule (no PII) */
  ruleReason?: string | null;
  /** Stable machine-readable reason (e.g. validation_failed, rate_limited) */
  errorCode?: string | null;
  /** Branch name for metrics (e.g. safety_shortcircuit, followup_questions_ai) */
  path?: string | null;
};

function logStart(requestId: string, route: SymptomRouteName): void {
  console.info(
    JSON.stringify({
      scope: "symptom_workflow",
      phase: "start",
      route,
      requestId,
      ts: new Date().toISOString(),
    })
  );
}

function logEnd(
  requestId: string,
  route: SymptomRouteName,
  durationMs: number,
  outcome: SymptomWorkflowOutcome
): void {
  const line = {
    scope: "symptom_workflow",
    phase: "end",
    route,
    requestId,
    durationMs,
    httpStatus: outcome.httpStatus,
    urgency: outcome.urgency ?? null,
    decisionSource: outcome.decisionSource ?? null,
    ruleReason: outcome.ruleReason ?? null,
    errorCode: outcome.errorCode ?? null,
    path: outcome.path ?? null,
    ts: new Date().toISOString(),
  };

  if (outcome.httpStatus >= 500) {
    console.error(JSON.stringify(line));
  } else if (outcome.httpStatus >= 400) {
    console.warn(JSON.stringify(line));
  } else {
    console.info(JSON.stringify(line));
  }
}

/**
 * Call once at the start of POST; call `set()` before every return and `end()` in `finally`.
 */
export function createSymptomWorkflowObserver(requestId: string, route: SymptomRouteName) {
  const t0 = performance.now();
  logStart(requestId, route);

  let outcome: SymptomWorkflowOutcome = {
    httpStatus: 500,
    urgency: null,
    decisionSource: null,
    ruleReason: null,
    errorCode: null,
    path: null,
  };

  return {
    set(patch: Partial<SymptomWorkflowOutcome>) {
      outcome = { ...outcome, ...patch };
    },
    end() {
      logEnd(requestId, route, Math.round(performance.now() - t0), outcome);
    },
  };
}
