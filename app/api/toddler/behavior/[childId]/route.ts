import { NextResponse } from "next/server";

import { calculateAgeInMonths } from "@/lib/child-age";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { buildToddlerBehaviorHub } from "@/lib/parenting-hubs";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ childId: string }> };

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

  const ageMonths = calculateAgeInMonths(loaded.child.date_of_birth);
  if (ageMonths < 12) {
    return NextResponse.json(
      { error: "Toddler behavior content starts around 12 months." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    buildToddlerBehaviorHub(loaded.childId, loaded.child.name, loaded.child.date_of_birth),
    { headers: correlationHeaders(requestId) }
  );
}
