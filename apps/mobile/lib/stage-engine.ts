/**
 * Mobile-local copy so Metro doesn't resolve outside app root.
 */
export type LifeStageBucket =
  | "newborn"
  | "young_infant"
  | "older_infant"
  | "toddler"
  | "preschool"
  | "kindergarten"
  | "grade_readiness";

const ORDER: LifeStageBucket[] = [
  "newborn",
  "young_infant",
  "older_infant",
  "toddler",
  "preschool",
  "kindergarten",
  "grade_readiness",
];

export function getLifeStageBucket(ageMonths: number): LifeStageBucket {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) return "newborn";
  if (ageMonths < 3) return "newborn";
  if (ageMonths < 12) return "young_infant";
  if (ageMonths < 24) return "older_infant";
  if (ageMonths < 36) return "toddler";
  if (ageMonths < 60) return "preschool";
  if (ageMonths < 72) return "kindergarten";
  return "grade_readiness";
}

export function getLifeStageLabel(bucket: LifeStageBucket): string {
  switch (bucket) {
    case "newborn":
      return "Newborn (0-3 mo)";
    case "young_infant":
      return "Young infant (3-12 mo)";
    case "older_infant":
      return "Older infant (1-2 yr)";
    case "toddler":
      return "Toddler (2-3 yr)";
    case "preschool":
      return "Preschool (3-5 yr)";
    case "kindergarten":
      return "Kindergarten (5-6 yr)";
    case "grade_readiness":
      return "School-age (6+ yr)";
    default:
      return "Child";
  }
}

export function lifeStageOrder(bucket: LifeStageBucket): number {
  return ORDER.indexOf(bucket);
}
