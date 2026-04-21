import { NextResponse } from "next/server";

import { getTodayInsight } from "@/lib/insights/today-insight";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { calculateAgeInMonths } from "@/lib/child-age";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

export const dynamic = "force-dynamic";

/**
 * GET ?childId= — today’s stage-based insight for home (task 27).
 */
export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const url = new URL(request.url);
  const childId = url.searchParams.get("childId")?.trim() ?? "";

  if (!childId) {
    return NextResponse.json(
      { error: "childId is required.", code: "validation_failed" },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message, code: "load_child_failed" },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { child } = loaded;
  const ageMonths = calculateAgeInMonths(child.date_of_birth);
  const insight = getTodayInsight(ageMonths, child.name);

  return NextResponse.json(
    { child_id: loaded.childId, insight },
    { headers: correlationHeaders(requestId) }
  );
}
