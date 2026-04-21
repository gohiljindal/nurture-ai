/** Canadian province / territory codes accepted by PATCH /api/vaccines/[childId]/province */
export const CA_PROVINCES = [
  { code: "ON", label: "Ontario" },
  { code: "BC", label: "British Columbia" },
  { code: "AB", label: "Alberta" },
  { code: "SK", label: "Saskatchewan" },
  { code: "MB", label: "Manitoba" },
  { code: "QC", label: "Quebec" },
  { code: "NB", label: "New Brunswick" },
  { code: "NS", label: "Nova Scotia" },
  { code: "PE", label: "Prince Edward Island" },
  { code: "NL", label: "Newfoundland and Labrador" },
  { code: "YT", label: "Yukon" },
  { code: "NT", label: "Northwest Territories" },
  { code: "NU", label: "Nunavut" },
] as const;
