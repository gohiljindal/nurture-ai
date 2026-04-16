import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { createClientForRequest } from "@/lib/supabase/for-request";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

const VALID_FEEDING_TYPES = new Set([
  "breast_left",
  "breast_right",
  "breast_both",
  "formula",
  "pumped",
  "solids",
  "water",
]);

type FeedingLogRow = {
  id: string;
  child_id: string;
  logged_at: string;
  feeding_type: string;
  duration_minutes: number | null;
  volume_ml: number | null;
  solid_foods: string | null;
  notes: string | null;
  created_at: string;
};

function toFeedingLogRow(r: Record<string, unknown>): FeedingLogRow {
  return {
    id: String(r.id),
    child_id: String(r.child_id),
    logged_at: String(r.logged_at),
    feeding_type: String(r.feeding_type),
    duration_minutes:
      r.duration_minutes != null && Number.isFinite(Number(r.duration_minutes))
        ? Number(r.duration_minutes)
        : null,
    volume_ml:
      r.volume_ml != null && Number.isFinite(Number(r.volume_ml))
        ? Number(r.volume_ml)
        : null,
    solid_foods: r.solid_foods != null ? String(r.solid_foods) : null,
    notes: r.notes != null ? String(r.notes) : null,
    created_at: String(r.created_at),
  };
}

function parseOptionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
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

  const { childId: resolvedChildId } = loaded;

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const supabase = await createClientForRequest(request);

  const { data: rows, error } = await supabase
    .from("feeding_logs")
    .select("*")
    .eq("child_id", resolvedChildId)
    .gte("logged_at", sinceIso)
    .order("logged_at", { ascending: false });

  if (error) {
    console.error(`[feeding log GET ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not load feeding logs." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const logs = (rows ?? []).map((r) => toFeedingLogRow(r as Record<string, unknown>));

  return NextResponse.json({ logs }, { headers: correlationHeaders(requestId) });
}

type PostBody = {
  feeding_type?: string;
  logged_at?: string | null;
  duration_minutes?: number | null;
  volume_ml?: number | null;
  solid_foods?: string | null;
  notes?: string | null;
};

export async function POST(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId } = loaded;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const feeding_type =
    typeof body.feeding_type === "string" ? body.feeding_type.trim() : "";
  if (!feeding_type || !VALID_FEEDING_TYPES.has(feeding_type)) {
    return NextResponse.json(
      { error: "Missing or invalid feeding_type." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  let loggedAt: string | undefined;
  if (body.logged_at != null && String(body.logged_at).trim() !== "") {
    const t = Date.parse(String(body.logged_at));
    if (Number.isNaN(t)) {
      return NextResponse.json(
        { error: "Invalid logged_at (use an ISO date-time string)." },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }
    loggedAt = new Date(t).toISOString();
  }

  const supabase = await createClientForRequest(request);

  const insertPayload: Record<string, unknown> = {
    child_id: resolvedChildId,
    feeding_type,
    duration_minutes: parseOptionalInt(body.duration_minutes),
    volume_ml: parseOptionalInt(body.volume_ml),
    solid_foods:
      body.solid_foods != null && String(body.solid_foods).trim() !== ""
        ? String(body.solid_foods)
        : null,
    notes:
      body.notes != null && String(body.notes).trim() !== ""
        ? String(body.notes)
        : null,
  };

  if (loggedAt) {
    insertPayload.logged_at = loggedAt;
  }

  const { data: saved, error } = await supabase
    .from("feeding_logs")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !saved) {
    console.error(`[feeding log POST ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not save feeding log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    { log: toFeedingLogRow(saved as Record<string, unknown>) },
    { status: 201, headers: correlationHeaders(requestId) }
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const { childId } = await context.params;

  const loaded = await loadChildForUser(childId, request);
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.message },
      { status: loaded.status, headers: correlationHeaders(requestId) }
    );
  }

  const { childId: resolvedChildId } = loaded;

  const logId = new URL(request.url).searchParams.get("id");
  if (!logId || !logId.trim()) {
    return NextResponse.json(
      { error: "Missing id query parameter." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const supabase = await createClientForRequest(request);

  // Scope by this child (owned by the session user via loadChildForUser) so we never
  // delete another family’s log even if an id is guessed.
  const { data: existing, error: fetchError } = await supabase
    .from("feeding_logs")
    .select("id, child_id")
    .eq("id", logId.trim())
    .eq("child_id", resolvedChildId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[feeding log DELETE fetch ${requestId}]`, fetchError);
    return NextResponse.json(
      { error: "Could not verify feeding log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Feeding log not found for this child." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }

  const { error: delError } = await supabase
    .from("feeding_logs")
    .delete()
    .eq("id", logId.trim())
    .eq("child_id", resolvedChildId);

  if (delError) {
    console.error(`[feeding log DELETE ${requestId}]`, delError);
    return NextResponse.json(
      { error: "Could not delete feeding log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json({ deleted: true }, { headers: correlationHeaders(requestId) });
}
