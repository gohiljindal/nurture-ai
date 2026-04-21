import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { ALLERGEN_INTRO_CHECKLIST } from "@/lib/allergen-checklist-cps";
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

const VALID_ALLERGENS = new Set([
  "peanut",
  "egg",
  "dairy",
  "wheat",
  "soy",
  "tree_nut",
  "sesame",
  "fish",
  "shellfish",
]);

type AllergenRow = {
  id: string;
  child_id: string;
  allergen: string;
  introduced_at: string | null;
  reaction_noted: boolean;
  reaction_description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toAllergenRow(r: Record<string, unknown>): AllergenRow {
  return {
    id: String(r.id),
    child_id: String(r.child_id),
    allergen: String(r.allergen),
    introduced_at:
      r.introduced_at != null ? String(r.introduced_at).slice(0, 10) : null,
    reaction_noted: Boolean(r.reaction_noted),
    reaction_description:
      r.reaction_description != null ? String(r.reaction_description) : null,
    notes: r.notes != null ? String(r.notes) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function parseIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T12:00:00`);
  if (Number.isNaN(t)) return null;
  return s;
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

  const supabase = await createClientForRequest(request);

  const { data: rows, error } = await supabase
    .from("allergen_introductions")
    .select("*")
    .eq("child_id", resolvedChildId)
    .order("allergen", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "allergen_introductions")) {
      return NextResponse.json(
        {
          allergen_introductions: [],
          allergen_introduction_checklist: ALLERGEN_INTRO_CHECKLIST,
        },
        { headers: correlationHeaders(requestId) }
      );
    }
    console.error(`[feeding allergens GET ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not load allergen introductions." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const allergen_introductions = (rows ?? []).map((r) =>
    toAllergenRow(r as Record<string, unknown>)
  );

  return NextResponse.json(
    {
      allergen_introductions,
      allergen_introduction_checklist: ALLERGEN_INTRO_CHECKLIST,
    },
    { headers: correlationHeaders(requestId) }
  );
}

type PostBody = {
  allergen?: string;
  introduced_at?: string | null;
  reaction_noted?: boolean;
  reaction_description?: string | null;
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

  const allergen =
    typeof body.allergen === "string" ? body.allergen.trim() : "";
  if (!allergen || !VALID_ALLERGENS.has(allergen)) {
    return NextResponse.json(
      { error: "Missing or invalid allergen." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const supabase = await createClientForRequest(request);

  const { data: existing, error: fetchError } = await supabase
    .from("allergen_introductions")
    .select("*")
    .eq("child_id", resolvedChildId)
    .eq("allergen", allergen)
    .maybeSingle();

  if (fetchError) {
    console.error(`[feeding allergens POST fetch ${requestId}]`, fetchError);
    return NextResponse.json(
      { error: "Could not load existing allergen row." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const parsedIntro = parseIsoDate(body.introduced_at);
  const introduced_at =
    parsedIntro ??
    (existing
      ? (toAllergenRow(existing as Record<string, unknown>).introduced_at ?? today)
      : today);

  const merged = {
    child_id: resolvedChildId,
    allergen,
    introduced_at,
    reaction_noted:
      typeof body.reaction_noted === "boolean"
        ? body.reaction_noted
        : existing
          ? Boolean((existing as { reaction_noted?: boolean }).reaction_noted)
          : false,
    reaction_description:
      body.reaction_description !== undefined
        ? body.reaction_description != null
          ? String(body.reaction_description)
          : null
        : existing
          ? (existing as { reaction_description?: string | null }).reaction_description ??
            null
          : null,
    notes:
      body.notes !== undefined
        ? body.notes != null
          ? String(body.notes)
          : null
        : existing
          ? (existing as { notes?: string | null }).notes ?? null
          : null,
  };

  // Matches UNIQUE (child_id, allergen) on public.allergen_introductions
  const { data: saved, error } = await supabase
    .from("allergen_introductions")
    .upsert(merged, { onConflict: "child_id,allergen" })
    .select()
    .single();

  if (error || !saved) {
    console.error(`[feeding allergens POST ${requestId}]`, error);
    return NextResponse.json(
      { error: "Could not save allergen introduction." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    { allergen: toAllergenRow(saved as Record<string, unknown>) },
    { status: existing ? 200 : 201, headers: correlationHeaders(requestId) }
  );
}
