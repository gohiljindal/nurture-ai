import { calculateAgeInMonths } from "@/lib/child-age";

export type SafetyChild = {
  name: string;
  date_of_birth: string;
  sex_at_birth?: string | null;
  is_premature?: boolean;
  gestational_age_weeks?: number | null;
};

export type FollowupAnswer = {
  question: string;
  answer: string;
};

export type SafetyReason =
  | "critical_emergency_keywords"
  | "infant_under_3_fever"
  | "dehydration_keywords";

export type TriageConfidence = "low" | "medium" | "high";

export function normalizeTriageConfidence(
  value: unknown
): TriageConfidence {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

export function normalizeReasoning(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "";
}

export type SafetyRulesResult =
  | {
      matched: true;
      reason: SafetyReason;
      urgency: "emergency" | "urgent_doctor";
      summary: string;
      recommended_action: string;
      red_flags: string[];
      disclaimer: string;
      confidence: TriageConfidence;
      reasoning: string;
    }
  | { matched: false };

const EMERGENCY_KEYWORDS = [
  "not breathing",
  "can't breathe",
  "cannot breathe",
  "labored breathing",
  "gasping",
  "blue lips",
  "unresponsive",
  "seizure",
  "passed out",
  "stopped breathing",
  "turning blue",
  "severe trouble breathing",
];

const FEVER_KEYWORDS = [
  "fever",
  "febrile",
  "temperature",
  "°c",
  "°f",
  " 38",
  " 39",
  " 40",
  "38.",
  "39.",
  "40.",
  "38c",
  "39c",
  "38 c",
  "39 c",
  "hot to touch",
  "feeling warm",
];

const DEHYDRATION_KEYWORDS = [
  "dehydrat",
  "no urine",
  "not urinating",
  "dry mouth",
  "no tears",
  "sunken",
  "fontanelle",
  "soft spot",
  "not drinking",
  "reduced fluid",
  "dehydrated",
];

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((k) => normalized.includes(k.toLowerCase()));
}

export function runSafetyRules(
  child: SafetyChild,
  symptomText: string,
  followupAnswers: FollowupAnswer[]
): SafetyRulesResult {
  const combinedText = [
    symptomText,
    ...followupAnswers.map((item) => `${item.question}: ${item.answer}`),
  ].join("\n");

  const normalized = combinedText.toLowerCase();

  if (EMERGENCY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return {
      matched: true,
      reason: "critical_emergency_keywords",
      urgency: "emergency",
      summary:
        "These symptoms may need emergency medical attention right away.",
      recommended_action:
        "Go to the nearest emergency department or call emergency services now.",
      red_flags: [
        "breathing stopped or very hard breathing",
        "blue or gray lips",
        "unresponsiveness",
        "seizure activity",
      ],
      disclaimer:
        "This tool gives general guidance and does not replace a medical professional.",
      confidence: "high",
      reasoning:
        "High-risk emergency-related wording was detected in your description.",
    };
  }

  const ageInMonths = calculateAgeInMonths(child.date_of_birth);

  if (ageInMonths < 3 && includesAny(combinedText, FEVER_KEYWORDS)) {
    return {
      matched: true,
      reason: "infant_under_3_fever",
      urgency: "emergency",
      summary:
        "A fever in a baby under 3 months may need emergency assessment.",
      recommended_action:
        "Go to the nearest emergency department now or seek immediate medical care.",
      red_flags: [
        "fever in a baby under 3 months",
        "very sleepy or hard to wake",
        "poor feeding",
        "trouble breathing",
      ],
      disclaimer:
        "This tool gives general guidance and does not replace a medical professional.",
      confidence: "high",
      reasoning:
        "Fever in a baby under 3 months triggers an automatic safety escalation for urgent assessment.",
    };
  }

  if (includesAny(combinedText, DEHYDRATION_KEYWORDS)) {
    return {
      matched: true,
      reason: "dehydration_keywords",
      urgency: "urgent_doctor",
      summary:
        "Signs of dehydration in a child may need medical attention soon.",
      recommended_action:
        "Contact your pediatrician, urgent care, or Health811. If your child is very unwell, go to emergency care.",
      red_flags: [
        "no urine for 6 hours in a baby or 12 hours in an older child",
        "dry mouth or no tears",
        "sunken eyes or soft spot",
        "very sleepy, weak, or worsening",
      ],
      disclaimer:
        "This tool gives general guidance and does not replace a medical professional.",
      confidence: "high",
      reasoning:
        "Possible dehydration signals were mentioned; fluid balance and overall wellness need medical attention.",
    };
  }

  return { matched: false };
}
