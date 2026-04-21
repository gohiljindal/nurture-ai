import { NextResponse } from "next/server";

import { loadChildForUser } from "@/lib/load-child-for-user";
import { buildIepAwarenessHub } from "@/lib/parenting-hubs";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ childId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;
  const url = new URL(request.url);

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const region = url.searchParams.get("region")?.toUpperCase() === "US" ? "US" : "CA";
  return NextResponse.json(
    buildIepAwarenessHub(loaded.childId, loaded.child.name, loaded.child.date_of_birth, region),
    { headers: correlationHeaders(requestId) }
  );
}
