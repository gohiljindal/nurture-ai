import { ontarioVaccineSchedule } from "@/lib/vaccines";

export function calculateAgeInMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();

  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());

  if (now.getDate() < dob.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

export function getNextVaccine(dateOfBirth: string) {
  const ageInMonths = calculateAgeInMonths(dateOfBirth);

  return ontarioVaccineSchedule.find((item) => item.dueMonth >= ageInMonths) || null;
}
