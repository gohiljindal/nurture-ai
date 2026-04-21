/**
 * Age utilities for display in the mobile app.
 * date_of_birth is always a "YYYY-MM-DD" string from the API.
 */

/** Returns the child's age in whole months from today. */
export function calculateAgeInMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth + "T12:00:00");
  const now = new Date();
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  const dayAdjust = now.getDate() < dob.getDate() ? -1 : 0;
  return Math.max(0, years * 12 + months + dayAdjust);
}

/** "2 weeks", "4 months", "1 year 3 months", "2 years", etc. */
export function formatAgeLabel(ageInMonths: number): string {
  if (ageInMonths < 1) return "newborn";
  if (ageInMonths < 3) {
    const weeks = Math.round(ageInMonths * 4.33);
    return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  }
  if (ageInMonths < 24) {
    return `${ageInMonths} month${ageInMonths !== 1 ? "s" : ""}`;
  }
  const years = Math.floor(ageInMonths / 12);
  const rem = ageInMonths % 12;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} yr ${rem} mo`;
}

/** "March 15, 2024" */
export function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
