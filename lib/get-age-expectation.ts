import { calculateAgeInMonths } from "@/lib/child-age";
import { ageExpectations } from "@/lib/age-expectations";

export function getAgeExpectation(dateOfBirth: string) {
  const age = calculateAgeInMonths(dateOfBirth);

  return (
    ageExpectations.find(
      (item) => age >= item.minMonths && age <= item.maxMonths
    ) || null
  );
}
