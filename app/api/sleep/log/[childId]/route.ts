import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { loadChildForUser } from "@/lib/load-child-for-user";
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

const VALID_SLEEP_TYPES = new Set(["nap", "night", "unknown"]);

const VALID_LOCATIONS = new Set([
  "crib",
  "bassinet",
  "contact",
  "car",
  "stroller",
]);

type SleepLogRow = {
  id: string;
  child_id: string;
  sleep_start: string;
  sleep_end: string | null;
  sleep_type: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toSleepLogRow(r: Record<string, unknown>): SleepLogRow {
  return {
    id: String(r.id),
    child_id: String(r.child_id),
    sleep_start: String(r.sleep_start),
    sleep_end: r.sleep_end != null ? String(r.sleep_end) : null,
    sleep_type: String(r.sleep_type),
    location: r.location != null ? String(r.location) : null,
    notes: r.notes != null ? String(r.notes) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function parseIsoDateTime(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t);
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
    .from("sleep_logs")
    .select("*")
    .eq("child_id", resolvedChildId)
    .gte("sleep_start", sinceIso)
    .order("sleep_start", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "sleep_logs")) {
      return NextResponse.json({ logs: [] }, { headers: correlationHeaders(requestId) });
    }
    console.error(`[sleep log GET ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not load sleep logs." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const logs = (rows ?? []).map((r) => toSleepLogRow(r as Record<string, unknown>));

  return NextResponse.json({ logs }, { headers: correlationHeaders(requestId) });
}

type PostBody = {
  sleep_start?: string;
  sleep_end?: string | null;
  sleep_type?: string;
  location?: string | null;
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

  const sleepStart = parseIsoDateTime(body.sleep_start);
  if (!sleepStart) {
    return NextResponse.json(
      { error: "sleep_start is required and must be a valid date-time." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  let sleepEnd: Date | null = null;
  if (body.sleep_end != null && String(body.sleep_end).trim() !== "") {
    sleepEnd = parseIsoDateTime(body.sleep_end);
    if (!sleepEnd) {
      return NextResponse.json(
        { error: "sleep_end must be a valid date-time when provided." },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }
    if (sleepEnd.getTime() <= sleepStart.getTime()) {
      return NextResponse.json(
        { error: "sleep_end must be after sleep_start." },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }
  }

  const sleep_type =
    typeof body.sleep_type === "string" && body.sleep_type.trim()
      ? body.sleep_type.trim()
      : "nap";
  if (!VALID_SLEEP_TYPES.has(sleep_type)) {
    return NextResponse.json(
      { error: "Invalid sleep_type. Use nap, night, or unknown." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  let location: string | null = null;
  if (body.location != null && String(body.location).trim() !== "") {
    const loc = String(body.location).trim();
    if (!VALID_LOCATIONS.has(loc)) {
      return NextResponse.json(
        { error: "Invalid location." },
        { status: 400, headers: correlationHeaders(requestId) }
      );
    }
    location = loc;
  }

  const supabase = await createClientForRequest(request);

  const { data: saved, error } = await supabase
    .from("sleep_logs")
    .insert({
      child_id: resolvedChildId,
      sleep_start: sleepStart.toISOString(),
      sleep_end: sleepEnd ? sleepEnd.toISOString() : null,
      sleep_type,
      location,
      notes:
        body.notes != null && String(body.notes).trim() !== ""
          ? String(body.notes)
          : null,
    })
    .select()
    .single();

  if (error || !saved) {
    console.error(`[sleep log POST ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not save sleep log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    { log: toSleepLogRow(saved as Record<string, unknown>) },
    { status: 201, headers: correlationHeaders(requestId) }
  );
}

type PatchBody = {
  id?: string;
  sleep_end?: string;
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

  const { childId: resolvedChildId } = loaded;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const logId = typeof body.id === "string" ? body.id.trim() : "";
  if (!logId) {
    return NextResponse.json(
      { error: "Missing id." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const sleepEnd = parseIsoDateTime(body.sleep_end);
  if (!sleepEnd) {
    return NextResponse.json(
      { error: "sleep_end is required and must be a valid date-time." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const supabase = await createClientForRequest(request);

  const { data: existing, error: fetchError } = await supabase
    .from("sleep_logs")
    .select("id, child_id, sleep_start, sleep_end")
    .eq("id", logId)
    .eq("child_id", resolvedChildId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[sleep log PATCH fetch ${requestId}]`, fetchError);
    return NextResponse.json(
      { error: "Could not verify sleep log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Sleep log not found for this child." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }

  if ((existing as { sleep_end: string | null }).sleep_end != null) {
    return NextResponse.json(
      { error: "This sleep session already has an end time." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const start = new Date(String((existing as { sleep_start: string }).sleep_start));
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      {
        error:
          "This sleep log has an invalid sleep_start on record. Delete the entry and log again if needed.",
      },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }
  if (sleepEnd.getTime() <= start.getTime()) {
    return NextResponse.json(
      {
        error:
          "sleep_end must be strictly after sleep_start. Pick an end time later than when this sleep began.",
      },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("sleep_logs")
    .update({ sleep_end: sleepEnd.toISOString() })
    .eq("id", logId)
    .eq("child_id", resolvedChildId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error(`[sleep log PATCH ${requestId}]`, updateError);
    return NextResponse.json(
      { error: "Could not update sleep log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    { log: toSleepLogRow(updated as Record<string, unknown>) },
    { headers: correlationHeaders(requestId) }
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

  const { data: existing, error: fetchError } = await supabase
    .from("sleep_logs")
    .select("id, child_id")
    .eq("id", logId.trim())
    .eq("child_id", resolvedChildId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[sleep log DELETE fetch ${requestId}]`, fetchError);
    return NextResponse.json(
      { error: "Could not verify sleep log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Sleep log not found for this child." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }

  const { error: delError } = await supabase
    .from("sleep_logs")
    .delete()
    .eq("id", logId.trim())
    .eq("child_id", resolvedChildId);

  if (delError) {
    console.error(`[sleep log DELETE ${requestId}]`, delError);
    return NextResponse.json(
      { error: "Could not delete sleep log." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json({ deleted: true }, { headers: correlationHeaders(requestId) });
}
