/**
 * In-memory store for the active symptom check session.
 *
 * Holds state across the 3-screen check flow:
 *   SymptomInput → FollowupQuestions → TriageResult
 *
 * Reset by calling clearCheckSession() when the flow ends or starts again.
 */

export type CheckSession = {
  childId: string;
  symptomText: string;
  questions: string[];
};

let _session: CheckSession | null = null;

export function setCheckSession(session: CheckSession): void {
  _session = session;
}

export function getCheckSession(): CheckSession | null {
  return _session;
}

export function clearCheckSession(): void {
  _session = null;
}
