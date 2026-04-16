/**
 * Core milestone business logic — pure TypeScript, no external dependencies.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MilestoneDomain =
  | "motor_gross"
  | "motor_fine"
  | "language"
  | "social"
  | "cognitive"
  | "feeding"
  | "sleep";

export type MilestoneStatus = "pending" | "achieved" | "skipped" | "flagged";

/** Matches `public.milestone_definitions` */
export interface MilestoneDefinition {
  id: string;
  domain: MilestoneDomain;
  age_months_min: number;
  age_months_max: number;
  age_months_avg: number;
  title: string;
  description: string;
  why_it_matters: string;
  what_to_do_if_delayed: string;
  red_flag: boolean;
  source: string | null;
  premature_notes: string | null;
  sort_order: number;
  created_at?: string;
}

/** Matches `public.child_milestones` */
export interface ChildMilestone {
  id: string;
  child_id: string;
  milestone_id: string;
  status: MilestoneStatus;
  achieved_at: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DelayStatus = "achieved" | "on_track" | "watch" | "delayed";

export interface MilestoneWithStatus extends MilestoneDefinition {
  child_milestone: ChildMilestone | null;
  delay_status: DelayStatus;
  is_relevant_now: boolean;
}

export interface AgeGroup {
  label: string;
  age_months: number;
  milestones: MilestoneWithStatus[];
  progress: number;
  any_delayed: boolean;
  any_red_flag_delayed: boolean;
}

export interface DomainSummary {
  domain: MilestoneDomain;
  label: string;
  emoji: string;
  achieved: number;
  total: number;
  delayed: number;
  progress: number;
}

export interface MilestoneOverview {
  total: number;
  achieved: number;
  delayed: number;
  red_flag_delayed: number;
  on_track: number;
  progress_pct: number;
  upcoming_count: number;
  needs_attention: boolean;
}

const AGE_BUCKET_MONTHS = [1, 2, 4, 6, 9, 12, 15, 18, 24] as const;

const WEEKS_PER_MONTH = 4.33;

const DOMAIN_META: Record<
  MilestoneDomain,
  { label: string; emoji: string }
> = {
  motor_gross: { label: "Gross motor", emoji: "🏃" },
  motor_fine: { label: "Fine motor", emoji: "✋" },
  language: { label: "Language", emoji: "💬" },
  social: { label: "Social", emoji: "😊" },
  cognitive: { label: "Cognitive", emoji: "🧠" },
  feeding: { label: "Feeding", emoji: "🍼" },
  sleep: { label: "Sleep", emoji: "😴" },
};

// -----------------------------------------------------------------------------
// Age
// -----------------------------------------------------------------------------

/**
 * Chronological age in whole months (floor), from ISO date string YYYY-MM-DD.
 */
function chronologicalAgeMonths(dob: string): number {
  const birth = new Date(dob + "T12:00:00");
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Corrected age for prematurity: subtract weeks early converted to months.
 * Only applies when gestationalWeeks < 37 and useCorrection is true.
 */
export function getCorrectedAgeMonths(
  dob: string,
  gestationalWeeks: number | null,
  useCorrection: boolean
): number {
  const chronological = chronologicalAgeMonths(dob);
  if (
    !useCorrection ||
    gestationalWeeks == null ||
    gestationalWeeks >= 37
  ) {
    return chronological;
  }
  const monthsToSubtract = (40 - gestationalWeeks) / WEEKS_PER_MONTH;
  const corrected = chronological - monthsToSubtract;
  return Math.max(0, Math.round(corrected * 100) / 100);
}

export function formatAgeMonths(months: number): string {
  if (months <= 0) return "Newborn";
  if (months < 12) {
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const yearPart =
    years === 1 ? "1 year" : `${years} years`;
  if (rem === 0) return yearPart;
  const monthPart = rem === 1 ? "1 month" : `${rem} months`;
  return `${yearPart} ${monthPart}`;
}

// -----------------------------------------------------------------------------
// Delay status
// -----------------------------------------------------------------------------

function childMilestoneFor(
  childMilestones: ChildMilestone[],
  milestoneId: string
): ChildMilestone | null {
  return childMilestones.find((c) => c.milestone_id === milestoneId) ?? null;
}

export function getDelayStatus(
  milestone: MilestoneDefinition,
  childMilestone: ChildMilestone | null,
  ageMonths: number
): DelayStatus {
  const status = childMilestone?.status ?? "pending";

  if (status === "achieved") return "achieved";
  if (status === "skipped") return "on_track";
  if (status === "flagged") return "watch";

  if (ageMonths > milestone.age_months_max) return "delayed";
  if (ageMonths >= milestone.age_months_max - 1) return "watch";

  return "on_track";
}

function isRelevantNow(milestone: MilestoneDefinition, ageMonths: number): boolean {
  return (
    ageMonths >= milestone.age_months_min &&
    ageMonths <= milestone.age_months_max
  );
}

function withStatus(
  def: MilestoneDefinition,
  childMilestones: ChildMilestone[],
  ageMonths: number
): MilestoneWithStatus {
  const cm = childMilestoneFor(childMilestones, def.id);
  return {
    ...def,
    child_milestone: cm,
    delay_status: getDelayStatus(def, cm, ageMonths),
    is_relevant_now: isRelevantNow(def, ageMonths),
  };
}

// -----------------------------------------------------------------------------
// Buckets
// -----------------------------------------------------------------------------

function bucketForAvg(ageMonthsAvg: number): number {
  let chosen = AGE_BUCKET_MONTHS[AGE_BUCKET_MONTHS.length - 1];
  for (const b of AGE_BUCKET_MONTHS) {
    if (ageMonthsAvg <= b) {
      chosen = b;
      break;
    }
  }
  return chosen;
}

function bucketLabel(months: number): string {
  if (months <= 1) return "~1 month";
  if (months === 2) return "~2 months";
  if (months === 4) return "~4 months";
  if (months === 6) return "~6 months";
  if (months === 9) return "~9 months";
  if (months === 12) return "~12 months";
  if (months === 15) return "~15 months";
  if (months === 18) return "~18 months";
  return "~24 months";
}

function groupProgress(milestones: MilestoneWithStatus[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.delay_status === "achieved").length;
  return Math.round((done / milestones.length) * 100);
}

export function buildAgeGroups(
  definitions: MilestoneDefinition[],
  childMilestones: ChildMilestone[],
  ageMonths: number
): AgeGroup[] {
  const map = new Map<number, MilestoneWithStatus[]>();

  for (const def of definitions) {
    const bucket = bucketForAvg(def.age_months_avg);
    const m = withStatus(def, childMilestones, ageMonths);
    const list = map.get(bucket) ?? [];
    list.push(m);
    map.set(bucket, list);
  }

  const groups: AgeGroup[] = [];
  for (const b of AGE_BUCKET_MONTHS) {
    const ms = map.get(b);
    if (!ms || ms.length === 0) continue;

    ms.sort((a, c) => a.sort_order - c.sort_order);

    const any_delayed = ms.some((m) => m.delay_status === "delayed");
    const any_red_flag_delayed = ms.some(
      (m) => m.delay_status === "delayed" && m.red_flag
    );

    groups.push({
      label: bucketLabel(b),
      age_months: b,
      milestones: ms,
      progress: groupProgress(ms),
      any_delayed,
      any_red_flag_delayed,
    });
  }

  return groups;
}

export function buildDomainSummaries(
  definitions: MilestoneDefinition[],
  childMilestones: ChildMilestone[],
  ageMonths: number
): DomainSummary[] {
  const domains = Object.keys(DOMAIN_META) as MilestoneDomain[];
  const summaries: DomainSummary[] = [];

  for (const domain of domains) {
    const defs = definitions.filter((d) => d.domain === domain);
    if (defs.length === 0) continue;

    let achieved = 0;
    let delayed = 0;
    for (const def of defs) {
      const cm = childMilestoneFor(childMilestones, def.id);
      const ds = getDelayStatus(def, cm, ageMonths);
      if (ds === "achieved") achieved += 1;
      if (ds === "delayed") delayed += 1;
    }

    const total = defs.length;
    const progress =
      total === 0 ? 0 : Math.round((achieved / total) * 100);

    const meta = DOMAIN_META[domain];
    summaries.push({
      domain,
      label: meta.label,
      emoji: meta.emoji,
      achieved,
      total,
      delayed,
      progress,
    });
  }

  return summaries;
}

export function getMilestoneOverview(
  definitions: MilestoneDefinition[],
  childMilestones: ChildMilestone[],
  ageMonths: number
): MilestoneOverview {
  const filtered = definitions.filter(
    (d) => d.age_months_min <= ageMonths + 3
  );

  let achieved = 0;
  let delayed = 0;
  let red_flag_delayed = 0;
  let on_track = 0;
  let upcoming_count = 0;

  for (const def of filtered) {
    const cm = childMilestoneFor(childMilestones, def.id);
    const ds = getDelayStatus(def, cm, ageMonths);
    const relevant = isRelevantNow(def, ageMonths);

    if (ds === "achieved") achieved += 1;
    else if (ds === "delayed") {
      delayed += 1;
      if (def.red_flag) red_flag_delayed += 1;
    } else if (ds === "on_track" || ds === "watch") {
      on_track += 1;
    }

    const st = cm?.status ?? "pending";
    if (relevant && st !== "achieved" && st !== "skipped") {
      upcoming_count += 1;
    }
  }

  const total = filtered.length;
  const progress_pct =
    total === 0 ? 0 : Math.round((achieved / total) * 100);

  return {
    total,
    achieved,
    delayed,
    red_flag_delayed,
    on_track,
    progress_pct,
    upcoming_count,
    needs_attention: red_flag_delayed > 0,
  };
}
