/**
 * Child summary / timeline — Prisma-backed aggregates for dashboard and child detail.
 * Combines profile, recent symptom checks, vaccine record counts, and derived age / expectations / next milestone.
 */
import { prisma } from "@/lib/prisma";
import { calculateAgeInMonths, getNextVaccine } from "@/lib/child-age";
import { getAgeExpectation } from "@/lib/get-age-expectation";
import type { ChildProfileRow } from "@/lib/services/child-service";
import {
  triageFromStoredRow,
  type ChildProfileCheckRow,
  type DashboardSymptomCheckRow,
} from "@/lib/services/symptom-check-service";

/** Prisma: P1001 = cannot reach database server */
function isPrismaUnreachable(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P1001"
  );
}

function logPrismaWarning(scope: string, e: unknown): void {
  const code =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code: unknown }).code)
      : "?";
  const line =
    e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : String(e).slice(0, 120);
  console.warn(`[${scope}] ${code} ${line}`);
}

const DB_UNREACHABLE_MESSAGE =
  "Cannot connect to the database. Start PostgreSQL (for example `docker compose up`) and confirm DATABASE_URL points to it.";

function prismaServiceErrorMessage(e: unknown, fallback: string): string {
  return isPrismaUnreachable(e) ? DB_UNREACHABLE_MESSAGE : fallback;
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function iso(d: Date): string {
  return d.toISOString();
}

function toChildProfileRow(c: {
  id: string;
  name: string;
  photoUrl: string | null;
  dateOfBirth: Date;
  sexAtBirth: string | null;
  isPremature: boolean;
  gestationalAgeWeeks: number | null;
  province: string | null;
}): ChildProfileRow {
  return {
    id: c.id,
    name: c.name,
    photo_url: c.photoUrl,
    date_of_birth: formatDateOnly(c.dateOfBirth),
    sex_at_birth: c.sexAtBirth,
    is_premature: c.isPremature,
    gestational_age_weeks: c.gestationalAgeWeeks,
    province: c.province,
  };
}

function mapToChildProfileCheckRow(
  r: {
    id: string;
    urgency: string;
    createdAt: Date;
    inputText: string;
    aiResponse: unknown;
    decisionSource: string | null;
    ruleReason: string | null;
  },
  childDateOfBirth: string
): ChildProfileCheckRow {
  return {
    id: r.id,
    urgency: r.urgency,
    created_at: iso(r.createdAt),
    input_text: r.inputText,
    triage: triageFromStoredRow(
      r.aiResponse,
      {
        urgency: r.urgency,
        decisionSource: r.decisionSource,
        ruleReason: r.ruleReason,
      },
      r.inputText,
      childDateOfBirth
    ),
  };
}

function mapToDashboardSymptomCheckRow(r: {
  id: string;
  inputText: string;
  urgency: string;
  createdAt: Date;
  childId: string;
  aiResponse: unknown;
  decisionSource: string | null;
  ruleReason: string | null;
  child: { name: string; dateOfBirth: Date };
}): DashboardSymptomCheckRow {
  return {
    id: r.id,
    input_text: r.inputText,
    urgency: r.urgency,
    created_at: iso(r.createdAt),
    child_id: r.childId,
    children: { name: r.child.name },
    triage: triageFromStoredRow(
      r.aiResponse,
      {
        urgency: r.urgency,
        decisionSource: r.decisionSource,
        ruleReason: r.ruleReason,
      },
      r.inputText,
      formatDateOnly(r.child.dateOfBirth)
    ),
  };
}

export type ChildTimelineSummary = {
  profile: ChildProfileRow;
  age_months: number;
  expectation: ReturnType<typeof getAgeExpectation>;
  next_vaccine_milestone: ReturnType<typeof getNextVaccine>;
  vaccine_records_count: number;
  recent_checks: ChildProfileCheckRow[];
};

export type DashboardChildSummary = ChildTimelineSummary;

export type DashboardHomeSummary = {
  children: DashboardChildSummary[];
  recent_symptom_checks_global: DashboardSymptomCheckRow[];
  error: string | null;
};

function enrichChildSummary(
  profile: ChildProfileRow,
  recent_checks: ChildProfileCheckRow[],
  vaccine_records_count: number
): ChildTimelineSummary {
  const age_months = calculateAgeInMonths(profile.date_of_birth);
  return {
    profile,
    age_months,
    expectation: getAgeExpectation(profile.date_of_birth),
    next_vaccine_milestone: getNextVaccine(profile.date_of_birth),
    vaccine_records_count,
    recent_checks,
  };
}

/**
 * Single-child timeline: profile, age, expectation, next vaccine milestone, vaccine row count, recent checks (Prisma).
 */
export async function getChildTimelineSummaryForUser(
  userId: string,
  childId: string
): Promise<{ summary: ChildTimelineSummary | null; error: string | null }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { summary: null, error: "Database is not configured (missing DATABASE_URL)." };
  }

  try {
    const c = await prisma.child.findFirst({
      where: { id: childId, userId },
      include: {
        symptomChecks: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            urgency: true,
            createdAt: true,
            inputText: true,
            aiResponse: true,
            decisionSource: true,
            ruleReason: true,
          },
        },
        _count: { select: { childVaccines: true } },
      },
    });

    if (!c) {
      return { summary: null, error: null };
    }

    const profile = toChildProfileRow(c);
    const recent_checks = c.symptomChecks.map((row) =>
      mapToChildProfileCheckRow(row, profile.date_of_birth)
    );

    const summary = enrichChildSummary(
      profile,
      recent_checks,
      c._count.childVaccines
    );

    return { summary, error: null };
  } catch (e) {
    logPrismaWarning("getChildTimelineSummaryForUser", e);
    return {
      summary: null,
      error: prismaServiceErrorMessage(e, "Could not load child summary."),
    };
  }
}

/**
 * Dashboard: all children with per-child timeline snippets + user-wide recent symptom checks.
 */
export async function getDashboardHomeSummaryForUser(
  userId: string
): Promise<DashboardHomeSummary> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      children: [],
      recent_symptom_checks_global: [],
      error: "Database is not configured (missing DATABASE_URL).",
    };
  }

  try {
    const [childRows, globalChecks] = await Promise.all([
      prisma.child.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          symptomChecks: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              urgency: true,
              createdAt: true,
              inputText: true,
              aiResponse: true,
              decisionSource: true,
              ruleReason: true,
            },
          },
          _count: { select: { childVaccines: true } },
        },
      }),
      prisma.symptomCheck.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          child: { select: { name: true, dateOfBirth: true } },
        },
      }),
    ]);

    const children: DashboardChildSummary[] = childRows.map((c) => {
      const profile = toChildProfileRow(c);
      const recent_checks = c.symptomChecks.map((row) =>
        mapToChildProfileCheckRow(row, profile.date_of_birth)
      );
      return enrichChildSummary(profile, recent_checks, c._count.childVaccines);
    });

    const recent_symptom_checks_global = globalChecks.map(mapToDashboardSymptomCheckRow);

    return { children, recent_symptom_checks_global, error: null };
  } catch (e) {
    logPrismaWarning("getDashboardHomeSummaryForUser", e);
    return {
      children: [],
      recent_symptom_checks_global: [],
      error: prismaServiceErrorMessage(e, "Could not load dashboard data. Try again shortly."),
    };
  }
}
