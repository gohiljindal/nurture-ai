export type AgeExpectation = {
  ageRangeLabel: string;
  minMonths: number;
  maxMonths: number;
  highlights: string[];
  feeding: string[];
  sleep: string[];
  development: string[];
  watchFor: string[];
};

export const ageExpectations: AgeExpectation[] = [
  {
    ageRangeLabel: "0 to 2 months",
    minMonths: 0,
    maxMonths: 2,
    highlights: [
      "Frequent feeding and sleeping in short stretches are common.",
      "Crying often peaks in the first weeks.",
    ],
    feeding: [
      "Frequent feeds are expected.",
      "Wet diapers help show hydration.",
    ],
    sleep: [
      "Sleep is irregular and often broken into short periods.",
    ],
    development: [
      "Baby may start focusing on faces and reacting to sound.",
    ],
    watchFor: [
      "Fever in a baby under 3 months needs urgent medical assessment.",
      "Poor feeding, hard breathing, or unusual sleepiness need prompt care.",
    ],
  },
  {
    ageRangeLabel: "3 to 5 months",
    minMonths: 3,
    maxMonths: 5,
    highlights: [
      "More alertness and interaction often appear.",
      "Rolling may begin.",
    ],
    feeding: ["Feeding patterns may become a bit more predictable."],
    sleep: [
      "Night sleep may improve for some babies, but not all.",
    ],
    development: [
      "Baby may smile more, track objects, and hold head up better.",
    ],
    watchFor: [
      "Trouble breathing, dehydration signs, or unusual lethargy need attention.",
    ],
  },
  {
    ageRangeLabel: "6 to 12 months",
    minMonths: 6,
    maxMonths: 12,
    highlights: [
      "Sitting, crawling, and babbling often pick up in this stretch.",
      "Many families introduce solids alongside milk feeds.",
    ],
    feeding: [],
    sleep: [],
    development: [],
    watchFor: [
      "Seek advice if breathing is hard, fluids won’t stay down, or your child is much less responsive than usual.",
    ],
  },
  {
    ageRangeLabel: "13 to 24 months",
    minMonths: 13,
    maxMonths: 24,
    highlights: [
      "Walking and first words are common, on each child’s own timeline.",
      "Big feelings and testing limits are a normal part of learning.",
    ],
    feeding: [],
    sleep: [],
    development: [],
    watchFor: [
      "Get urgent help for breathing trouble, severe dehydration, or sudden unusual drowsiness.",
    ],
  },
  {
    ageRangeLabel: "2 years and older",
    minMonths: 25,
    maxMonths: 240,
    highlights: [
      "Language and social skills keep expanding through play and routines.",
      "Independence grows—patience and clear boundaries help everyone.",
    ],
    feeding: [],
    sleep: [],
    development: [],
    watchFor: [
      "Trust your instincts: worsening illness, breathing problems, or injury need timely care.",
    ],
  },
];
