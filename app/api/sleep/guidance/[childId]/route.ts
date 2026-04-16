import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { getCorrectedAgeMonths } from "@/lib/milestone-engine";
import {
  calculateSleepSummary,
  getMatchingSleepRegression,
  getNapSchedule,
  getSafeSleepChecklist,
  getSleepExpectations,
  isRegressionAge,
} from "@/lib/sleep-engine";
import { createClientForRequest } from "@/lib/supabase/for-request";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

function isMissingTableError(error: unknown, tableName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; message?: unknown };
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";
  return code === "PGRST205" && message.includes(`'public.${tableName}'`);
}

function todayLocalDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId, child } = loaded;

  const ageMonths = getCorrectedAgeMonths(
    child.date_of_birth,
    child.gestational_age_weeks ?? null,
    Boolean(child.is_premature)
  );

  const since = new Date();
  since.setDate(since.getDate() - 3);
  const sinceIso = since.toISOString();

  const supabase = await createClientForRequest(request);

  const { data: logRows, error: logError } = await supabase
    .from("sleep_logs")
    .select("sleep_start, sleep_end, sleep_type")
    .eq("child_id", resolvedChildId)
    .gte("sleep_start", sinceIso)
    .order("sleep_start", { ascending: false });

  if (logError && !isMissingTableError(logError, "sleep_logs")) {
    console.error(`[sleep guidance GET logs ${requestId}]`, logError);
    return NextResponse.json(
      { error: "Could not load sleep logs." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const logsForSummary = ((logError ? [] : logRows) ?? []).map((r) => ({
    sleep_start: String((r as { sleep_start: string }).sleep_start),
    sleep_end: (r as { sleep_end: string | null }).sleep_end ?? null,
    sleep_type: String((r as { sleep_type: string }).sleep_type),
  }));

  const { data: checklistRows, error: checklistError } = await supabase
    .from("safe_sleep_checklist")
    .select("item_code, completed")
    .eq("child_id", resolvedChildId)
    .eq("completed", true);

  if (checklistError && !isMissingTableError(checklistError, "safe_sleep_checklist")) {
    console.error(`[sleep guidance GET checklist ${requestId}]`, checklistError);
    return NextResponse.json(
      { error: "Could not load safe sleep checklist." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const completed_codes = ((checklistError ? [] : checklistRows) ?? [])
    .map((r) => String((r as { item_code: string }).item_code))
    .filter(Boolean);

  const regressionWindow = isRegressionAge(ageMonths);
  const current_regression = getMatchingSleepRegression(ageMonths);

  return NextResponse.json(
    {
      child: {
        id: resolvedChildId,
        name: child.name,
        age_months: ageMonths,
      },
      expectations: getSleepExpectations(ageMonths),
      nap_schedule: getNapSchedule(ageMonths),
      is_regression_age: regressionWindow,
      current_regression,
      safe_sleep_checklist: {
        items: getSafeSleepChecklist(),
        completed_codes,
      },
      recent_summary: calculateSleepSummary(logsForSummary, todayLocalDateStr()),
    },
    { headers: correlationHeaders(requestId) }
  );
}
