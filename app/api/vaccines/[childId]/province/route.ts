import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { parseProvinceFromDb } from "@/lib/canada-vaccine-schedule";
import { updateChildProvinceForUser } from "@/lib/services/child-service";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId, userId } = loaded;

  let body: { province?: unknown };
  try {
    body = (await request.json()) as { province?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const province =
    typeof body.province === "string" ? parseProvinceFromDb(body.province) : null;
  if (province == null) {
    return NextResponse.json(
      { error: "province must be one of: ON, BC, AB, SK, MB, QC, NB, NS, PE, NL, YT, NT, NU." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const updated = await updateChildProvinceForUser(userId, resolvedChildId, province);
  if (!updated.ok) {
    console.error(`[vaccines PATCH province ${requestId}]`, updated.error);
    return NextResponse.json(
      { error: updated.error },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    { updated: true, province },
    { headers: correlationHeaders(requestId) }
  );
}
