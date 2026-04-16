/**
 * Core feeding guidance logic — Health Canada, Canadian Paediatric Society, WHO.
 * Pure TypeScript, no external dependencies.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type FeedingType =
  | "breastfeeding"
  | "formula"
  | "mixed"
  | "solids_starting"
  | "solids_established";

export interface FeedingGuidance {
  age_label: string;
  primary_message: string;
  frequency: string;
  volume_or_duration: string;
  what_is_normal: string[];
  hunger_cues: string[];
  fullness_cues: string[];
  watch_for: string[];
  tips: string[];
  health_canada_note: string | null;
}

export interface SolidsReadiness {
  ready: boolean;
  age_appropriate: boolean;
  checklist: Array<{ sign: string; met: boolean | null }>;
  message: string;
}

export interface AllergenProtocol {
  allergen: string;
  display_name: string;
  emoji: string;
  recommended_age_months: number;
  why_early: string;
  how_to_introduce: string;
  what_to_watch: string;
  reaction_signs: string[];
  leap_study_note: string | null;
}

export interface FeedingStage {
  stage: string;
  age_range: string;
  texture: string;
  frequency: string;
  description: string;
  example_foods: string[];
  foods_to_avoid: string[];
  self_feeding_notes: string;
}

const SOLIDS_SIGNS = [
  "Sits with minimal support and holds head steady",
  "Shows interest in food (reaches, opens mouth, watches others eat)",
  "Has lost tongue-thrust reflex (does not automatically push food out)",
] as const;

const ALLERGEN_KEYS = [
  "peanut",
  "egg",
  "dairy",
  "wheat",
  "soy",
  "tree_nut",
  "sesame",
  "fish",
  "shellfish",
] as const;

const RECOMMENDED_INTRO_MONTHS = 6;

// -----------------------------------------------------------------------------
// Feeding guidance by age
// -----------------------------------------------------------------------------

function clampAgeMonths(ageMonths: number): number {
  if (Number.isNaN(ageMonths) || ageMonths < 0) return 0;
  return ageMonths;
}

function ageLabel(ageMonths: number): string {
  const a = clampAgeMonths(ageMonths);
  if (a < 1) return "0–1 month (newborn)";
  if (a < 3) return "1–3 months";
  if (a < 6) return "3–6 months";
  if (a < 7) return "Around 6 months (starting solids)";
  if (a < 8) return "6–8 months";
  if (a < 12) return "8–12 months";
  if (a < 18) return "12–18 months";
  if (a < 24) return "18–24 months";
  return "24+ months";
}

function newbornGuidance(feedingType: FeedingType): FeedingGuidance {
  const bfFreq = "8–12 feeds per 24 hours, roughly every 1.5–3 hours.";
  const bfVol = "About 10–45 minutes per breast per feed; both sides as needed.";
  const ffFreq = "8–12 feeds per 24 hours, roughly every 2–3 hours.";
  const ffVol = "About 60–90 ml per feed to start; follow baby’s cues.";

  let primary_message: string;
  let frequency: string;
  let volume_or_duration: string;

  if (feedingType === "breastfeeding") {
    primary_message =
      "Frequent feeding builds your milk supply and helps baby regain birth weight.";
    frequency = bfFreq;
    volume_or_duration = bfVol;
  } else if (feedingType === "formula") {
    primary_message =
      "Formula-fed newborns need regular feeds on a similar rhythm to breastfed babies.";
    frequency = ffFreq;
    volume_or_duration = ffVol;
  } else if (feedingType === "mixed") {
    primary_message =
      "Whether breast, formula, or both, responsive feeding on cue is the goal.";
    frequency = `Breastfeeding: ${bfFreq} Formula: ${ffFreq}`;
    volume_or_duration = `Breast: ${bfVol} Formula: ${ffVol}`;
  } else {
    primary_message =
      "Before 6 months, nutrition is breast milk or formula only—solids are not needed yet.";
    frequency = bfFreq;
    volume_or_duration = bfVol;
  }

  return {
    age_label: ageLabel(0),
    primary_message,
    frequency,
    volume_or_duration,
    what_is_normal: [
      "Cluster feeding in the evenings is common and helps increase supply.",
      "Colostrum transitions to mature milk around days 3–5.",
      "Weight loss up to about 7% in the first week can be normal; most babies regain birth weight by day 10–14.",
    ],
    hunger_cues: [
      "Rooting, turning toward the breast or bottle",
      "Sucking on hands, smacking lips",
      "Restlessness before a usual feed time",
    ],
    fullness_cues: [
      "Releases breast or bottle, turns away",
      "Relaxed hands, falls asleep or is content",
    ],
    watch_for: [
      "Fewer than 6 wet diapers daily after day 5",
      "Worsening jaundice or very sleepy baby who won’t wake to feed",
      "Poor feeding with signs of dehydration",
    ],
    tips: [
      "Feed on early cues; crying is a late cue.",
      "Skin-to-skin can help with latching and regulation.",
    ],
    health_canada_note:
      "Follow safe preparation of formula and sterilize equipment as directed; breast milk is the normal food for infants.",
  };
}

function oneToThreeGuidance(feedingType: FeedingType): FeedingGuidance {
  const bfFreq = "Often 7–9 feeds per 24 hours; some babies stretch to 3–4 hours between feeds.";
  const bfVol = "Variable—follow baby’s cues; typical feeds may shorten as baby becomes more efficient.";
  const ffFreq = "Often every 3–4 hours; 4–8 feeds per 24 hours depending on baby.";
  const ffVol = "Often about 90–150 ml per feed; total intake varies by baby and day.";

  let primary_message: string;
  let frequency: string;
  let volume_or_duration: string;

  if (feedingType === "breastfeeding") {
    primary_message = "Feeds may become a bit more predictable; growth spurts can temporarily increase frequency.";
    frequency = bfFreq;
    volume_or_duration = bfVol;
  } else if (feedingType === "formula") {
    primary_message = "Formula volume typically increases gradually; watch hunger and fullness cues.";
    frequency = ffFreq;
    volume_or_duration = ffVol;
  } else if (feedingType === "mixed") {
    primary_message = "Combine responsive breastfeeding with formula volumes that match your care provider’s guidance.";
    frequency = `Breastfeeding: ${bfFreq} Formula: ${ffFreq}`;
    volume_or_duration = `Breast: ${bfVol} Formula: ${ffVol}`;
  } else {
    primary_message = "Solids are not recommended yet—milk feeds remain the only nutrition needed.";
    frequency = bfFreq;
    volume_or_duration = bfVol;
  }

  return {
    age_label: ageLabel(1),
    primary_message,
    frequency,
    volume_or_duration,
    what_is_normal: [
      "Growth spurts around 3 weeks, 6 weeks, and 3 months may cause temporary cluster feeding.",
      "Some babies sleep longer stretches at night.",
    ],
    hunger_cues: [
      "Earlier feeding cues before crying",
      "Increased rooting or hand-to-mouth",
    ],
    fullness_cues: [
      "Turning away, closing lips, pushing bottle away",
    ],
    watch_for: [
      "Painful latch or damaged nipples (breastfeeding)",
      "Signs of tongue tie affecting feeding (discuss with a clinician)",
      "Slow weight gain or falling percentiles—seek assessment",
    ],
    tips: [
      "Keep feeding on cue; avoid strict schedules in the early months.",
    ],
    health_canada_note: null,
  };
}

function threeToSixGuidance(feedingType: FeedingType): FeedingGuidance {
  const bfFreq = "Often 5–8 feeds per 24 hours; longer stretches overnight may appear.";
  const bfVol = "Breastfeeding duration varies; efficiency usually improves.";
  const ffFreq = "Often 4–6 feeds per 24 hours.";
  const ffVol =
    "Often about 150–210 ml per feed; total formula usually stays under about 800 ml/day (not more than ~900 ml).";

  let primary_message: string;
  let frequency: string;
  let volume_or_duration: string;

  if (feedingType === "breastfeeding") {
    primary_message = "Breast milk remains the main nutrition; night feeds are still common and normal.";
    frequency = bfFreq;
    volume_or_duration = bfVol;
  } else if (feedingType === "formula") {
    primary_message =
      "Formula volumes level out; avoid overfeeding—follow fullness cues and typical daily totals.";
    frequency = ffFreq;
    volume_or_duration = ffVol;
  } else if (feedingType === "mixed") {
    primary_message = "Balance breast and bottle feeds; discuss total formula with your care provider if unsure.";
    frequency = `Breastfeeding: ${bfFreq} Formula: ${ffFreq}`;
    volume_or_duration = `Breast: ${bfVol} Formula: ${ffVol}`;
  } else {
    primary_message =
      "Complementary foods are not recommended before about 6 months unless advised by a clinician.";
    frequency = bfFreq;
    volume_or_duration = bfVol;
  }

  return {
    age_label: ageLabel(3),
    primary_message,
    frequency,
    volume_or_duration,
    what_is_normal: [
      "Longer gaps overnight for some babies.",
      "Showing interest when others eat is common—but it does not mean baby is ready for solids before ~6 months.",
    ],
    hunger_cues: [
      "Cues similar to earlier months, sometimes more vocal",
    ],
    fullness_cues: [
      "Clear stop signals: turning, sealing lips, pushing away",
    ],
    watch_for: [
      "Starting solids too early (before 6 months) is not recommended for most babies.",
      "If weight gain is a concern, seek individualized guidance.",
    ],
    tips: [
      "This is a good window to plan for iron-rich first foods when baby reaches ~6 months and shows readiness signs.",
    ],
    health_canada_note:
      "Health Canada recommends starting complementary foods at about 6 months while continuing breast milk (or formula).",
  };
}

function sixMonthsSolidsStarting(feedingType: FeedingType): FeedingGuidance {
  const solidsLine =
    feedingType === "solids_established"
      ? "If solids are already going well, keep advancing texture and variety."
      : "Begin with 1–2 small meals per day alongside milk feeds.";

  const primary_message =
    feedingType === "formula" || feedingType === "breastfeeding"
      ? "Around 6 months, add complementary foods while continuing milk as the main drink."
      : feedingType === "mixed"
        ? "Continue breast and/or formula and add complementary foods when developmentally ready."
        : solidsLine;

  const freqBreast = "Breastfeeding: continue about 4–6 times per day alongside solids.";
  const freqFormula = "Formula: often about 600–900 ml per day alongside solids (individual needs vary).";
  const freqSolids =
    feedingType === "solids_established"
      ? "Solids: building toward 2–3 meals as baby accepts them."
      : "Solids: start with 1–2 meals per day, about 2–3 tablespoons per meal to begin.";

  return {
    age_label: ageLabel(6),
    primary_message,
    frequency: `${freqBreast} ${freqFormula} ${freqSolids}`,
    volume_or_duration:
      "Iron-rich first foods (meat, fish, eggs, legumes, iron-fortified infant cereals); smooth purees or mashed textures; no added salt or sugar; no honey before 1 year.",
    what_is_normal: [
      "Messy eating, small intakes at first, and gradual increase are expected.",
      "Milk remains the primary source of nutrition early in complementary feeding.",
    ],
    hunger_cues: [
      "Leaning forward, opening mouth for the spoon",
      "Excitement when food is offered",
    ],
    fullness_cues: [
      "Turning away, closing mouth, playing with food instead of eating",
    ],
    watch_for: [
      "Choking—always supervise; appropriate texture for age",
      "Highly restrictive patterns—seek support if concerned",
    ],
    tips: [
      "Offer iron-rich foods first—this is emphasized in Canadian guidance.",
      "Repeat exposures; many babies need several tries before accepting a new food.",
    ],
    health_canada_note:
      "Health Canada specifically recommends introducing iron-rich foods first among complementary foods—this differs from some other international guidelines.",
  };
}

function sixToEightGuidance(feedingType: FeedingType): FeedingGuidance {
  const solids =
    feedingType === "solids_starting"
      ? "Move toward 2–3 meals per day as baby tolerates."
      : "Aim for 2–3 meals per day; textures can advance.";

  return {
    age_label: ageLabel(7),
    primary_message:
      "Textures advance from smooth to mashed with soft lumps; finger foods can begin when baby is ready.",
    frequency: `Breastfeeding/formula continues. ${solids} Work toward introducing all major allergens before 12 months if medically appropriate.`,
    volume_or_duration:
      "Offer soft finger foods (e.g. soft avocado, well-cooked vegetables); continue responsive milk feeds.",
    what_is_normal: [
      "Gagging can occur as textures change—supervise closely and offer appropriate sizes.",
      "Variable appetite day to day is normal.",
    ],
    hunger_cues: [
      "Reaching for food, fussing at usual meal times",
    ],
    fullness_cues: [
      "Distracted eating, turning away, playing",
    ],
    watch_for: [
      "Signs of allergic reaction when introducing new foods",
      "Unsafe foods for texture or size (choking hazards)",
    ],
    tips: [
      "Introduce common allergens one at a time in a pattern you can sustain; discuss with your clinician if your baby has risk factors.",
    ],
    health_canada_note:
      "Canadian guidance aligns with evidence that introducing common allergens in the first year—when ready for solids—reduces allergy risk for many children.",
  };
}

function eightToTwelveGuidance(feedingType: FeedingType): FeedingGuidance {
  return {
    age_label: ageLabel(9),
    primary_message:
      "Many babies eat 3 meals plus 1–2 snacks; breast milk or formula remains important.",
    frequency:
      feedingType === "formula"
        ? "Formula: follow care provider guidance for volume as solids increase."
        : "Breastfeeding: often 3–4 times per day or on cue; formula-fed babies: volumes taper as solids grow.",
    volume_or_duration:
      "Family-style soft foods; self-feeding with fingers; practice with an open cup or straw cup with water at meals.",
    what_is_normal: [
      "Picky moments and variable appetite.",
      "Improving dexterity with finger foods.",
    ],
    hunger_cues: [
      "Pointing at food, coming to the table, signs of impatience for meals",
    ],
    fullness_cues: [
      "Leaving the table, throwing food, losing interest",
    ],
    watch_for: [
      "Honey before 1 year (botulism risk)",
      "Whole nuts, hard chunks, whole grapes—choking hazards",
    ],
    tips: [
      "Offer water with meals in a cup; limit sugary drinks.",
      "Share safe family foods without added salt or sugar when possible.",
    ],
    health_canada_note:
      "Avoid juice under 2 years—Health Canada’s 2023 guidance recommends no juice for children under 2.",
  };
}

function twelveToEighteenGuidance(feedingType: FeedingType): FeedingGuidance {
  return {
    age_label: ageLabel(12),
    primary_message:
      "Toddler-style eating: 3 meals and 2 snacks; whole cow’s milk can be offered as a drink after 12 months if appropriate. Offer water with meals; Health Canada’s 2023 guidance does not recommend fruit juice for children under 2 years.",
    frequency:
      "About 500 ml/day of whole cow’s milk as a drink (not before 12 months as a main drink). Breastfeeding can continue as long as parent and child wish.",
    volume_or_duration:
      "Self-feeding with fingers and spoon—mess is developmentally valuable. Offer modified family meals.",
    what_is_normal: [
      "Erratic appetite and food refusal on some days.",
      "Strong preferences that shift over time.",
    ],
    hunger_cues: [
      "Asking for food, going to the fridge or table",
    ],
    fullness_cues: [
      "Shaking head, leaving food on the plate, wandering off",
    ],
    watch_for: [
      "Excess milk displacing iron-rich foods",
      "Choking hazards: whole grapes, whole nuts, hard raw vegetables",
    ],
    tips: [
      "No juice under 2 years (Health Canada 2023).",
      "Offer water as the main drink besides milk.",
    ],
    health_canada_note:
      "Health Canada (2023): no fruit juice for children under 2 years—water and milk are preferred drinks.",
  };
}

function eighteenToTwentyFourGuidance(feedingType: FeedingType): FeedingGuidance {
  return {
    age_label: ageLabel(18),
    primary_message:
      "Picky eating and food neophobia often peak—this is common, not a sign you failed.",
    frequency:
      "3 meals and 2 snacks. Cow’s milk often around 500 ml/day; not more than about 750 ml so iron foods aren’t displaced.",
    volume_or_duration:
      "Follow the division of responsibility: parent decides what, when, where; child decides how much. Never force-feed.",
    what_is_normal: [
      "Refusing new foods repeatedly—10–15 exposures before acceptance can be normal.",
      "Messy self-feeding and uneven intake across days.",
    ],
    hunger_cues: [
      "Asking for snacks, interest when food is prepared",
    ],
    fullness_cues: [
      "Stopping mid-meal, playing, saying “all done”",
    ],
    watch_for: [
      "Pressure to eat—can worsen picky eating",
      "Replacing meals with large amounts of milk",
    ],
    tips: [
      "Offer a variety without pressure; model eating a range of foods.",
      "Trust Ellyn Satter’s division of responsibility framework.",
    ],
    health_canada_note: null,
  };
}

export function getFeedingGuidance(
  ageMonths: number,
  feedingType: FeedingType,
): FeedingGuidance {
  const age = clampAgeMonths(ageMonths);

  if (age < 1) return newbornGuidance(feedingType);
  if (age < 3) return oneToThreeGuidance(feedingType);
  if (age < 6) return threeToSixGuidance(feedingType);
  if (age < 7) return sixMonthsSolidsStarting(feedingType);
  if (age < 8) return sixToEightGuidance(feedingType);
  if (age < 12) return eightToTwelveGuidance(feedingType);
  if (age < 18) return twelveToEighteenGuidance(feedingType);
  if (age < 24) return eighteenToTwentyFourGuidance(feedingType);
  // Ages 24+ months: reuse 18–24 month guidance (same developmental band for this tool)
  return {
    ...eighteenToTwentyFourGuidance(feedingType),
    age_label: ageLabel(age),
  };
}

// -----------------------------------------------------------------------------
// Solids readiness
// -----------------------------------------------------------------------------

export function getSolidsReadiness(
  ageMonths: number,
  parentAnswers?: {
    sitsWithSupport: boolean | null;
    showsInterest: boolean | null;
    lostTongueThrust: boolean | null;
  },
): SolidsReadiness {
  const age = clampAgeMonths(ageMonths);

  const checklist: SolidsReadiness["checklist"] = SOLIDS_SIGNS.map((sign, i) => {
    const keys = ["sitsWithSupport", "showsInterest", "lostTongueThrust"] as const;
    const v = parentAnswers?.[keys[i]];
    return { sign, met: v === undefined ? null : v };
  });

  const allMet =
    checklist.length === 3 &&
    checklist[0].met === true &&
    checklist[1].met === true &&
    checklist[2].met === true;

  if (age < 4) {
    return {
      ready: false,
      age_appropriate: false,
      checklist,
      message:
        "Solids are not recommended before about 4 months. Breast milk or formula alone is enough; wait until closer to 6 months and recheck readiness signs.",
    };
  }

  if (age < 6) {
    return {
      ready: allMet,
      age_appropriate: true,
      checklist,
      message: allMet
        ? "Baby may be showing readiness, but most families still wait until about 6 months. Confirm with your care provider and continue milk feeds as the main nutrition."
        : "Baby may be approaching readiness. Wait until about 6 months and until all three developmental signs are clearly present before starting solids.",
    };
  }

  if (age > 6) {
    return {
      ready: true,
      age_appropriate: true,
      checklist,
      message:
        "After 6 months, complementary foods should be underway for most babies. Continue iron-rich foods and milk feeds as advised by your care provider.",
    };
  }

  // Exactly ~6 months: ready only if all three developmental signs are present
  return {
    ready: allMet,
    age_appropriate: true,
    checklist,
    message: allMet
      ? "At about 6 months with all readiness signs present, most babies can start complementary foods alongside breast milk or formula."
      : "At 6 months, look for all three signs before starting. If any sign is missing or unclear, wait briefly and reassess, or discuss with your care provider.",
  };
}

// -----------------------------------------------------------------------------
// Allergen protocols
// -----------------------------------------------------------------------------

export function getAllergenProtocols(): AllergenProtocol[] {
  return [
    {
      allergen: "peanut",
      display_name: "Peanut",
      emoji: "🥜",
      recommended_age_months: 6,
      why_early:
        "The LEAP study showed introducing peanut between 4–11 months reduced peanut allergy by about 80% in high-risk infants when compared with avoidance.",
      how_to_introduce:
        "Mix 1 tsp smooth peanut butter into puree or a little warm water to thin. You can dab a small amount on the lip first. If no reaction after about 10 minutes, offer the rest of the serving. Aim to offer peanut about three times per week to maintain tolerance once introduced.",
      what_to_watch:
        "First day: offer when baby is well, at home, and you can observe for a couple of hours. If baby has severe eczema or known egg allergy, ask your clinician before introducing.",
      reaction_signs: [
        "Hives or swelling",
        "Vomiting within 2 hours",
        "Wheezing or breathing difficulty",
        "Sudden lethargy or pale appearance",
      ],
      leap_study_note:
        "If your baby has severe eczema or egg allergy, discuss peanut introduction with your doctor first—some infants benefit from supervised introduction.",
    },
    {
      allergen: "egg",
      display_name: "Egg",
      emoji: "🥚",
      recommended_age_months: 6,
      why_early: "Early introduction of well-cooked egg is associated with lower risk of egg allergy than delaying.",
      how_to_introduce:
        "Well-cooked scrambled egg or hard-boiled egg, mashed fine. Baked egg in a muffin or pancake is also a reasonable first exposure for many babies.",
      what_to_watch:
        "As with any new food, observe for rash, vomiting, or breathing changes in the hours after feeding.",
      reaction_signs: [
        "Hives",
        "Facial swelling",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note: null,
    },
    {
      allergen: "dairy",
      display_name: "Dairy (cow’s milk protein)",
      emoji: "🥛",
      recommended_age_months: 6,
      why_early:
        "Cow’s milk protein in foods (e.g. yogurt, cheese) can be introduced from about 6 months; this is separate from offering whole cow’s milk as a main drink.",
      how_to_introduce:
        "Plain full-fat yogurt or soft cheese is a practical first step. Baked dairy in foods is another option. Whole cow’s milk as a drink is not recommended before 12 months.",
      what_to_watch:
        "Distinguish dairy in foods (often from 6 months) from cow’s milk as a beverage (after 12 months).",
      reaction_signs: [
        "Hives or swelling",
        "Vomiting or diarrhea",
        "Blood in stool (seek care)",
      ],
      leap_study_note: null,
    },
    {
      allergen: "wheat",
      display_name: "Wheat",
      emoji: "🌾",
      recommended_age_months: 6,
      why_early:
        "Introducing gluten-containing foods around the time of starting solids is appropriate for most infants; some research suggests timing may matter for celiac risk in genetically susceptible children—follow clinician advice if there is family history.",
      how_to_introduce:
        "Iron-fortified infant cereal, soft bread, or well-cooked pasta pieces appropriate for age.",
      what_to_watch:
        "Ongoing tolerance to small amounts; discuss with your clinician if there is strong family history of celiac disease.",
      reaction_signs: [
        "Hives",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note:
        "Some studies suggest both very early and late gluten introduction may affect celiac risk in predisposed children—personalized advice may apply.",
    },
    {
      allergen: "soy",
      display_name: "Soy",
      emoji: "🫘",
      recommended_age_months: 6,
      why_early: "Soy is part of a diverse diet; introduce as a food like other allergens when solids begin.",
      how_to_introduce:
        "Soft tofu mashed, pureed edamame (smooth), or soy yogurt suitable for age.",
      what_to_watch:
        "Soy formula allergy does not always mean soy food allergy—discuss with your clinician if relevant.",
      reaction_signs: [
        "Hives",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note: null,
    },
    {
      allergen: "tree_nut",
      display_name: "Tree nuts",
      emoji: "🌰",
      recommended_age_months: 6,
      why_early:
        "Tree nut butters can be introduced in infancy when texture is safe; whole nuts remain a choking hazard for years.",
      how_to_introduce:
        "Thin nut butters with water, breast milk, formula, or puree—never spoonfuls of thick paste. Never give whole nuts until at least age 4 due to choking risk.",
      what_to_watch:
        "Introduce one tree nut source at a time in a way you can monitor.",
      reaction_signs: [
        "Hives",
        "Swelling of lips or face",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note: null,
    },
    {
      allergen: "sesame",
      display_name: "Sesame",
      emoji: "🫓",
      recommended_age_months: 6,
      why_early:
        "Sesame is recognized as a major allergen in Canada; introduce similarly to other common allergens when baby eats solids.",
      how_to_introduce:
        "Tahini thinned into puree or hummus spread thinly on soft bread (age-appropriate).",
      what_to_watch:
        "Sesame is increasingly labelled on foods—check ingredients when shopping.",
      reaction_signs: [
        "Hives",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note: null,
    },
    {
      allergen: "fish",
      display_name: "Fish (finfish)",
      emoji: "🐟",
      recommended_age_months: 6,
      why_early:
        "Fish provides protein and omega-3 fatty acids; early introduction as part of varied diet is appropriate for most babies.",
      how_to_introduce:
        "Well-cooked, flaked fish such as salmon, cod, or tilapia—bones removed, soft texture for age.",
      what_to_watch:
        "Choose low-mercury options most often; many guidelines suggest fish a few times per week when age-appropriate.",
      reaction_signs: [
        "Hives",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note: null,
    },
    {
      allergen: "shellfish",
      display_name: "Shellfish",
      emoji: "🦐",
      recommended_age_months: 6,
      why_early:
        "Shellfish can be introduced when baby is eating complementary foods, using safe textures.",
      how_to_introduce:
        "Well-cooked shrimp or crab, mashed or minced—never raw shellfish for young children.",
      what_to_watch:
        "Shellfish allergy can be severe—introduce when you can observe baby afterward.",
      reaction_signs: [
        "Hives",
        "Swelling",
        "Vomiting",
        "Wheezing",
      ],
      leap_study_note: null,
    },
  ];
}

// -----------------------------------------------------------------------------
// Feeding stages (textures)
// -----------------------------------------------------------------------------

export function getFeedingStages(): FeedingStage[] {
  return [
    {
      stage: "Stage 1 — Smooth purees",
      age_range: "6–7 months",
      texture: "Completely smooth, no lumps.",
      frequency: "Start with 1 meal per day, building as baby tolerates.",
      description:
        "Single-ingredient iron-rich foods, thin enough to swallow safely from a spoon.",
      example_foods: [
        "Butternut squash",
        "Sweet potato",
        "Banana",
        "Avocado",
        "Pureed meat",
        "Iron-fortified infant cereal mixed to thin consistency",
      ],
      foods_to_avoid: [
        "Honey (before 1 year)",
        "Added salt or sugar",
        "Cow’s milk as a main drink (before 12 months)",
      ],
      self_feeding_notes: "Parent-led spoon feeding; baby may try to help the spoon.",
    },
    {
      stage: "Stage 2 — Mashed with soft lumps",
      age_range: "7–9 months",
      texture: "Mashed with soft lumps; thicker consistency.",
      frequency: "Often 2 meals per day, moving toward 3.",
      description:
        "Advancing texture helps oral motor skills; pieces can be very soft for emerging finger feeding.",
      example_foods: [
        "Mashed banana",
        "Soft scrambled egg",
        "Well-cooked vegetables",
        "Minced meat",
        "Mashed legumes",
      ],
      foods_to_avoid: [
        "Hard chunks",
        "Round coin-shaped pieces",
        "Honey before 1 year",
      ],
      self_feeding_notes: "Beginning finger feeding of soft, squishable pieces.",
    },
    {
      stage: "Stage 3 — Soft chopped pieces",
      age_range: "9–12 months",
      texture:
        "Soft pieces that dissolve or mash with gums; small pieces—avoid coin shapes and hard rounds.",
      frequency: "3 meals plus snacks for many babies.",
      description:
        "Transition toward family textures; active exploration and mess are expected.",
      example_foods: [
        "Ripe pear strips",
        "Cooked pasta pieces",
        "Soft tofu",
        "Shredded chicken",
        "Small pieces of soft cheese",
        "Iron-fortified dry cereal (e.g. O-shaped)",
        "Avocado chunks",
      ],
      foods_to_avoid: [
        "Whole grapes",
        "Whole nuts",
        "Hard raw vegetables",
        "Large chunks of meat",
        "Honey before 1 year",
      ],
      self_feeding_notes: "Pincer grasp finger feeding; baby leads more of the intake.",
    },
    {
      stage: "Stage 4 — Modified family foods",
      age_range: "12–18 months",
      texture: "Family foods cut small and cooked soft enough to mash with gums.",
      frequency: "3 meals and 2 snacks typical.",
      description:
        "Most family meals can be adapted; focus on choking safety and sodium limits.",
      example_foods: [
        "Most family foods in small, soft pieces",
      ],
      foods_to_avoid: [
        "Whole grapes",
        "Raw hard vegetables",
        "Whole nuts",
        "Large chunks of meat",
        "Hot dogs (round slices)",
        "Popcorn",
        "Hard candies",
      ],
      self_feeding_notes:
        "Spoon practice with major mess is normal and important for learning.",
    },
    {
      stage: "Stage 5 — Family foods",
      age_range: "18–24 months",
      texture: "Family foods with minimal modification.",
      frequency: "3 meals and 2 snacks.",
      description:
        "Eating with the family; continued attention to choking hazards for children under 4.",
      example_foods: [
        "Family menu with safe sizes and textures",
      ],
      foods_to_avoid: [
        "Whole nuts",
        "Whole grapes",
        "Hard chunks of meat",
        "Hard candies and popcorn (young toddler)",
      ],
      self_feeding_notes:
        "Improving spoon skills; fork practice beginning; still expect spills.",
    },
  ];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function getAllergenStatus(
  allergenIntroductions: Array<{
    allergen: string;
    introduced_at: string | null;
  }>,
  ageMonths: number,
): Array<{
  allergen: string;
  status: "introduced" | "overdue" | "upcoming" | "too_early";
  recommended_at_months: number;
}> {
  const age = clampAgeMonths(ageMonths);
  const byKey = new Map(
    allergenIntroductions.map((r) => [r.allergen, r.introduced_at]),
  );

  return ALLERGEN_KEYS.map((allergen) => {
    const introducedAt = byKey.get(allergen) ?? null;
    const introduced = introducedAt !== null && introducedAt !== "";

    if (introduced) {
      return {
        allergen,
        status: "introduced" as const,
        recommended_at_months: RECOMMENDED_INTRO_MONTHS,
      };
    }

    if (age < RECOMMENDED_INTRO_MONTHS) {
      return {
        allergen,
        status: "too_early" as const,
        recommended_at_months: RECOMMENDED_INTRO_MONTHS,
      };
    }

    if (age >= 12) {
      return {
        allergen,
        status: "overdue" as const,
        recommended_at_months: RECOMMENDED_INTRO_MONTHS,
      };
    }

    return {
      allergen,
      status: "upcoming" as const,
      recommended_at_months: RECOMMENDED_INTRO_MONTHS,
    };
  });
}

function logDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const BREAST_TYPES = new Set([
  "breast_left",
  "breast_right",
  "breast_both",
]);

export function getDailyFeedingSummary(
  logs: Array<{
    logged_at: string;
    feeding_type: string;
    volume_ml?: number;
    duration_minutes?: number;
  }>,
  date: string,
): {
  total_feeds: number;
  breast_sessions: number;
  formula_ml: number;
  solid_meals: number;
  last_feed: string | null;
} {
  const dayLogs = logs.filter((l) => logDateKey(l.logged_at) === date);
  dayLogs.sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );

  let breast_sessions = 0;
  let formula_ml = 0;
  let solid_meals = 0;

  for (const log of dayLogs) {
    const t = log.feeding_type;
    if (BREAST_TYPES.has(t) || t === "pumped") {
      breast_sessions += 1;
    }
    if (t === "formula") {
      const v = log.volume_ml;
      if (typeof v === "number" && !Number.isNaN(v)) {
        formula_ml += v;
      }
    }
    if (t === "solids") {
      solid_meals += 1;
    }
    if (t === "water") {
      // counted in total_feeds only
    }
  }

  const last = dayLogs.length ? dayLogs[dayLogs.length - 1].logged_at : null;

  return {
    total_feeds: dayLogs.length,
    breast_sessions,
    formula_ml,
    solid_meals,
    last_feed: last,
  };
}

export function getWaterGuidance(ageMonths: number): string {
  const age = clampAgeMonths(ageMonths);

  if (age < 6) {
    return "Under 6 months, babies do not need extra water—breast milk or formula provides enough fluid. Do not replace milk feeds with water.";
  }

  if (age < 12) {
    return "From about 6–12 months, offer small sips of water from an open cup with meals. Total extra water is usually small (for example up to about 60 ml/day is often cited as a ceiling for added water in the first year—follow your clinician if unsure). No juice under 2 years (Health Canada 2023).";
  }

  return "From 12–24 months, aim for about 120–240 ml of water per day as part of a varied diet, offered mainly with meals and snacks. Fruit juice is not recommended for children under 2 years (Health Canada 2023).";
}
