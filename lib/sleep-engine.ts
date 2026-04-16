/**
 * Core sleep guidance logic — AAP Safe Sleep 2022, CPS, National Sleep Foundation.
 * Pure TypeScript, no external dependencies.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SleepExpectations {
  age_label: string;
  total_hours_min: number;
  total_hours_max: number;
  total_hours_typical: number;
  night_sleep_hours: number;
  nap_count_min: number;
  nap_count_max: number;
  nap_count_typical: number;
  nap_length_minutes_min: number;
  nap_length_minutes_max: number;
  longest_night_stretch_hours: number;
  wake_window_minutes_min: number;
  wake_window_minutes_max: number;
  what_is_normal: string[];
  common_challenges: string[];
  parent_tip: string;
  regression_risk: boolean;
  regression_note: string | null;
}

export type SafeSleepCategory =
  | "environment"
  | "position"
  | "clothing"
  | "sharing"
  | "general";

export interface SafeSleepItem {
  code: string;
  category: SafeSleepCategory;
  title: string;
  description: string;
  why_it_matters: string;
  is_critical: boolean;
  age_relevant_until_months: number | null;
}

export interface SleepRegression {
  age_months: number;
  age_label: string;
  duration_weeks_min: number;
  duration_weeks_max: number;
  why_it_happens: string;
  signs: string[];
  what_helps: string[];
  what_doesnt_help: string;
  reassurance: string;
}

export interface NapSchedule {
  age_label: string;
  nap_count: number;
  schedule_example: string;
  wake_windows: string;
  drop_signs: string;
  transition_note: string | null;
}

export interface SleepSummary {
  total_sleep_minutes: number;
  night_sleep_minutes: number;
  nap_minutes: number;
  nap_count: number;
  longest_stretch_minutes: number;
  last_wake_time: string | null;
  currently_sleeping: boolean;
}

const TWO_WEEKS_MONTHS = 14 / 30.4375;

function clampAge(ageMonths: number): number {
  if (Number.isNaN(ageMonths) || ageMonths < 0) return 0;
  return ageMonths;
}

// -----------------------------------------------------------------------------
// Sleep expectations by age
// -----------------------------------------------------------------------------

/** Covers 0–24 months in contiguous bands; ages above 24 months reuse 18–24 month values. */
export function getSleepExpectations(ageMonths: number): SleepExpectations {
  const age = clampAge(ageMonths);

  if (age < 1) {
    return {
      age_label: "0–1 month (newborn)",
      total_hours_min: 14,
      total_hours_max: 17,
      total_hours_typical: 16,
      night_sleep_hours: 8.5,
      nap_count_min: 4,
      nap_count_max: 6,
      nap_count_typical: 5,
      nap_length_minutes_min: 30,
      nap_length_minutes_max: 120,
      longest_night_stretch_hours: 3,
      wake_window_minutes_min: 45,
      wake_window_minutes_max: 60,
      what_is_normal: [
        "Sleeping in 2–4 hour stretches day and night is completely normal",
        "No circadian rhythm yet — day and night confusion is expected",
        "Total sleep spread across 24 hours with no pattern",
        "Some newborns sleep up to 18–20h in first days",
        "Grunting, squirming, and brief cries during sleep are normal (active sleep)",
      ],
      common_challenges: [
        "Day-night confusion (peak around day 5–10)",
        "Very short wake windows make scheduling impossible — follow baby's lead",
        "Contact sleeping — many newborns only sleep when held",
      ],
      parent_tip:
        "You cannot spoil a newborn. Responding immediately to all sleep cues is exactly right at this age. Your only job is survival.",
      regression_risk: false,
      regression_note: null,
    };
  }

  if (age < 3) {
    return {
      age_label: "1–3 months",
      total_hours_min: 14,
      total_hours_max: 16,
      total_hours_typical: 15,
      night_sleep_hours: 9,
      nap_count_min: 4,
      nap_count_max: 5,
      nap_count_typical: 4,
      nap_length_minutes_min: 30,
      nap_length_minutes_max: 120,
      longest_night_stretch_hours: 5,
      wake_window_minutes_min: 60,
      wake_window_minutes_max: 90,
      what_is_normal: [
        "Beginning to distinguish day and night — expose to light during day feeds",
        "6-week peak fussiness is a major sleep disruptor — temporary",
        "Still biologically unable to self-settle — this is not a habit, it is neurology",
        "Some babies give a 5–6h stretch by 3 months, many do not",
      ],
      common_challenges: [
        "Short naps and unpredictable timing",
        "Evening fussiness (witching hour)",
        "Growth spurts temporarily increasing night waking",
      ],
      parent_tip:
        "Expose baby to bright light and activity in the daytime. Keep nights dark and boring. This teaches circadian rhythm faster than any sleep training method.",
      regression_risk: false,
      regression_note: null,
    };
  }

  if (age < 4) {
    return {
      age_label: "3–4 months",
      total_hours_min: 13,
      total_hours_max: 15,
      total_hours_typical: 14,
      night_sleep_hours: 9,
      nap_count_min: 3,
      nap_count_max: 4,
      nap_count_typical: 4,
      nap_length_minutes_min: 30,
      nap_length_minutes_max: 90,
      longest_night_stretch_hours: 5,
      wake_window_minutes_min: 75,
      wake_window_minutes_max: 120,
      what_is_normal: [
        "Frequent night waking is expected even if baby previously slept well",
        "Naps may shorten to 30–45 minutes (one sleep cycle)",
        "Increased awareness makes falling asleep harder",
      ],
      common_challenges: [
        "Cat-napping",
        "Difficulty transferring to crib",
        "Increased need for help to fall asleep",
      ],
      parent_tip:
        "This regression peaks at 4 months and typically improves by 5–6 months with or without sleep training. Survival mode is acceptable.",
      regression_risk: true,
      regression_note:
        "The 4-month regression is the most significant of all. It is permanent — sleep architecture shifts from newborn to adult-like (light/deep cycles). Previously a great sleeper? Expect disruption. This is developmental, not a problem to fix.",
    };
  }

  if (age < 6) {
    return {
      age_label: "4–6 months",
      total_hours_min: 12,
      total_hours_max: 15,
      total_hours_typical: 13,
      night_sleep_hours: 11,
      nap_count_min: 2,
      nap_count_max: 3,
      nap_count_typical: 3,
      nap_length_minutes_min: 30,
      nap_length_minutes_max: 120,
      longest_night_stretch_hours: 6.5,
      wake_window_minutes_min: 90,
      wake_window_minutes_max: 150,
      what_is_normal: [
        "Wide range is normal — some sleep 12h straight, others wake 4 times",
        "Both extremes are within normal developmental range",
        "Developmental leaps (rolling, grabbing) disrupt sleep temporarily",
      ],
      common_challenges: [
        "Early morning waking",
        "Rolling in the crib",
        "Night feeds still common and biologically normal",
      ],
      parent_tip:
        "Follow wake windows and offer full feeds; avoid stretching awake time hoping for longer sleep — overtired babies wake more.",
      regression_risk: false,
      regression_note: null,
    };
  }

  if (age < 8) {
    return {
      age_label: "6–8 months",
      total_hours_min: 12,
      total_hours_max: 14,
      total_hours_typical: 13,
      night_sleep_hours: 11,
      nap_count_min: 2,
      nap_count_max: 3,
      nap_count_typical: 2,
      nap_length_minutes_min: 45,
      nap_length_minutes_max: 120,
      longest_night_stretch_hours: 7,
      wake_window_minutes_min: 120,
      wake_window_minutes_max: 180,
      what_is_normal: [
        "3-to-2 nap transition usually happens 6–8 months",
        "Separation anxiety begins — causes new night waking",
        "Standing in crib — new skill disrupts sleep temporarily",
      ],
      common_challenges: [
        "Early waking",
        "Split nights",
        "Teething discomfort",
      ],
      parent_tip:
        "Protect the first nap — it anchors the day when dropping the third nap.",
      regression_risk: true,
      regression_note:
        "6-month regression linked to major developmental leap (sitting, object permanence, separation anxiety beginning)",
    };
  }

  if (age < 10) {
    return {
      age_label: "8–10 months",
      total_hours_min: 12,
      total_hours_max: 14,
      total_hours_typical: 13,
      night_sleep_hours: 11.5,
      nap_count_min: 2,
      nap_count_max: 2,
      nap_count_typical: 2,
      nap_length_minutes_min: 45,
      nap_length_minutes_max: 120,
      longest_night_stretch_hours: 8,
      wake_window_minutes_min: 150,
      wake_window_minutes_max: 210,
      what_is_normal: [
        "Separation anxiety peaks — night waking and difficulty settling",
        "Crawling and pulling to stand disrupt sleep as brain practises skills overnight",
        "Some babies drop to 2 naps fully, some still need 2 solid naps",
      ],
      common_challenges: [
        "Standing and not knowing how to lie back down",
        "Nap refusal when overtired",
      ],
      parent_tip:
        "Predictable short routines before naps and bedtime matter more than any single technique.",
      regression_risk: true,
      regression_note:
        "8–9 month regression coincides with separation anxiety peak. This is the hardest regression for many families. It lasts 3–6 weeks typically.",
    };
  }

  if (age < 12) {
    return {
      age_label: "10–12 months",
      total_hours_min: 11,
      total_hours_max: 14,
      total_hours_typical: 12,
      night_sleep_hours: 11.5,
      nap_count_min: 2,
      nap_count_max: 2,
      nap_count_typical: 2,
      nap_length_minutes_min: 45,
      nap_length_minutes_max: 120,
      longest_night_stretch_hours: 9,
      wake_window_minutes_min: 180,
      wake_window_minutes_max: 240,
      what_is_normal: [
        "Some babies attempt to drop to 1 nap — too early, fight it",
        "If offering 1 nap before 15 months, most children become overtired",
        "1 year molars can disrupt sleep dramatically",
      ],
      common_challenges: [
        "Early 1-nap transition attempts",
        "Milestone-related night practice",
      ],
      parent_tip:
        "Hold the 2-nap schedule until at least 15 months for most babies — undertired schedules backfire.",
      regression_risk: false,
      regression_note: null,
    };
  }

  if (age < 15) {
    return {
      age_label: "12–15 months",
      total_hours_min: 11,
      total_hours_max: 14,
      total_hours_typical: 13,
      night_sleep_hours: 11.5,
      nap_count_min: 1,
      nap_count_max: 2,
      nap_count_typical: 2,
      nap_length_minutes_min: 45,
      nap_length_minutes_max: 180,
      longest_night_stretch_hours: 10,
      wake_window_minutes_min: 180,
      wake_window_minutes_max: 240,
      what_is_normal: [
        "Attempting to drop to 1 nap — most children not ready until 15–18 months",
        "Walking onset consistently disrupts sleep for 2–4 weeks",
        "Increased resistance to sleep (independence developing)",
      ],
      common_challenges: [
        "Inconsistent 1-nap vs 2-nap days",
        "Early waking from overtiredness",
      ],
      parent_tip:
        "Cap the first nap if bedtime is drifting late — protect night sleep length.",
      regression_risk: true,
      regression_note:
        "12-month regression. Walking is the major disruptor. Brain is so busy learning to walk that sleep suffers. Usually 2–6 weeks.",
    };
  }

  if (age < 18) {
    return {
      age_label: "15–18 months",
      total_hours_min: 11,
      total_hours_max: 14,
      total_hours_typical: 12.5,
      night_sleep_hours: 11.5,
      nap_count_min: 1,
      nap_count_max: 2,
      nap_count_typical: 1,
      nap_length_minutes_min: 90,
      nap_length_minutes_max: 180,
      longest_night_stretch_hours: 10,
      wake_window_minutes_min: 240,
      wake_window_minutes_max: 360,
      what_is_normal: [
        "2-to-1 nap transition typically 15–18 months",
        "First weeks of 1-nap schedule — overtiredness and early bedtime (6–6:30pm)",
        "Increased bedtime protest — normal, not a sleep problem",
      ],
      common_challenges: [
        "Early waking during nap transition",
        "Short naps while adjusting",
      ],
      parent_tip:
        "Temporary early bedtime is normal when consolidating to one nap — prioritize total sleep.",
      regression_risk: true,
      regression_note:
        "18-month regression is the most intense of the toddler regressions. Language explosion, increased awareness, molar pain, and separation anxiety combine. Can last 4–8 weeks. Very common to need parental presence to fall asleep again temporarily.",
    };
  }

  const expectations18to24: SleepExpectations = {
    age_label: "18–24 months",
    total_hours_min: 11,
    total_hours_max: 14,
    total_hours_typical: 12,
    night_sleep_hours: 11.5,
    nap_count_min: 1,
    nap_count_max: 1,
    nap_count_typical: 1,
    nap_length_minutes_min: 60,
    nap_length_minutes_max: 120,
    longest_night_stretch_hours: 10,
    wake_window_minutes_min: 300,
    wake_window_minutes_max: 360,
    what_is_normal: [
      "Nap resistance is very common — nap is still needed until 3–4 years",
      "Rest time even without sleep has value",
      "Nightmares and night terrors begin — different, both normal",
      "Climbing out of crib — transition to toddler bed consideration",
    ],
    common_challenges: [
      "Nap strikes",
      "Bedtime battles",
      "Night terrors (benign but frightening)",
    ],
    parent_tip:
      "Nap resistance does not mean nap is not needed. Most children need a nap until age 3. Keep the routine even if sleep doesn't happen.",
    regression_risk: false,
    regression_note: null,
  };

  if (age > 24) {
    return {
      ...expectations18to24,
      age_label: "18–24 months (and older — same general guidance)",
    };
  }

  return expectations18to24;
}

// -----------------------------------------------------------------------------
// Safe sleep checklist (AAP 2022)
// -----------------------------------------------------------------------------

export function getSafeSleepChecklist(): SafeSleepItem[] {
  return [
    {
      code: "BACK_SLEEP",
      category: "position",
      title: "Always place baby on their back to sleep",
      description: "For every sleep period — naps and night.",
      why_it_matters:
        "Back sleeping reduces SIDS risk by about 50% — the most important single action.",
      is_critical: true,
      age_relevant_until_months: 12,
    },
    {
      code: "FIRM_FLAT_SURFACE",
      category: "environment",
      title: "Use a firm, flat sleep surface",
      description:
        "A safety-approved crib, bassinet, or play yard with a firm mattress and fitted sheet only.",
      why_it_matters:
        "Soft surfaces (sofas, armchairs, adult beds, soft mattresses) are implicated in a large share of sleep-related infant deaths.",
      is_critical: true,
      age_relevant_until_months: 12,
    },
    {
      code: "BARE_SLEEP_AREA",
      category: "environment",
      title: "Keep the sleep area bare",
      description:
        "No pillows, bumpers, loose blankets, stuffed animals, wedges, or positioners in the crib.",
      why_it_matters: "These items pose suffocation and entrapment risk.",
      is_critical: true,
      age_relevant_until_months: 12,
    },
    {
      code: "OWN_SLEEP_SURFACE",
      category: "sharing",
      title: "Baby has their own sleep surface",
      description:
        "Same room as parents but separate surface is ideal for the first 6 months (AAP recommends room sharing up to 12 months).",
      why_it_matters: "Room sharing without bed sharing reduces SIDS risk.",
      is_critical: true,
      age_relevant_until_months: 12,
    },
    {
      code: "NO_SMOKING",
      category: "environment",
      title: "Smoke-free environment",
      description: "No smoking during pregnancy or around baby — including second-hand smoke.",
      why_it_matters:
        "Parental smoking is one of the strongest independent risk factors for SIDS.",
      is_critical: true,
      age_relevant_until_months: null,
    },
    {
      code: "NO_SOFA_SLEEP",
      category: "sharing",
      title: "Never sleep on a sofa or armchair with baby",
      description: "Do not fall asleep while feeding or holding baby on a couch or recliner.",
      why_it_matters:
        "This is one of the highest-risk sleep situations — responsible for a disproportionate number of infant sleep deaths.",
      is_critical: true,
      age_relevant_until_months: 12,
    },
    {
      code: "ROOM_TEMPERATURE",
      category: "environment",
      title: "Keep room 18–20°C (64–68°F)",
      description: "Avoid overheating the room or bundling baby too warmly.",
      why_it_matters: "Overheating is a SIDS risk factor — baby should feel warm, not hot.",
      is_critical: false,
      age_relevant_until_months: 12,
    },
    {
      code: "NO_OVERHEATING",
      category: "clothing",
      title: "Dress appropriately — check back of neck, not hands or feet",
      description:
        "One layer more than you would wear is a common guideline. Hands and feet are often cool — check torso/neck for temperature.",
      why_it_matters: "Overbundling contributes to overheating.",
      is_critical: false,
      age_relevant_until_months: 12,
    },
    {
      code: "WHITE_NOISE",
      category: "environment",
      title: "White noise (optional)",
      description:
        "Consistent white noise at moderate volume (about 50–60 dB) can help extend sleep. Not required for safe sleep.",
      why_it_matters: "Can mask household noise; keep volume safe and device away from crib.",
      is_critical: false,
      age_relevant_until_months: null,
    },
    {
      code: "TUMMY_TIME_AWAKE",
      category: "position",
      title: "Tummy time when awake and supervised",
      description:
        "Supervised tummy time every day supports development and reduces positional plagiocephaly. Not for unsupervised sleep.",
      why_it_matters: "Strengthens muscles needed for motor milestones.",
      is_critical: false,
      age_relevant_until_months: null,
    },
    {
      code: "SIDE_SLEEPING_NO",
      category: "position",
      title: "No side sleeping — back only for placement",
      description:
        "Side sleeping is unstable and not recommended for placement. Once baby can roll both ways, continue to place on back.",
      why_it_matters: "Side position can shift to prone; back is safest for initial placement.",
      is_critical: false,
      age_relevant_until_months: 12,
    },
    {
      code: "BED_SHARING_RISK",
      category: "sharing",
      title: "Understand bed-sharing risks",
      description:
        "Bed sharing on a firm adult mattress without pillows, blankets, or alcohol/medication is lower risk than sofa sharing, but still higher than a separate infant surface. If bed sharing, follow current harm-reduction guidance from your clinician.",
      why_it_matters: "Informed decisions require understanding relative risks.",
      is_critical: false,
      age_relevant_until_months: 12,
    },
  ];
}

// -----------------------------------------------------------------------------
// Sleep regressions
// -----------------------------------------------------------------------------

export function getSleepRegressions(): SleepRegression[] {
  return [
    {
      age_months: 4,
      age_label: "4 months",
      duration_weeks_min: 2,
      duration_weeks_max: 6,
      why_it_happens:
        "Sleep architecture permanently shifts from newborn (mostly deep sleep) to adult-like cycles (alternating light and deep). Baby now wakes between cycles and may not yet self-settle.",
      signs: [
        "Previously good sleeper now waking every 45–90 minutes",
        "Short naps",
        "Hard to put down",
        "Nothing seems to help",
      ],
      what_helps: [
        "Flexible response, full feeds before bed, earlier bedtime",
        "Extra contact naps if needed",
        "Some parents begin gentle sleep training when ready",
      ],
      what_doesnt_help:
        "Changing formula, introducing solids early, or keeping baby awake longer hoping they will sleep more.",
      reassurance:
        "This is permanent neurological development — it would have happened regardless of what you did. It is not your fault.",
    },
    {
      age_months: 6,
      age_label: "6 months",
      duration_weeks_min: 2,
      duration_weeks_max: 6,
      why_it_happens:
        "Major motor and cognitive leaps — sitting, object permanence, and the beginning of separation anxiety can increase night waking and nap resistance.",
      signs: [
        "More night waking",
        "Fussier settle",
        "Nap transitions beginning",
      ],
      what_helps: [
        "Consistent routines",
        "Age-appropriate wake windows",
        "Reassurance without long props if that matches your family",
      ],
      what_doesnt_help:
        "Skipping naps repeatedly to force longer night sleep — often backfires via overtiredness.",
      reassurance:
        "A difficult patch at 6 months is common and usually improves as skills consolidate.",
    },
    {
      age_months: 8.5,
      age_label: "8–9 months",
      duration_weeks_min: 3,
      duration_weeks_max: 6,
      why_it_happens:
        "Separation anxiety peak, crawling/standing skill development, object permanence — baby understands you exist when out of sight and may protest.",
      signs: [
        "Previously settling alone now needs company",
        "Night waking with crying",
        "Nap refusal",
        "More clingy during the day",
      ],
      what_helps: [
        "Extra reassurance",
        "Consistent response",
        "Brief check-ins",
        "Predictable routine is most important during regressions",
      ],
      what_doesnt_help:
        "Inconsistent rules night to night — babies notice patterns quickly.",
      reassurance:
        "This means your baby has formed a strong secure attachment. It is a sign of healthy development, not a sleep problem.",
    },
    {
      age_months: 12,
      age_label: "12 months",
      duration_weeks_min: 2,
      duration_weeks_max: 6,
      why_it_happens:
        "Walking and language burst — brain is busy with new skills; schedule shifts (nap transition attempts) add chaos.",
      signs: [
        "Night waking",
        "Early rising",
        "Fighting naps or bedtime",
      ],
      what_helps: [
        "Protect total sleep with earlier bedtime if needed",
        "Safe practice space for new motor skills in the day",
      ],
      what_doesnt_help:
        "Dropping to one nap too early for most babies — leads to overtiredness.",
      reassurance:
        "Many families see a few rough weeks around the first birthday — it usually settles.",
    },
    {
      age_months: 18,
      age_label: "18 months",
      duration_weeks_min: 4,
      duration_weeks_max: 8,
      why_it_happens:
        "Language explosion, increased self-awareness and autonomy, second molars, separation anxiety resurgence, nightmares beginning.",
      signs: [
        "Bedtime battles returning",
        "Night waking",
        "Increased need for parent presence to fall asleep",
        "Late-night parties",
      ],
      what_helps: [
        "Earlier bedtime (critical when overtired)",
        "Consistent simple routine",
        "Brief reassurance without long interventions",
        "Address teething pain with clinician-approved care",
      ],
      what_doesnt_help:
        "Escalating battles at bedtime — consistency beats intensity.",
      reassurance:
        "This is the most commonly misunderstood regression. Parents often think sleep training has stopped working. It has not — the regression is temporary.",
    },
  ];
}

// -----------------------------------------------------------------------------
// Nap schedules
// -----------------------------------------------------------------------------

const DROP_SIGNS_3_TO_2 =
  "Consistently refusing the third nap for 2+ weeks, or taking a very long time to fall asleep at the start of the third nap.";

const DROP_SIGNS_2_TO_1 =
  "Taking very long to fall asleep for the morning nap, afternoon nap then pushes bedtime very late, or skipping the morning nap and still taking a solid ~2h afternoon nap with a normal bedtime.";

const DROP_SIGNS_1_TO_0 =
  "Lying quietly without sleeping, taking longer than 30 minutes to fall asleep for nap, or nighttime sleep not suffering when nap is skipped. Most children are not ready to drop the nap until 3–4 years — do not rush this transition.";

export function getNapSchedule(ageMonths: number): NapSchedule {
  const age = clampAge(ageMonths);

  if (age < 3) {
    return {
      age_label: "0–3 months",
      nap_count: 5,
      schedule_example:
        "No fixed clock schedule — offer sleep after 45–90 minutes awake, or at first sleepy cues.",
      wake_windows: "45–90 minutes (shorter in the newborn weeks).",
      drop_signs: "Not applicable — follow baby's lead entirely.",
      transition_note: null,
    };
  }

  if (age < 6) {
    return {
      age_label: "3–6 months",
      nap_count: 4,
      schedule_example:
        "Often 3–4 naps: short morning, longer midday, late afternoon catnap. Example: 9 / 12 / 3 / 5:30 (adjust to your day).",
      wake_windows: "About 1.5–2 hours between sleeps (extend toward 6 months).",
      drop_signs: DROP_SIGNS_3_TO_2,
      transition_note: "Third nap often becomes a catnap before dropping.",
    };
  }

  if (age < 8) {
    return {
      age_label: "6–8 months",
      nap_count: 2,
      schedule_example:
        "Moving from 3 naps to 2: morning ~9–10, afternoon ~1–3. Exact times depend on night sleep and wake time.",
      wake_windows: "2–3 hours (longer before bed).",
      drop_signs: DROP_SIGNS_3_TO_2,
      transition_note: "Typical window for the 3-to-2 nap drop.",
    };
  }

  if (age < 15) {
    return {
      age_label: "8–15 months",
      nap_count: 2,
      schedule_example:
        "Two naps: morning and afternoon. Protect a reasonable bedtime — cap late nap if needed.",
      wake_windows: "3–4 hours (longest before bed).",
      drop_signs: DROP_SIGNS_2_TO_1,
      transition_note: "Do not rush to one nap before ~15–18 months for most children.",
    };
  }

  if (age < 18) {
    return {
      age_label: "15–18 months",
      nap_count: 1,
      schedule_example:
        "One nap after lunch, often 12:30–2:30 or 1–3. Early bedtime (6–6:30) is common during transition.",
      wake_windows: "5–6 hours before nap; shorter stretch to bedtime early in transition.",
      drop_signs: DROP_SIGNS_2_TO_1,
      transition_note: "Rough patch of overtiredness is normal for several weeks.",
    };
  }

  return {
    age_label: "18–24 months",
    nap_count: 1,
    schedule_example:
      "Single afternoon nap after lunch; total nap often 1–2 hours. Quiet rest still helps if sleep is short.",
    wake_windows: "5–6 hours before nap; 5–6 hours before bed.",
    drop_signs: DROP_SIGNS_1_TO_0,
    transition_note: null,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function dayBoundsLocal(dateStr: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const start = new Date(y, mo, d, 0, 0, 0, 0);
  const end = new Date(y, mo, d + 1, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end };
}

function overlapMinutes(
  segStart: Date,
  segEnd: Date,
  dayStart: Date,
  dayEnd: Date
): number {
  const a = Math.max(segStart.getTime(), dayStart.getTime());
  const b = Math.min(segEnd.getTime(), dayEnd.getTime());
  if (b <= a) return 0;
  return Math.round((b - a) / 60000);
}

export function calculateSleepSummary(
  logs: Array<{
    sleep_start: string;
    sleep_end: string | null;
    sleep_type: string;
  }>,
  date: string
): SleepSummary {
  const bounds = dayBoundsLocal(date);
  if (!bounds) {
    return {
      total_sleep_minutes: 0,
      night_sleep_minutes: 0,
      nap_minutes: 0,
      nap_count: 0,
      longest_stretch_minutes: 0,
      last_wake_time: null,
      currently_sleeping: false,
    };
  }

  const { start: dayStart, end: dayEnd } = bounds;
  const now = new Date();

  let total_sleep_minutes = 0;
  let night_sleep_minutes = 0;
  let nap_minutes = 0;
  let nap_count = 0;
  let longest_stretch_minutes = 0;
  let lastWake: Date | null = null;
  let currently_sleeping = false;

  for (const log of logs) {
    const ss = new Date(log.sleep_start);
    if (Number.isNaN(ss.getTime())) continue;

    const segEnd = log.sleep_end == null ? now : new Date(log.sleep_end);
    if (log.sleep_end != null && Number.isNaN(segEnd.getTime())) continue;

    const mins = overlapMinutes(ss, segEnd, dayStart, dayEnd);
    if (mins <= 0) continue;

    total_sleep_minutes += mins;

    if (log.sleep_type === "night") {
      night_sleep_minutes += mins;
    } else {
      nap_minutes += mins;
      if (log.sleep_type === "nap") {
        nap_count += 1;
      }
    }

    if (mins > longest_stretch_minutes) {
      longest_stretch_minutes = mins;
    }

    if (log.sleep_end != null) {
      const we = new Date(log.sleep_end);
      if (!Number.isNaN(we.getTime()) && we >= dayStart && we < dayEnd) {
        if (!lastWake || we > lastWake) {
          lastWake = we;
        }
      }
    } else {
      currently_sleeping = true;
    }
  }

  return {
    total_sleep_minutes,
    night_sleep_minutes,
    nap_minutes,
    nap_count,
    longest_stretch_minutes,
    last_wake_time: lastWake ? lastWake.toISOString() : null,
    currently_sleeping,
  };
}

const REGRESSION_PEAK_MONTHS = [4, 6, 8.5, 12, 18] as const;

export function isRegressionAge(ageMonths: number): boolean {
  const a = clampAge(ageMonths);
  return REGRESSION_PEAK_MONTHS.some(
    (peak) => Math.abs(a - peak) <= TWO_WEEKS_MONTHS
  );
}

/** Closest regression window when `isRegressionAge` is true; otherwise null. */
export function getMatchingSleepRegression(ageMonths: number): SleepRegression | null {
  const a = clampAge(ageMonths);
  if (!isRegressionAge(a)) return null;
  let best: SleepRegression | null = null;
  let bestD = Infinity;
  for (const r of getSleepRegressions()) {
    const d = Math.abs(a - r.age_months);
    if (d <= TWO_WEEKS_MONTHS && d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export function formatSleepDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return "0m";
  }
  const rounded = Math.round(minutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

function formatWakeWindowHuman(minMinutes: number, maxMinutes: number): string {
  if (maxMinutes <= 150) {
    return `${minMinutes}–${maxMinutes} minutes`;
  }
  const lo = minMinutes / 60;
  const hi = maxMinutes / 60;
  const fmt = (x: number) =>
    Number.isInteger(x) ? String(x) : x === 1.5 ? "1.5" : x.toFixed(1).replace(/\.0$/, "");
  return `${fmt(lo)}–${fmt(hi)} hours`;
}

export function getWakeWindowGuidance(ageMonths: number): string {
  const e = getSleepExpectations(ageMonths);
  const a = Math.floor(clampAge(ageMonths));
  const range = formatWakeWindowHuman(
    e.wake_window_minutes_min,
    e.wake_window_minutes_max
  );
  return `At ${a} months, watch for sleepy cues after about ${range} awake (${e.age_label}).`;
}
