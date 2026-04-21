import { NextResponse } from "next/server";

import { loadChildForUser } from "@/lib/load-child-for-user";
import { buildGradeReadinessHub } from "@/lib/parenting-hubs";
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

  return NextResponse.json(
    buildGradeReadinessHub(loaded.childId, loaded.child.name, loaded.child.date_of_birth),
    { headers: correlationHeaders(requestId) }
  );
}
