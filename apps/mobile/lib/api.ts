import { supabase } from "./supabase";
import type {
  ApiResult,
  CheckDetail,
  Child,
  CreateChildInput,
  FeedingGuidanceResponse,
  FollowupAnswer,
  GrowthGetResponse,
  HistoryCheck,
  MeResponse,
  MilestonesResponse,
  SleepGuidanceResponse,
  SymptomFollowupResult,
  SymptomTriageResult,
  TodayInsightResponse,
  VaccinesApiResponse,
  VisitPrepApiResponse,
  ParentingHubResponse,
  ChildChecksResponse,
  TimelineResponse,
} from "./types";

// ─── Core fetch ───────────────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  // Prefer 127.0.0.1 over "localhost" on Windows — some setups resolve localhost to IPv6 first and stall.
  const base = process.env.EXPO_PUBLIC_API_URL?.trim() || "http://127.0.0.1:3000";
  return base.replace(/\/$/, "");
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${fullPath}`;

  const timeoutMs = 90_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      const base = getApiBaseUrl();
      throw new Error(
        `Request timed out after ${timeoutMs / 1000}s (${base}). Open ${base}/api/health in a browser — if that fails, run "npm run dev" in the nurtureai folder. If health is OK but other calls hang, PostgreSQL is probably unreachable: start Docker/local DB, check DATABASE_URL in nurtureai/.env, and add connect_timeout=15 to the URL so failures surface faster.`
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      const base = getApiBaseUrl();
      throw new Error(
        `Could not reach ${url} (API base: ${base}). From the nurtureai folder run: npm run dev — then reload the app. If you changed EXPO_PUBLIC_API_URL, restart Expo.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseJson<T>(res: Response): Promise<ApiResult<T>> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: `HTTP ${res.status}: unexpected response format` };
  }
  if (!res.ok) {
    const msg = (body as { error?: string })?.error ?? `Request failed (${res.status})`;
    return { ok: false, error: msg };
  }
  return { ok: true, data: body as T };
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

/** Call once after sign-in to create / update the Prisma user row. */
export async function syncAppUser(): Promise<ApiResult<{ ok: boolean }>> {
  const res = await apiFetch("/api/auth/sync-app-user", { method: "POST" });
  return parseJson(res);
}

/** Probe: confirm auth token is valid and return auth + app user info. */
export async function getMe(): Promise<ApiResult<MeResponse>> {
  const res = await apiFetch("/api/me");
  return parseJson(res);
}

// ─── Children ─────────────────────────────────────────────────────────────────

export async function listChildren(): Promise<ApiResult<{ children: Child[] }>> {
  const res = await apiFetch("/api/children");
  return parseJson(res);
}

export async function createChild(
  input: CreateChildInput
): Promise<ApiResult<{ id: string }>> {
  const res = await apiFetch("/api/children", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function deleteChild(childId: string): Promise<ApiResult<{ ok: boolean }>> {
  const res = await apiFetch(`/api/children/${childId}`, { method: "DELETE" });
  return parseJson(res);
}

export async function updateChildPhoto(
  childId: string,
  photoUrl: string | null
): Promise<ApiResult<{ ok: boolean }>> {
  const res = await apiFetch(`/api/children/${childId}`, {
    method: "PATCH",
    body: JSON.stringify({ photo_url: photoUrl }),
  });
  return parseJson(res);
}

// ─── Symptom workflow ─────────────────────────────────────────────────────────

/**
 * Step 1 — start the symptom flow.
 * Returns either:
 *   { type: "immediate" } — safety rule triggered; show the triage result now
 *   { type: "questions" } — AI returned 3 follow-up questions to ask the parent
 */
export async function startSymptomFollowup(params: {
  childId: string;
  symptomText: string;
  disclaimerAccepted: boolean;
}): Promise<ApiResult<SymptomFollowupResult>> {
  const res = await apiFetch("/api/symptom-followup", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const result = await parseJson<Record<string, unknown>>(res);
  if (!result.ok) return result;

  const data = result.data;

  // Safety short-circuit: urgency is present → immediate triage result
  if (typeof data.urgency === "string" && typeof data.checkId === "string") {
    return {
      ok: true,
      data: {
        type: "immediate",
        triage: data as unknown as SymptomTriageResult,
        checkId: data.checkId as string,
      },
    };
  }

  // AI path: questions array
  return {
    ok: true,
    data: {
      type: "questions",
      questions: Array.isArray(data.questions) ? (data.questions as string[]) : [],
    },
  };
}

/**
 * Step 2 — submit follow-up answers and get the final triage result.
 */
export async function submitSymptomFinal(params: {
  childId: string;
  symptomText: string;
  followupAnswers: FollowupAnswer[];
  disclaimerAccepted: boolean;
}): Promise<ApiResult<SymptomTriageResult & { checkId: string }>> {
  const res = await apiFetch("/api/symptom-final", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return parseJson(res);
}

/** Submit thumbs up / down feedback on a completed symptom check. */
export async function submitSymptomFeedback(params: {
  checkId: string;
  helpful: boolean;
}): Promise<ApiResult<{ ok: boolean }>> {
  const res = await apiFetch("/api/symptom-feedback", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return parseJson(res);
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function listSymptomHistory(): Promise<
  ApiResult<{ checks: HistoryCheck[] }>
> {
  const res = await apiFetch("/api/symptom-checks");
  return parseJson(res);
}

export async function getSymptomCheck(
  checkId: string
): Promise<ApiResult<{ check: CheckDetail }>> {
  const res = await apiFetch(`/api/symptom-checks/${checkId}`);
  return parseJson(res);
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function getMilestones(
  childId: string
): Promise<ApiResult<MilestonesResponse>> {
  const res = await apiFetch(`/api/milestones/${childId}`);
  return parseJson(res);
}

// ─── Vaccines ─────────────────────────────────────────────────────────────────

export async function getVaccines(
  childId: string
): Promise<ApiResult<VaccinesApiResponse>> {
  const res = await apiFetch(`/api/vaccines/${childId}`);
  return parseJson(res);
}

/** Set province code (ON, BC, …) for vaccine schedule. */
export async function updateChildProvince(
  childId: string,
  province: string
): Promise<ApiResult<{ updated: boolean; province: string }>> {
  const res = await apiFetch(`/api/vaccines/${childId}/province`, {
    method: "PATCH",
    body: JSON.stringify({ province }),
  });
  return parseJson(res);
}

// ─── Growth ───────────────────────────────────────────────────────────────────

export async function getGrowth(
  childId: string
): Promise<ApiResult<GrowthGetResponse>> {
  const res = await apiFetch(`/api/growth/${childId}`);
  return parseJson(res);
}

export async function addGrowthMeasurement(
  childId: string,
  body: {
    measured_at: string;
    weight_kg?: number | null;
    height_cm?: number | null;
    head_cm?: number | null;
    notes?: string | null;
  }
): Promise<ApiResult<{ measurement: unknown; percentiles: unknown }>> {
  const res = await apiFetch(`/api/growth/${childId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

// ─── Feeding / Sleep ──────────────────────────────────────────────────────────

export async function getFeedingGuidance(
  childId: string
): Promise<ApiResult<FeedingGuidanceResponse>> {
  const res = await apiFetch(`/api/feeding/guidance/${childId}`);
  return parseJson(res);
}

export async function getSleepGuidance(
  childId: string
): Promise<ApiResult<SleepGuidanceResponse>> {
  const res = await apiFetch(`/api/sleep/guidance/${childId}`);
  return parseJson(res);
}

// ─── Insights / visit prep (tasks 27–28) ─────────────────────────────────────

export async function getTodayInsight(
  childId: string
): Promise<ApiResult<TodayInsightResponse>> {
  const q = new URLSearchParams({ childId });
  const res = await apiFetch(`/api/insights/today?${q.toString()}`);
  return parseJson(res);
}

export async function getVisitPrep(
  childId: string
): Promise<ApiResult<VisitPrepApiResponse>> {
  const res = await apiFetch(`/api/visit-prep/${childId}`);
  return parseJson(res);
}

export async function getToddlerBehavior(
  childId: string
): Promise<ApiResult<ParentingHubResponse>> {
  const res = await apiFetch(`/api/toddler/behavior/${childId}`);
  return parseJson(res);
}

export async function getPottyReadiness(
  childId: string
): Promise<ApiResult<ParentingHubResponse>> {
  const res = await apiFetch(`/api/potty-readiness/${childId}`);
  return parseJson(res);
}

export async function getScreenTimeGuidance(
  childId: string
): Promise<ApiResult<ParentingHubResponse>> {
  const res = await apiFetch(`/api/screen-time/${childId}`);
  return parseJson(res);
}

export async function getPreschoolSocial(
  childId: string
): Promise<ApiResult<ParentingHubResponse>> {
  const res = await apiFetch(`/api/preschool-social/${childId}`);
  return parseJson(res);
}

export async function getGradeReadiness(
  childId: string
): Promise<ApiResult<ParentingHubResponse>> {
  const res = await apiFetch(`/api/grade-readiness/${childId}`);
  return parseJson(res);
}

export async function getIepAwareness(
  childId: string
): Promise<ApiResult<ParentingHubResponse>> {
  const res = await apiFetch(`/api/iep-awareness/${childId}`);
  return parseJson(res);
}

export async function getChildChecks(
  childId: string
): Promise<ApiResult<ChildChecksResponse>> {
  const res = await apiFetch(`/api/child-checks/${childId}`);
  return parseJson(res);
}

export async function updateChildChecks(
  childId: string,
  body: Partial<ChildChecksResponse["flags"]>
): Promise<ApiResult<{ flags: ChildChecksResponse["flags"] }>> {
  const res = await apiFetch(`/api/child-checks/${childId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function getTimeline(
  childId: string
): Promise<ApiResult<TimelineResponse>> {
  const res = await apiFetch(`/api/timeline/${childId}`);
  return parseJson(res);
}
