import type { ChildMilestone as ChildMilestoneRow, MilestoneDefinition as MilestoneDefinitionRow } from "@prisma/client";
import { NextResponse } from "next/server";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { loadChildForUser } from "@/lib/load-child-for-user";
import {
  buildAgeGroups,
  buildDomainSummaries,
  getCorrectedAgeMonths,
  getMilestoneOverview,
  type ChildMilestone,
  type MilestoneDefinition,
  type MilestoneDomain,
  type MilestoneStatus,
} from "@/lib/milestone-engine";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES: MilestoneStatus[] = [
  "pending",
  "achieved",
  "skipped",
  "flagged",
];

function toMilestoneDefinition(row: MilestoneDefinitionRow): MilestoneDefinition {
  return {
    id: row.id,
    domain: row.domain as MilestoneDomain,
    age_months_min: row.ageMonthsMin,
    age_months_max: row.ageMonthsMax,
    age_months_avg: row.ageMonthsAvg,
    title: row.title,
    description: row.description,
    why_it_matters: row.whyItMatters,
    what_to_do_if_delayed: row.whatToDoIfDelayed,
    red_flag: row.redFlag,
    source: row.source,
    premature_notes: row.prematureNotes,
    sort_order: row.sortOrder,
    created_at: row.createdAt.toISOString(),
  };
}

function toChildMilestone(row: ChildMilestoneRow): ChildMilestone {
  return {
    id: row.id,
    child_id: row.childId,
    milestone_id: row.milestoneId,
    status: row.status as MilestoneStatus,
    achieved_at: row.achievedAt != null ? row.achievedAt.toISOString().slice(0, 10) : null,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

type RouteContext = {
  params: Promise<{ childId: string }>;
};

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

  const { childId: resolvedChildId, child } = loaded;

  let defRows: MilestoneDefinitionRow[];
  let cmRows: ChildMilestoneRow[];
  try {
    defRows = await prisma.milestoneDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });
    cmRows = await prisma.childMilestone.findMany({
      where: { childId: resolvedChildId },
    });
  } catch (e) {
    console.error(`[milestones GET ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not load milestones." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const definitions = defRows.map((r) => toMilestoneDefinition(r));
  const childMilestones: ChildMilestone[] = cmRows.map((r) => toChildMilestone(r));

  const ageMonths = getCorrectedAgeMonths(
    child.date_of_birth,
    child.gestational_age_weeks ?? null,
    Boolean(child.is_premature)
  );

  const overview = getMilestoneOverview(definitions, childMilestones, ageMonths);
  const age_groups = buildAgeGroups(definitions, childMilestones, ageMonths);
  const domain_summaries = buildDomainSummaries(
    definitions,
    childMilestones,
    ageMonths
  );

  return NextResponse.json(
    {
      child: {
        id: resolvedChildId,
        name: child.name,
        age_months: ageMonths,
        is_premature: child.is_premature,
        gestational_age_weeks: child.gestational_age_weeks,
      },
      overview,
      age_groups,
      domain_summaries,
    },
    { headers: correlationHeaders(requestId) }
  );
}

type PostBody = {
  milestone_id?: string;
  status?: string;
  achieved_at?: string | null;
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

  const milestoneId =
    typeof body.milestone_id === "string" ? body.milestone_id.trim() : "";
  if (!milestoneId) {
    return NextResponse.json(
      { error: "Missing milestone_id." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const status = body.status;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as MilestoneStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Use pending, achieved, skipped, or flagged." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const milestoneStatus = status as MilestoneStatus;

  let achievedAt: Date | null = null;
  if (milestoneStatus === "achieved") {
    if (body.achieved_at != null && String(body.achieved_at).trim() !== "") {
      const s = String(body.achieved_at).trim().slice(0, 10);
      achievedAt = new Date(`${s}T12:00:00`);
    } else {
      achievedAt = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00");
    }
  }

  let saved: ChildMilestoneRow;
  try {
    saved = await prisma.childMilestone.upsert({
      where: {
        childId_milestoneId: {
          childId: resolvedChildId,
          milestoneId,
        },
      },
      create: {
        childId: resolvedChildId,
        milestoneId,
        status: milestoneStatus,
        achievedAt,
        notes: body.notes != null ? String(body.notes) : null,
      },
      update: {
        status: milestoneStatus,
        achievedAt,
        notes: body.notes != null ? String(body.notes) : null,
      },
    });
  } catch (e) {
    console.error(`[milestones POST ${requestId}]`, e);
    return NextResponse.json(
      { error: "Could not save milestone." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    {
      milestone: toChildMilestone(saved),
    },
    { headers: correlationHeaders(requestId) }
  );
}
