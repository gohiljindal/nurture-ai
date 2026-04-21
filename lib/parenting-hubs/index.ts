import { calculateAgeInMonths } from "@/lib/child-age";

export type ParentingHubPayload = {
  child: { id: string; name: string; age_months: number };
  title: string;
  summary: string;
  bullets: string[];
  checklist?: string[];
  disclaimer: string;
};

function byAge(ageMonths: number, small: string, mid: string, older: string): string {
  if (ageMonths < 24) return small;
  if (ageMonths < 48) return mid;
  return older;
}

export function buildToddlerBehaviorHub(childId: string, name: string, dob: string): ParentingHubPayload {
  const age = calculateAgeInMonths(dob);
  return {
    child: { id: childId, name, age_months: age },
    title: "Toddler behavior hub",
    summary: byAge(
      age,
      "Early toddler years are about co-regulation and simple routines.",
      "Big feelings are normal; calm scripts and boundaries help most.",
      "Behavior often improves with predictable sleep, transitions, and play."
    ),
    bullets: [
      "Name feelings first (e.g. 'You are upset') before correcting behavior.",
      "Use one-step instructions and offer two acceptable choices.",
      "Keep consequences immediate and brief; praise what you want repeated.",
      "Watch language milestones and hearing if frustration is persistent.",
    ],
    disclaimer: "Education only; if behavior changes suddenly, discuss with your clinician.",
  };
}

export function buildPottyReadinessHub(childId: string, name: string, dob: string): ParentingHubPayload {
  const age = calculateAgeInMonths(dob);
  return {
    child: { id: childId, name, age_months: age },
    title: "Potty readiness",
    summary: "Readiness is skill-based, not a race. Most children train between 2 and 3 years.",
    bullets: [
      "Look for dry stretches, awareness of wet/dirty diaper, and interest in imitation.",
      "Use a routine: sit after meals and before bath/bed with no pressure.",
      "Expect setbacks during illness, travel, or big transitions.",
      "Treat constipation early since painful stools can delay progress.",
    ],
    checklist: [
      "Can pull pants up/down with help",
      "Stays dry for about 2 hours",
      "Can follow simple toilet routine",
      "Shows interest in underwear or toilet",
    ],
    disclaimer: "Seek care for painful urination, blood in stool, or severe constipation.",
  };
}

export function buildScreenTimeHub(childId: string, name: string, dob: string): ParentingHubPayload {
  const age = calculateAgeInMonths(dob);
  return {
    child: { id: childId, name, age_months: age },
    title: "Screen time guidance",
    summary: "AAP-aligned: prioritize sleep, movement, and caregiver interaction over passive media.",
    bullets: [
      byAge(age, "Under 18 months: avoid solo screen use; video chat is okay.", "Use high-quality content with co-viewing and discussion.", "Set clear daily limits and device-free routines."),
      "No screens during meals and 1 hour before bedtime.",
      "Use parental controls and keep devices out of bedrooms at night.",
      "Model habits: children copy adult device use.",
    ],
    disclaimer: "If media use affects sleep, school, or mood, review a family plan with your clinician.",
  };
}

export function buildPreschoolSocialHub(childId: string, name: string, dob: string): ParentingHubPayload {
  const age = calculateAgeInMonths(dob);
  return {
    child: { id: childId, name, age_months: age },
    title: "Preschool social development",
    summary: "Preschoolers learn turn-taking, empathy, and conflict repair through repeated practice.",
    bullets: [
      "Coach simple scripts: 'Can I play?', 'My turn next', 'Stop, I do not like that.'",
      "Practice naming emotions and problem-solving after conflicts.",
      "Use short playdates and predictable transitions for shy children.",
      "Talk to educators if there are persistent concerns about communication or peer interaction.",
    ],
    checklist: [
      "Greets familiar adults/peers",
      "Takes turns with support",
      "Engages in pretend play",
      "Recovers after frustration with help",
    ],
    disclaimer: "Early supports help; discuss concerns with your pediatrician or school team.",
  };
}

export function buildGradeReadinessHub(childId: string, name: string, dob: string): ParentingHubPayload {
  const age = calculateAgeInMonths(dob);
  const literacy = age < 60 ? "emerging" : age < 72 ? "developing" : "expected";
  const selfReg = age < 60 ? "developing" : "expected";
  const social = age < 60 ? "developing" : "expected";
  const score = (literacy === "expected" ? 35 : literacy === "developing" ? 25 : 15) +
    (selfReg === "expected" ? 35 : 25) +
    (social === "expected" ? 30 : 20);

  return {
    child: { id: childId, name, age_months: age },
    title: "Grade 1 readiness (educational)",
    summary:
      "Non-clinical readiness snapshot to guide home practice and school conversations.",
    bullets: [
      `Readiness score: ${score}/100`,
      `Literacy foundations: ${literacy}`,
      `Self-regulation and routines: ${selfReg}`,
      `Peer and classroom social skills: ${social}`,
      "Use this for planning; it is not a diagnosis or school placement tool.",
    ],
    checklist: [
      "Can follow a 2-3 step instruction",
      "Can recognize letters in own name",
      "Can take turns in a short game",
      "Can manage short transitions with reminders",
    ],
    disclaimer: "Educational guide only. Discuss concerns with your school team or clinician.",
  };
}

export function buildIepAwarenessHub(
  childId: string,
  name: string,
  dob: string,
  region: "CA" | "US"
): ParentingHubPayload {
  const age = calculateAgeInMonths(dob);
  return {
    child: { id: childId, name, age_months: age },
    title: "IEP awareness resources",
    summary:
      region === "US"
        ? "In the US, services are commonly routed through IDEA/IEP pathways in public schools."
        : "In Canada, supports vary by province; ask your school board about psychoeducational assessment and IEP processes.",
    bullets: [
      "Collect examples from home and school before meetings.",
      "Ask for clear goals, supports, and review timelines in writing.",
      "Bring another adult for note-taking if possible.",
      "Request plain-language explanation of next steps.",
    ],
    checklist: [
      "Current teacher observations",
      "Any prior assessments or therapy notes",
      "Your top 3 classroom concerns",
      "Questions about accommodations and follow-up timing",
    ],
    disclaimer: "Resource orientation only, not legal advice.",
  };
}
