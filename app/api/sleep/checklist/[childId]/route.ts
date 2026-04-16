import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { getSafeSleepChecklist } from "@/lib/sleep-engine";
import { loadChildForUser } from "@/lib/load-child-for-user";
import { createClientForRequest } from "@/lib/supabase/for-request";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

const VALID_ITEM_CODES = new Set(
  getSafeSleepChecklist().map((i) => i.code)
);

type ChecklistRow = {
  id: string;
  child_id: string;
  item_code: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

function toChecklistRow(r: Record<string, unknown>): ChecklistRow {
  return {
    id: String(r.id),
    child_id: String(r.child_id),
    item_code: String(r.item_code),
    completed: Boolean(r.completed),
    completed_at: r.completed_at != null ? String(r.completed_at) : null,
    created_at: String(r.created_at),
  };
}

type PostBody = {
  item_code?: string;
  completed?: boolean;
};

async function upsertChecklistItem(request: Request, context: RouteContext) {
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

  const item_code =
    typeof body.item_code === "string" ? body.item_code.trim() : "";
  if (!item_code || !VALID_ITEM_CODES.has(item_code)) {
    return NextResponse.json(
      { error: "Missing or invalid item_code." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  if (typeof body.completed !== "boolean") {
    return NextResponse.json(
      { error: "completed must be a boolean." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const completed = body.completed;
  const completed_at = completed ? new Date().toISOString() : null;

  const supabase = await createClientForRequest(request);

  const { data: saved, error } = await supabase
    .from("safe_sleep_checklist")
    .upsert(
      {
        child_id: resolvedChildId,
        item_code,
        completed,
        completed_at,
      },
      { onConflict: "child_id,item_code" }
    )
    .select()
    .single();

  if (error || !saved) {
    console.error(`[sleep checklist upsert ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not save checklist item." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    { item: toChecklistRow(saved as Record<string, unknown>) },
    { headers: correlationHeaders(requestId) }
  );
}

export async function POST(request: Request, context: RouteContext) {
  return upsertChecklistItem(request, context);
}

/** Same body and upsert behavior as POST — supports clients that use PATCH for partial updates. */
export async function PATCH(request: Request, context: RouteContext) {
  return upsertChecklistItem(request, context);
}
