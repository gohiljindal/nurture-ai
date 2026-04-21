import { NextResponse } from "next/server";

import { loadChildForUser } from "@/lib/load-child-for-user";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { createClientForRequest } from "@/lib/supabase/for-request";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ childId: string }> };

type PatchBody = {
  dental_due?: boolean;
  hearing_concern?: boolean;
  vision_concern?: boolean;
  notes?: string | null;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.message }, { status: loaded.status, headers: correlationHeaders(requestId) });
  }

  const supabase = await createClientForRequest(request);
  const { data: row } = await supabase
    .from("child_health_flags")
    .select("dental_due, hearing_concern, vision_concern, notes")
    .eq("child_id", loaded.childId)
    .maybeSingle();
  return NextResponse.json(
    {
      child: { id: loaded.childId, name: loaded.child.name },
      flags: {
        dental_due: row?.dental_due ?? false,
        hearing_concern: row?.hearing_concern ?? false,
        vision_concern: row?.vision_concern ?? false,
        notes: row?.notes ?? null,
      },
    },
    { headers: correlationHeaders(requestId) }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.message }, { status: loaded.status, headers: correlationHeaders(requestId) });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: correlationHeaders(requestId) });
  }

  const supabase = await createClientForRequest(request);
  const upsertPayload: Record<string, unknown> = {
    child_id: loaded.childId,
  };
  if (typeof body.dental_due === "boolean") upsertPayload.dental_due = body.dental_due;
  if (typeof body.hearing_concern === "boolean") upsertPayload.hearing_concern = body.hearing_concern;
  if (typeof body.vision_concern === "boolean") upsertPayload.vision_concern = body.vision_concern;
  if (body.notes !== undefined) upsertPayload.notes = body.notes != null ? String(body.notes) : null;

  const { data: row, error } = await supabase
    .from("child_health_flags")
    .upsert(upsertPayload, { onConflict: "child_id" })
    .select("dental_due, hearing_concern, vision_concern, notes")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not save child checks." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    {
      flags: {
        dental_due: row.dental_due,
        hearing_concern: row.hearing_concern,
        vision_concern: row.vision_concern,
        notes: row.notes,
      },
    },
    { headers: correlationHeaders(requestId) }
  );
}
