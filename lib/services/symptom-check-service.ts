/**
 * SymptomCheck service layer — PostgreSQL via Prisma only.
 * Every query is scoped with `userId` from the authenticated session so users only see their own checks.
 * All reads and writes for symptom checks go through this module (no mixed Supabase table access).
 */
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  parseSymptomTriageResult,
  symptomTriageResultSchema,
  type SymptomTriageResult,
} from "@/lib/symptom-triage-result";
import { isChildOwnedByUser } from "@/lib/services/child-service";

export type { SymptomTriageResult } from "@/lib/symptom-triage-result";

/** Dashboard list row + child name (joined in Prisma via `include: { child }`). */
export type DashboardSymptomCheckRow = {
  id: string;
  input_text: string;
  urgency: string;
  created_at: string;
  child_id: string;
  children: { name: string };
  triage: SymptomTriageResult;
};

export type HistorySymptomCheckRow = {
  id: string;
  created_at: string;
  urgency: string;
  input_text: string;
  child_id: string;
  childName: string;
  triage: SymptomTriageResult;
};

export type SymptomCheckDetailRow = {
  id: string;
  created_at: string;
  input_text: string;
  urgency: string;
  triage: SymptomTriageResult;
  /** Prior helpful / not helpful for this user on this check, if any. */
  feedback: { helpful: boolean } | null;
};

function iso(d: Date): string {
  return d.toISOString();
}

/**
 * Recent symptom checks with child name, for the dashboard (default limit 5).
 */
export async function listRecentSymptomChecksForDashboard(
  userId: string,
  take = 5
): Promise<{ rows: DashboardSymptomCheckRow[]; error: string | null }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { rows: [], error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const rows = await prisma.symptomCheck.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        child: { select: { name: true } },
      },
    });

    const mapped: DashboardSymptomCheckRow[] = rows.map((r) => ({
      id: r.id,
      input_text: r.inputText,
      urgency: r.urgency,
      created_at: iso(r.createdAt),
      child_id: r.childId,
      children: { name: r.child.name },
      triage: parseSymptomTriageResult(r.aiResponse, {
        urgency: r.urgency,
        decisionSource: r.decisionSource,
        ruleReason: r.ruleReason,
      }),
    }));

    return { rows: mapped, error: null };
  } catch (e) {
    console.error("[listRecentSymptomChecksForDashboard]", e);
    return { rows: [], error: "Could not load symptom checks. Try again shortly." };
  }
}

/**
 * History list with child names resolved (up to `limit` rows).
 */
export async function listSymptomChecksForHistory(
  userId: string,
  limit = 50
): Promise<{ rows: HistorySymptomCheckRow[]; error: string | null }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { rows: [], error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const rows = await prisma.symptomCheck.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        child: { select: { name: true } },
      },
    });

    const mapped: HistorySymptomCheckRow[] = rows.map((r) => ({
      id: r.id,
      created_at: iso(r.createdAt),
      urgency: r.urgency,
      input_text: r.inputText,
      child_id: r.childId,
      childName: r.child.name,
      triage: parseSymptomTriageResult(r.aiResponse, {
        urgency: r.urgency,
        decisionSource: r.decisionSource,
        ruleReason: r.ruleReason,
      }),
    }));

    return { rows: mapped, error: null };
  } catch (e) {
    console.error("[listSymptomChecksForHistory]", e);
    return { rows: [], error: "Could not load history. Try again shortly." };
  }
}

/**
 * Single check for the check detail page — scoped to `userId`.
 */
export async function getSymptomCheckDetailForUser(
  userId: string,
  checkId: string
): Promise<{ row: SymptomCheckDetailRow | null; error: string | null }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { row: null, error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const r = await prisma.symptomCheck.findFirst({
      where: { id: checkId, userId },
      select: {
        id: true,
        createdAt: true,
        inputText: true,
        urgency: true,
        aiResponse: true,
        decisionSource: true,
        ruleReason: true,
        feedbacks: {
          where: { userId },
          select: { helpful: true },
          take: 1,
        },
      },
    });

    if (!r) {
      return { row: null, error: null };
    }

    const prior = r.feedbacks[0];

    const row: SymptomCheckDetailRow = {
      id: r.id,
      created_at: iso(r.createdAt),
      input_text: r.inputText,
      urgency: r.urgency,
      triage: parseSymptomTriageResult(r.aiResponse, {
        urgency: r.urgency,
        decisionSource: r.decisionSource,
        ruleReason: r.ruleReason,
      }),
      feedback: prior ? { helpful: prior.helpful } : null,
    };

    return { row, error: null };
  } catch (e) {
    console.error("[getSymptomCheckDetailForUser]", e);
    return { row: null, error: "Could not load this check. Try again shortly." };
  }
}

/** Symptom checks listed on a child profile (recent first). */
export type ChildProfileCheckRow = {
  id: string;
  urgency: string;
  created_at: string;
  input_text: string;
  triage: SymptomTriageResult;
};

export async function listSymptomChecksForChild(
  userId: string,
  childId: string,
  take = 10
): Promise<{ rows: ChildProfileCheckRow[]; error: string | null }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { rows: [], error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const rows = await prisma.symptomCheck.findMany({
      where: { userId, childId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        urgency: true,
        createdAt: true,
        inputText: true,
        aiResponse: true,
        decisionSource: true,
        ruleReason: true,
      },
    });

    const mapped: ChildProfileCheckRow[] = rows.map((r) => ({
      id: r.id,
      urgency: r.urgency,
      created_at: iso(r.createdAt),
      input_text: r.inputText,
      triage: parseSymptomTriageResult(r.aiResponse, {
        urgency: r.urgency,
        decisionSource: r.decisionSource,
        ruleReason: r.ruleReason,
      }),
    }));

    return { rows: mapped, error: null };
  } catch (e) {
    console.error("[listSymptomChecksForChild]", e);
    return { rows: [], error: "Could not load symptom checks." };
  }
}

export type CreateSymptomCheckInput = {
  userId: string;
  childId: string;
  inputText: string;
  triage: SymptomTriageResult;
  disclaimerAccepted: boolean;
  followupCount: number;
  flowVersion: string;
};

/**
 * Persists a completed symptom check. Verifies `childId` belongs to `userId` before insert.
 */
export async function createSymptomCheckForUser(
  params: CreateSymptomCheckInput
): Promise<{ ok: true; checkId: string } | { ok: false; message: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      ok: false,
      message: "Database is not configured (missing DATABASE_URL).",
    };
  }

  const owned = await isChildOwnedByUser(params.userId, params.childId);
  if (!owned) {
    return {
      ok: false,
      message: "Child not found or you do not have access.",
    };
  }

  try {
    const triage = symptomTriageResultSchema.parse(params.triage);

    const row = await prisma.symptomCheck.create({
      data: {
        userId: params.userId,
        childId: params.childId,
        inputText: params.inputText,
        urgency: triage.urgency,
        aiResponse: triage as Prisma.InputJsonValue,
        disclaimerAccepted: params.disclaimerAccepted,
        modelUsed: "gpt-5-mini",
        flowVersion: params.flowVersion,
        followupCount: params.followupCount,
        decisionSource: triage.decision_source,
        ruleReason: triage.rule_reason,
      },
      select: { id: true },
    });

    return { ok: true, checkId: row.id };
  } catch (e) {
    console.error("[createSymptomCheckForUser]", e);
    return {
      ok: false,
      message: "Could not save symptom check. Try again shortly.",
    };
  }
}

/**
 * Records helpful / not helpful for a symptom check. One row per user per check (`@@unique([userId, checkId])`);
 * submitting again updates `helpful`.
 */
export async function upsertSymptomCheckFeedbackForUser(
  userId: string,
  checkId: string,
  helpful: boolean
): Promise<
  | { ok: true }
  | { ok: false; status: 404 | 503 | 500; message: string }
> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, status: 503, message: "Database is not configured." };
  }

  const owned = await prisma.symptomCheck.findFirst({
    where: { id: checkId, userId },
    select: { id: true },
  });

  if (!owned) {
    return { ok: false, status: 404, message: "Check not found." };
  }

  try {
    await prisma.symptomCheckFeedback.upsert({
      where: {
        userId_checkId: {
          userId,
          checkId,
        },
      },
      create: {
        userId,
        checkId,
        helpful,
      },
      update: {
        helpful,
      },
    });

    return { ok: true };
  } catch (e) {
    console.error("[upsertSymptomCheckFeedbackForUser]", e);
    return { ok: false, status: 500, message: "Could not save feedback. Try again." };
  }
}
