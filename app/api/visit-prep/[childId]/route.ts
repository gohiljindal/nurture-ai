import { NextResponse } from "next/server";

import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { calculateAgeInMonths } from "@/lib/child-age";
import { getVisitPrepForAge } from "@/lib/visit-prep-templates";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ childId: string }> };

/** GET — visit-prep bullets by age + stage (task 28). */
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

  const { childId: resolvedId, child } = loaded;
  const ageMonths = calculateAgeInMonths(child.date_of_birth);
  const prep = getVisitPrepForAge(ageMonths);

  return NextResponse.json(
    {
      child: { id: resolvedId, name: child.name, age_months: ageMonths },
      ...prep,
    },
    { headers: correlationHeaders(requestId) }
  );
}
