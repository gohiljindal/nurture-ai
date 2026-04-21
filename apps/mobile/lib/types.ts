// ─── API result wrapper ───────────────────────────────────────────────────────

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ─── Auth / User ──────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AppUser = {
  id: string;
  email: string | null;
  createdAt: string;
};

export type MeResponse = {
  authUser: AuthUser;
  appUser: AppUser | null;
};

// ─── Children ─────────────────────────────────────────────────────────────────

export type Child = {
  id: string;
  name: string;
  photo_url: string | null;
  /** YYYY-MM-DD */
  date_of_birth: string;
  sex_at_birth: string | null;
  is_premature: boolean;
  gestational_age_weeks: number | null;
  province: string | null;
};

export type CreateChildInput = {
  name: string;
  photo_url: string | null;
  /** YYYY-MM-DD */
  date_of_birth: string;
  sex_at_birth: string | null;
  is_premature: boolean;
  gestational_age_weeks: number | null;
};

// ─── Symptom triage ───────────────────────────────────────────────────────────

export type TriageUrgency = "emergency" | "urgent_doctor" | "monitor_home";
export type TriageConfidence = "low" | "medium" | "high";
export type DecisionSource = "safety_rule" | "ai";

export type SymptomTriageResult = {
  urgency: TriageUrgency;
  summary: string;
  recommended_action: string;
  red_flags: string[];
  disclaimer: string;
  decision_source: DecisionSource;
  rule_reason: string | null;
  confidence: TriageConfidence;
  reasoning: string;
  /** Optional — when backend adds scoring / structured actions */
  urgency_score?: number;
  immediate_actions?: string[];
  watch_next?: string[];
  decision_factors?: string[];
  /** When follow-up answers changed urgency vs symptom-only baseline */
  decision_diff?: {
    baseline_urgency: TriageUrgency;
    final_urgency: TriageUrgency;
    summary: string;
  };
};

export type FollowupAnswer = {
  question: string;
  answer: string;
};

/**
 * Discriminated union returned by startSymptomFollowup:
 * - "immediate": safety rule short-circuited — show result now
 * - "questions": AI returned 3 follow-up questions to ask
 */
export type SymptomFollowupResult =
  | { type: "immediate"; triage: SymptomTriageResult; checkId: string }
  | { type: "questions"; questions: string[] };

// ─── Symptom check history ────────────────────────────────────────────────────

export type HistoryCheck = {
  id: string;
  created_at: string;
  urgency: TriageUrgency;
  input_text: string;
  child_id: string;
  childName: string;
  triage: SymptomTriageResult;
};

export type CheckDetail = {
  id: string;
  created_at: string;
  input_text: string;
  urgency: TriageUrgency;
  triage: SymptomTriageResult;
  /** Child province — regional nurse/811-style numbers in UI */
  province: string | null;
  feedback: { helpful: boolean } | null;
};

// ─── Milestones ───────────────────────────────────────────────────────────────

export type MilestoneDomain =
  | "motor_gross" | "motor_fine" | "language"
  | "social" | "cognitive" | "feeding" | "sleep";

export type MilestoneStatus = "pending" | "achieved" | "skipped" | "flagged";
export type DelayStatus = "achieved" | "on_track" | "watch" | "delayed";

export type MilestoneItem = {
  id: string;
  domain: MilestoneDomain;
  title: string;
  description: string;
  why_it_matters: string;
  what_to_do_if_delayed: string;
  red_flag: boolean;
  premature_notes: string | null;
  age_months_min: number;
  age_months_max: number;
  child_milestone: { status: MilestoneStatus; achieved_at: string | null; notes: string | null } | null;
  delay_status: DelayStatus;
  is_relevant_now: boolean;
};

export type AgeGroup = {
  label: string;
  age_months: number;
  milestones: MilestoneItem[];
  progress: number;
  any_delayed: boolean;
  any_red_flag_delayed: boolean;
};

export type DomainSummary = {
  domain: MilestoneDomain;
  label: string;
  emoji: string;
  achieved: number;
  total: number;
  delayed: number;
  progress: number;
};

export type MilestoneOverview = {
  total: number;
  achieved: number;
  delayed: number;
  red_flag_delayed: number;
  on_track: number;
  progress_pct: number;
  upcoming_count: number;
  needs_attention: boolean;
};

export type MilestoneDelayGuidance = {
  summary: string;
  bullets: string[];
};

export type MilestonesResponse = {
  child: {
    id: string; name: string; age_months: number;
    is_premature: boolean; gestational_age_weeks: number | null;
  };
  overview: MilestoneOverview;
  age_groups: AgeGroup[];
  domain_summaries: DomainSummary[];
  delay_guidance?: MilestoneDelayGuidance;
};

// ─── Vaccines ─────────────────────────────────────────────────────────────────

export type VaccineTimelineItem = {
  code: string;
  name: string;
  shortName: string;
  ageMonths: number | null;
  gradeNote: string | null;
  diseases: string[];
  notes: string | null;
  isSchoolAge: boolean;
  scheduledDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
  administered: boolean;
  administeredDate: string | null;
};

export type VaccinesResponse = {
  child: { id: string; name: string; dob: string; province: string; province_name: string };
  timeline: VaccineTimelineItem[];
  upcoming: VaccineTimelineItem[];
  overdue: VaccineTimelineItem[];
  next_vaccine: VaccineTimelineItem | null;
  stats: {
    total: number; administered: number; overdue: number;
    upcoming_90_days: number; completion_pct: number;
  };
  province_info: { health_line: string; schedule_url: string };
};

export type VaccinesApiResponse =
  | VaccinesResponse
  | { requires_province: true; child: { id: string; name: string } };

// ─── Growth (GET /api/growth/[childId]) ───────────────────────────────────────

/** LMS-derived reference values at the child’s age (same as web `ChartBands`). */
export type GrowthChartBands = {
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

/** Points returned in `chart_data` (WHO percentiles + bands on server). */
export type GrowthChartDataPoint = {
  measured_at: string;
  age_months: number;
  weight_kg?: number | null;
  height_cm?: number | null;
  head_cm?: number | null;
  /** Height chart uses `length` (length-for-age), not `height`. */
  bands?: {
    weight?: GrowthChartBands;
    length?: GrowthChartBands;
    head?: GrowthChartBands;
  };
};

export type GrowthPercentileTableRow = {
  measured_at: string;
  weight_percentile: number | null;
  height_percentile: number | null;
  head_percentile: number | null;
};

export type GrowthGetResponse = {
  child: {
    id: string;
    name: string;
    dob: string;
    sex: string | null;
    age_months: number;
  };
  measurements: Array<{
    id: string;
    measured_at: string;
    weight_kg: number | null;
    height_cm: number | null;
    head_cm: number | null;
    notes: string | null;
    percentiles: Record<string, unknown>;
  }>;
  chart_data: {
    weight: GrowthChartDataPoint[];
    height: GrowthChartDataPoint[];
    head: GrowthChartDataPoint[];
  };
  latest_summary: Record<string, unknown>;
  percentile_table?: GrowthPercentileTableRow[];
};

// ─── Insights / visit prep ───────────────────────────────────────────────────

export type TodayInsightPayload = {
  title: string;
  body: string;
  stage: string;
  stage_label: string;
};

export type TodayInsightResponse = {
  child_id: string;
  insight: TodayInsightPayload;
};

export type VisitPrepApiResponse = {
  child: { id: string; name: string; age_months: number };
  before: string[];
  during: string[];
  focus_topics: string[];
};

export type ParentingHubResponse = {
  child: { id: string; name: string; age_months: number };
  title: string;
  summary: string;
  bullets: string[];
  checklist?: string[];
  disclaimer: string;
};

export type ChildChecksResponse = {
  child: { id: string; name: string };
  flags: {
    dental_due: boolean;
    hearing_concern: boolean;
    vision_concern: boolean;
    notes: string | null;
  };
};

export type TimelineResponse = {
  child: { id: string; name: string };
  events: Array<{
    id: string;
    kind: string;
    date: string;
    title: string;
    detail: string;
  }>;
};

// ─── Feeding / Sleep guidance (loose JSON from engine) ───────────────────────

export type FeedingGuidanceResponse = Record<string, unknown>;
export type SleepGuidanceResponse = Record<string, unknown>;
