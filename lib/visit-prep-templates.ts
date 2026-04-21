import { getLifeStageBucket, type LifeStageBucket } from "@/lib/stage-engine";

export type VisitPrepSection = {
  before: string[];
  during: string[];
  /** Extra prompts by life stage (task 28). */
  focus_topics: string[];
};

const BASE_BEFORE: string[] = [
  "Write down new symptoms, medicines, or doses since the last visit.",
  "Note feeding, sleep, and diaper/voiding changes you want reviewed.",
  "Bring your vaccine booklet or app screenshots if you track shots elsewhere.",
  "List top 3 questions so you don’t forget them in the room.",
];

function focusForStage(stage: LifeStageBucket): string[] {
  switch (stage) {
    case "newborn":
      return [
        "Jaundice, feeding weight gain, and diaper counts.",
        "Umbilical cord care and circumcision care if applicable.",
        "Safe sleep position and room temperature.",
      ];
    case "young_infant":
      return [
        "Tummy time tolerance and head control.",
        "Introduction of solids timing (if approaching 6 months).",
        "Any persistent spit-up or breathing noises.",
      ];
    case "older_infant":
      return [
        "Crawling, pulling to stand, and babbling progress.",
        "Finger foods, allergens, and choking precautions.",
        "Sleep consolidation and night feeds.",
      ];
    case "toddler":
      return [
        "Language explosion: words, pointing, and following directions.",
        "Tantrums, limits, and daycare illness frequency.",
        "Dental first visit timing and fluoride questions.",
      ];
    case "preschool":
      return [
        "Social play, separation at drop-off, and toileting readiness.",
        "Vision/hearing screening timing before school entry.",
        "Allergies, asthma, or eczema flares.",
      ];
    case "kindergarten":
      return [
        "School readiness: attention, pencil grip, and peer conflict.",
        "Sleep schedule with full school days.",
        "Sports safety and concussion basics if starting activities.",
      ];
    case "grade_readiness":
      return [
        "Reading enjoyment vs pressure; vision and hearing at school age.",
        "Growth of independence with homework routines.",
        "Mental health check-ins (worries, friendships, bullying).",
      ];
    default:
      return [];
  }
}

function duringForAge(ageMonths: number): string[] {
  const base: string[] = [
    "How is overall health and energy compared to the last visit?",
    "Any feeding or hydration concerns?",
    "Sleep: usual pattern, new night waking, or snoring?",
  ];

  if (ageMonths < 6) {
    base.push("Weight gain trajectory, diapers, and any jaundice history.");
    base.push("Medications or vitamins you are using at home.");
  } else if (ageMonths < 24) {
    base.push("Development: movement, sounds/words, and social engagement.");
    base.push("Immunizations: reactions, delays, or schedule questions.");
  } else if (ageMonths < 60) {
    base.push("Behaviour, language, and play at home or daycare.");
    base.push("Vision, hearing, or dental concerns?");
  } else {
    base.push("School or activities: injuries, headaches, or vision changes?");
    base.push("Emotional well-being and friendships.");
  }

  base.push("Anything you want recorded in the chart today?");
  return base;
}

/** Expanded visit-prep copy by age band + stage (task 28). */
export function getVisitPrepForAge(ageMonths: number): VisitPrepSection {
  const stage = getLifeStageBucket(ageMonths);
  return {
    before: [...BASE_BEFORE],
    during: duringForAge(ageMonths),
    focus_topics: focusForStage(stage),
  };
}
