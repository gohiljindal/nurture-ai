export type VaccineScheduleItem = {
  key: string;
  label: string;
  dueMonth: number;
  description: string;
};

export const ontarioVaccineSchedule: VaccineScheduleItem[] = [
  {
    key: "birth",
    label: "Birth vaccines",
    dueMonth: 0,
    description: "Hepatitis B may be given at birth in some cases.",
  },
  {
    key: "2-months",
    label: "2 months",
    dueMonth: 2,
    description: "Routine infant immunizations are usually scheduled at 2 months.",
  },
  {
    key: "4-months",
    label: "4 months",
    dueMonth: 4,
    description: "Routine infant immunizations are usually scheduled at 4 months.",
  },
  {
    key: "6-months",
    label: "6 months",
    dueMonth: 6,
    description: "Some routine vaccines may be scheduled at 6 months depending on guidance.",
  },
  {
    key: "12-months",
    label: "12 months",
    dueMonth: 12,
    description: "Routine immunizations are commonly due around 12 months.",
  },
  {
    key: "15-months",
    label: "15 months",
    dueMonth: 15,
    description: "Routine booster or follow-up immunizations may be due around 15 months.",
  },
  {
    key: "18-months",
    label: "18 months",
    dueMonth: 18,
    description: "Routine toddler immunizations are commonly due around 18 months.",
  },
];
