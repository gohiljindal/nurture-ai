/**
 * CPS-style complementary feeding / allergen introduction checklist (task 33).
 * Non-clinical parent education — align with your clinician for high-risk infants.
 */

export type AllergenChecklistItem = {
  step: number;
  title: string;
  detail: string;
};

export const ALLERGEN_INTRO_CHECKLIST: AllergenChecklistItem[] = [
  {
    step: 1,
    title: "Start when baby is ready for solids",
    detail:
      "Usually around 6 months, showing good head control and interest in food — not before 4 months unless your clinician advises.",
  },
  {
    step: 2,
    title: "Introduce one new food at a time",
    detail:
      "Offer a small amount of a single allergenic food (e.g. peanut, egg) and watch for rash, vomiting, or breathing changes over the next hours.",
  },
  {
    step: 3,
    title: "Keep offering regularly",
    detail:
      "Repeated gentle exposure helps tolerance for many children — ask your doctor how often to repeat if there was eczema or other risk factors.",
  },
  {
    step: 4,
    title: "Know when to seek urgent care",
    detail:
      "Swelling of lips or face, wheeze, repetitive vomiting, or sudden lethargy after eating need emergency assessment.",
  },
  {
    step: 5,
    title: "Track what you tried",
    detail:
      "Use this app’s allergen tracker so visit prep and emergency info stay accurate.",
  },
];
