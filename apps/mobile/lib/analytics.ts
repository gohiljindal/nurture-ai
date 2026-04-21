/**
 * Privacy-safe triage funnel events (task 25).
 * No child ids, symptom text, or raw PII — only coarse stage / urgency when provided.
 */

export type TriageAnalyticsPayload = {
  /** `LifeStageBucket` string from stage-engine */
  stage?: string;
  urgency?: string;
};

export function logTriageEvent(
  event: "triage_started" | "triage_completed",
  payload?: TriageAnalyticsPayload
): void {
  const line = JSON.stringify({
    scope: "triage_analytics",
    event,
    ...payload,
    ts: new Date().toISOString(),
  });
  if (__DEV__) {
    // eslint-disable-next-line no-console -- intentional dev-only analytics stub
    console.debug(line);
  }
}
