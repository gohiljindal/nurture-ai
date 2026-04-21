import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import {
  getAllergenStatus,
  getFeedingGuidance,
  getFeedingStages,
  getSolidsReadiness,
  type FeedingStage,
} from "@/lib/feeding-engine";
import { ALLERGEN_INTRO_CHECKLIST } from "@/lib/allergen-checklist-cps";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { getCorrectedAgeMonths } from "@/lib/milestone-engine";
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

/** Map corrected age in months to `getFeedingStages()` index (0–4). */
function feedingStageIndex(ageMonths: number): number {
  const a = Math.max(0, ageMonths);
  if (a < 6) return 0;
  if (a < 7) return 0;
  if (a < 9) return 1;
  if (a < 12) return 2;
  if (a < 18) return 3;
  return 4;
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

  const supabase = await createClientForRequest(request);

  const { data: introRows, error: introError } = await supabase
    .from("allergen_introductions")
    .select("allergen, introduced_at")
    .eq("child_id", resolvedChildId);

  if (introError && !isMissingTableError(introError, "allergen_introductions")) {
    console.error(`[feeding guidance GET ${requestId}]`, introError);
    return NextResponse.json(
      { error: "Could not load allergen introductions." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const introductions = ((introError ? [] : introRows) ?? []).map((r) => ({
    allergen: String((r as { allergen: string }).allergen),
    introduced_at:
      (r as { introduced_at: string | null }).introduced_at != null
        ? String((r as { introduced_at: string | null }).introduced_at).slice(0, 10)
        : null,
  }));

  const all_stages = getFeedingStages();
  const idx = feedingStageIndex(ageMonths);
  const current_stage: FeedingStage = all_stages[idx] ?? all_stages[all_stages.length - 1];

  return NextResponse.json(
    {
      child: {
        id: resolvedChildId,
        name: child.name,
        age_months: ageMonths,
      },
      guidance: getFeedingGuidance(ageMonths, "breastfeeding"),
      solids_readiness: getSolidsReadiness(ageMonths),
      allergen_status: getAllergenStatus(introductions, ageMonths),
      allergen_introduction_checklist: ALLERGEN_INTRO_CHECKLIST,
      current_stage,
      all_stages,
    },
    { headers: correlationHeaders(requestId) }
  );
}
