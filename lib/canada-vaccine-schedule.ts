/**
 * Canadian provincial/territorial routine immunization schedules.
 * Source: Health Canada / PHAC (reference: December 2025).
 * Pure TypeScript — no external dependencies.
 *
 * Grade-based events use approximate ages for timeline dates; confirm with your province.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Province =
  | "ON"
  | "BC"
  | "AB"
  | "SK"
  | "MB"
  | "QC"
  | "NB"
  | "NS"
  | "PE"
  | "NL"
  | "YT"
  | "NT"
  | "NU";

export interface VaccineEvent {
  code: string;
  name: string;
  shortName: string;
  ageMonths: number | null;
  gradeNote: string | null;
  diseases: string[];
  doses: number;
  notes: string | null;
  isSchoolAge: boolean;
}

export interface ProvinceSchedule {
  province: Province;
  provinceName: string;
  healthLinePhone: string;
  scheduleUrl: string;
  events: VaccineEvent[];
}

export interface ScheduledVaccine extends VaccineEvent {
  scheduledDate: Date;
  isOverdue: boolean;
  daysUntilDue: number;
  administered: boolean;
  administeredDate: Date | null;
}

// -----------------------------------------------------------------------------
// Helpers (internal)
// -----------------------------------------------------------------------------

function ev(
  code: string,
  name: string,
  shortName: string,
  ageMonths: number | null,
  gradeNote: string | null,
  diseases: string[],
  doses: number,
  notes: string | null,
  isSchoolAge: boolean
): VaccineEvent {
  return {
    code,
    name,
    shortName,
    ageMonths,
    gradeNote,
    diseases,
    doses,
    notes,
    isSchoolAge,
  };
}

/** Approximate month offsets from DOB for school-/grade-based programs (timeline estimates). */
const GRADE_APPROX_MONTHS: Record<string, number> = {
  "Grade 4": 108,
  "Grade 6": 132,
  "Grade 7": 144,
  "Grade 8": 144,
  "Grade 9": 168,
  "Grade 12": 204,
  "Primary year 4": 108,
  "Secondary year 3": 168,
  "Grade 4-6 (age 9+)": 108,
  "Grade 12 (or pre-college)": 204,
};

function gradeNoteToApproxMonths(gradeNote: string): number | null {
  return GRADE_APPROX_MONTHS[gradeNote] ?? null;
}

function parseDob(dob: string): Date {
  const s = dob.trim().slice(0, 10);
  const d = new Date(s.includes("T") ? s : `${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date of birth: ${dob}`);
  }
  return d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Calendar month offset from a parsed DOB (not raw string). Uses
 * `new Date(birth)` then `setMonth(getMonth() + months)` so JS normalizes
 * month-end edge cases (e.g. Jan 31 + 1 month).
 */
function addMonths(birth: Date, months: number): Date {
  const d = new Date(birth);
  d.setMonth(d.getMonth() + months);
  return d;
}

function ageInMonthsAt(dob: Date, when: Date): number {
  let m =
    (when.getFullYear() - dob.getFullYear()) * 12 + (when.getMonth() - dob.getMonth());
  if (when.getDate() < dob.getDate()) m -= 1;
  return Math.max(0, m);
}

// -----------------------------------------------------------------------------
// Schedule data (all 13 jurisdictions)
// -----------------------------------------------------------------------------

const ON: ProvinceSchedule = {
  province: "ON",
  provinceName: "Ontario",
  healthLinePhone: "811",
  scheduleUrl: "https://www.ontario.ca/page/ontarios-routine-immunization-schedule",
  events: [
    ev("DTAP_IPV_HIB_2M", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M", "Pneumococcal conjugate (Pneu-C-13)", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, "Oral", false),
    ev("DTAP_IPV_HIB_4M", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M", "Pneumococcal conjugate (Pneu-C-13)", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, "Oral", false),
    ev("DTAP_IPV_HIB_6M", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("ROT_6M", "Rotavirus", "Rot", 6, null, ["Rotavirus"], 1, "Oral; 3rd dose only if using RotaTeq", false),
    ev("MEN_C_C_12M", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M", "Measles, mumps, rubella", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_15M", "Varicella", "Varicella", 15, null, ["Varicella (chickenpox)"], 1, null, false),
    ev("PNEU_C13_15M", "Pneumococcal conjugate (booster)", "Pneu-C-13", 15, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("MMR_18M", "Measles, mumps, rubella (2nd dose)", "MMR", 18, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("MMRV_OR_VAR_18M", "MMRV or varicella", "MMRV/Varicella", 18, null, ["Measles", "Mumps", "Rubella", "Varicella"], 1, null, false),
    ev("DTAP_IPV_4_6Y", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, "Booster; ages 4–6 years (approx. 5y)", false),
    ev("TDAP_G7", "Tdap", "Tdap", null, "Grade 7", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("HB_G7", "Hepatitis B", "HBV", null, "Grade 7", ["Hepatitis B"], 2, "School program", true),
    ev("MEN_ACYW_G7", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 7", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("HPV_G7", "HPV (Gardasil 9)", "HPV", null, "Grade 7", ["HPV"], 2, "School program", true),
    ev("INFLUENZA_6M_PLUS", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+; 2 doses first season if under 9 years", false),
  ],
};

const BC: ProvinceSchedule = {
  province: "BC",
  provinceName: "British Columbia",
  healthLinePhone: "811",
  scheduleUrl: "https://www.healthlinkbc.ca/health-library/immunizations/schedules/children",
  events: [
    ev("DTAP_HB_IPV_HIB_2M", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, "Includes hepatitis B", false),
    ev("PNEU_C13_2M_BC", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_BC", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_HB_IPV_HIB_4M", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_4M_BC", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_BC", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_HB_IPV_HIB_6M", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("ROT_6M_BC", "Rotavirus", "Rot", 6, null, ["Rotavirus"], 1, null, false),
    ev("HEPA_6M_IND", "Hepatitis A", "Hep A", 6, null, ["Hepatitis A"], 1, "Indigenous children only", false),
    ev("MEN_C_C_12M_BC", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M_BC", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_BC", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_15M_BC", "Pneumococcal (booster)", "Pneu-C-13", 15, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_BC", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("HEPA_18M_IND", "Hepatitis A", "Hep A", 18, null, ["Hepatitis A"], 1, "Indigenous children; 2nd dose", false),
    ev("MMR_4_6Y_BC", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_BC", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("DTAP_IPV_4_6Y_BC", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("HPV_G6_BC", "HPV", "HPV", null, "Grade 6", ["HPV"], 2, null, true),
    ev("MEN_ACYW_G9_BC", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 9", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("INFLUENZA_6M_BC", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const AB: ProvinceSchedule = {
  province: "AB",
  provinceName: "Alberta",
  healthLinePhone: "811",
  scheduleUrl: "https://www.alberta.ca/immunization-schedules",
  events: [
    ev("DTAP_HB_IPV_HIB_2M_AB", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_2M_AB", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_AB", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("MEN_C_C_4M_AB", "Meningococcal C conjugate", "Men-C-C", 4, null, ["Meningococcal C"], 1, "AB: first dose at 4m (not 12m)", false),
    ev("DTAP_HB_IPV_HIB_4M_AB", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_4M_AB", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_AB", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_HB_IPV_HIB_6M_AB", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("MMR_12M_AB", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_AB", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("MEN_C_C_12M_AB", "Meningococcal C conjugate (booster)", "Men-C-C", 12, null, ["Meningococcal C"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_AB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("PNEU_C13_18M_AB", "Pneumococcal (booster)", "Pneu-C-13", 18, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_AB", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_AB", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_AB", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G6_AB", "HPV", "HPV", null, "Grade 6", ["HPV"], 2, null, true),
    ev("HB_CATCHUP_G6_AB", "Hepatitis B catch-up", "HBV", null, "Grade 6", ["Hepatitis B"], 2, "For those not vaccinated in infancy", true),
    ev("MEN_ACYW_G9_AB", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 9", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("TDAP_G9_AB", "Tdap", "Tdap", null, "Grade 9", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("INFLUENZA_6M_AB", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const SK: ProvinceSchedule = {
  province: "SK",
  provinceName: "Saskatchewan",
  healthLinePhone: "811",
  scheduleUrl:
    "https://www.saskatchewan.ca/residents/health/accessing-health-care-services/immunization-and-vaccines/immunization-schedules",
  events: [
    ev("DTAP_IPV_HIB_2M_SK", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_SK", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_SK", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_4M_SK", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_SK", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_SK", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_6M_SK", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("MEN_C_C_12M_SK", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M_SK", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_SK", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_SK", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_SK", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_SK", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_SK", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_SK", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G6_SK", "HPV", "HPV", null, "Grade 6", ["HPV"], 2, null, true),
    ev("HB_G6_SK", "Hepatitis B", "HBV", null, "Grade 6", ["Hepatitis B"], 2, "School program", true),
    ev("MEN_ACYW_G8_SK", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 8", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("TDAP_G8_SK", "Tdap", "Tdap", null, "Grade 8", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("INFLUENZA_6M_SK", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const MB: ProvinceSchedule = {
  province: "MB",
  provinceName: "Manitoba",
  healthLinePhone: "1-888-315-9257",
  scheduleUrl: "https://www.gov.mb.ca/health/publichealth/cdc/vaccinepreventable/schedule.html",
  events: [
    ev("DTAP_IPV_HIB_2M_MB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_MB", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_MB", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_4M_MB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_MB", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_MB", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_6M_MB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("MMR_12M_MB", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("MEN_ACYW_12M_MB", "Meningococcal ACYW-135", "Men-C-ACYW", 12, null, ["Meningococcal A, C, Y, W-135"], 1, "Quadrivalent at 12m", false),
    ev("VAR_12M_MB", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_MB", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_MB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_MB", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_MB", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_MB", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("MEN_ACYW_G6_MB", "Meningococcal ACYW-135 (booster)", "Men-C-ACYW", null, "Grade 6", ["Meningococcal A, C, Y, W-135"], 1, "Booster", true),
    ev("HPV_G6_MB", "HPV", "HPV", null, "Grade 6", ["HPV"], 2, null, true),
    ev("HB_G6_MB", "Hepatitis B", "HBV", null, "Grade 6", ["Hepatitis B"], 2, null, true),
    ev("TDAP_G9_MB", "Tdap", "Tdap", null, "Grade 9", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("INFLUENZA_6M_MB", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

/** Quebec uses a distinct routine schedule vs several other provinces — verify dates with local public health. */
const QC: ProvinceSchedule = {
  province: "QC",
  provinceName: "Quebec",
  healthLinePhone: "811",
  scheduleUrl: "https://www.quebec.ca/en/health/advice-and-prevention/vaccination/vaccination-schedule-for-children",
  events: [
    ev("DTAP_HB_IPV_HIB_2M_QC", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_2M_QC", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_QC", "Rotavirus (Rotarix)", "Rot", 2, null, ["Rotavirus"], 1, "2-dose total series", false),
    ev("DTAP_HB_IPV_HIB_4M_QC", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_4M_QC", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_QC", "Rotavirus (Rotarix)", "Rot", 4, null, ["Rotavirus"], 1, "2nd and final dose", false),
    ev("MMR_12M_QC", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_QC", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("DTAP_IPV_HIB_15M_QC", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 15, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster; earlier than some provinces", false),
    ev("MEN_C_C_18M_QC", "Meningococcal C conjugate", "Men-C-C", 18, null, ["Meningococcal C"], 1, null, false),
    ev("HAHB_18M_QC", "HAHB (Hep A + B combined)", "HAHB", 18, null, ["Hepatitis A", "Hepatitis B"], 1, null, false),
    ev("DTAP_IPV_4_6Y_QC", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_QC", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_QC", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("PNEU_C13_4_6Y_QC", "Pneumococcal (booster)", "Pneu-C-13", 60, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("HPV_PRIMARY_Y4_QC", "HPV", "HPV", null, "Primary year 4", ["HPV"], 1, null, true),
    ev("HA_PRIMARY_Y4_QC", "Hepatitis A", "Hep A", null, "Primary year 4", ["Hepatitis A"], 1, null, true),
    ev("HAHB_SECONDARY_Y3_QC", "HAHB catch-up", "HAHB", null, "Secondary year 3", ["Hepatitis A", "Hepatitis B"], 2, "Catch-up", true),
    ev("INFLUENZA_6M_QC", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Offered annually 6m+; not formally recommended same as all provinces", false),
  ],
};

const NB: ProvinceSchedule = {
  province: "NB",
  provinceName: "New Brunswick",
  healthLinePhone: "811",
  scheduleUrl: "https://www2.gnb.ca/content/gnb/en/departments/ocmoh/for_individuals/content/immunization.html",
  events: [
    ev("HB_BIRTH_NB", "Hepatitis B", "HBV", 0, null, ["Hepatitis B"], 1, "Birth dose", false),
    ev("DTAP_IPV_HIB_2M_NB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_NB", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_NB", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_4M_NB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_NB", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_NB", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_6M_NB", "DTaP-IPV-Hib (3rd dose)", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "3rd dose", false),
    ev("HB_6M_NB", "Hepatitis B", "HBV", 6, null, ["Hepatitis B"], 1, "3rd dose to complete infant series", false),
    ev("MEN_C_C_12M_NB", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M_NB", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_NB", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_NB", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_NB", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_NB", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_NB", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_NB", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G7_NB", "HPV", "HPV", null, "Grade 7", ["HPV"], 1, null, true),
    ev("TDAP_G7_NB", "Tdap", "Tdap", null, "Grade 7", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("MEN_ACYW_G7_NB", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 7", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("MEN_ACYW_G9_NB", "Meningococcal ACYW-135 (booster)", "Men-C-ACYW", null, "Grade 9", ["Meningococcal A, C, Y, W-135"], 1, "Booster", true),
    ev("INFLUENZA_6M_NB", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const NS: ProvinceSchedule = {
  province: "NS",
  provinceName: "Nova Scotia",
  healthLinePhone: "811",
  scheduleUrl: "https://novascotia.ca/dhw/cdpc/immunization.asp",
  events: [
    ev("DTAP_IPV_HIB_2M_NS", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_NS", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_NS", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_4M_NS", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_NS", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_NS", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_6M_NS", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("MEN_C_C_12M_NS", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M_NS", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_NS", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_NS", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_NS", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_NS", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_NS", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_NS", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("TDAP_G7_NS", "Tdap", "Tdap", null, "Grade 7", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("HB_G7_NS", "Hepatitis B", "HBV", null, "Grade 7", ["Hepatitis B"], 2, null, true),
    ev("MEN_ACYW_G7_NS", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 7", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("HPV_G7_NS", "HPV", "HPV", null, "Grade 7", ["HPV"], 2, null, true),
    ev("INFLUENZA_6M_NS", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const PE: ProvinceSchedule = {
  province: "PE",
  provinceName: "Prince Edward Island",
  healthLinePhone: "811",
  scheduleUrl: "https://www.princeedwardisland.ca/en/information/health-pei/vaccinations-infants-and-children",
  events: [
    ev("DTAP_HB_IPV_HIB_2M_PE", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_2M_PE", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_PE", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_HB_IPV_HIB_4M_PE", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_4M_PE", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_PE", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_HB_IPV_HIB_6M_PE", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("MEN_C_C_12M_PE", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M_PE", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_PE", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_PE", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_PE", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_PE", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_PE", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_PE", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G6_PE", "HPV", "HPV", null, "Grade 6", ["HPV"], 2, null, true),
    ev("MEN_ACYW_G9_PE", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 9", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("TDAP_G9_PE", "Tdap", "Tdap", null, "Grade 9", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("INFLUENZA_6M_PE", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const NL: ProvinceSchedule = {
  province: "NL",
  provinceName: "Newfoundland and Labrador",
  healthLinePhone: "811",
  scheduleUrl: "https://www.gov.nl.ca/hcs/immunization/schedule/",
  events: [
    ev("DTAP_IPV_HIB_2M_NL", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_NL", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_NL", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_4M_NL", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_NL", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_NL", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_6M_NL", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("MEN_C_C_12M_NL", "Meningococcal C conjugate", "Men-C-C", 12, null, ["Meningococcal C"], 1, null, false),
    ev("MMR_12M_NL", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_NL", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_NL", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_NL", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("MMR_18M_NL", "MMR (2nd dose)", "MMR", 18, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("DTAP_IPV_4_6Y_NL", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("VAR_4_6Y_NL", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("MEN_ACYW_G4_NL", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 4", ["Meningococcal A, C, Y, W-135"], 1, "NL: Grade 4 (not Grade 9)", true),
    ev("HPV_G6_NL", "HPV", "HPV", null, "Grade 6", ["HPV"], 2, null, true),
    ev("HB_G6_NL", "Hepatitis B", "HBV", null, "Grade 6", ["Hepatitis B"], 2, null, true),
    ev("TDAP_G6_NL", "Tdap", "Tdap", null, "Grade 6", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("INFLUENZA_6M_NL", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const YT: ProvinceSchedule = {
  province: "YT",
  provinceName: "Yukon",
  healthLinePhone: "811",
  scheduleUrl: "https://yukon.ca/en/immunization-schedule",
  events: [
    ev("DTAP_HB_IPV_HIB_2M_YT", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_2M_YT", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_YT", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("MEN_C_C_2M_YT", "Meningococcal C conjugate", "Men-C-C", 2, null, ["Meningococcal C"], 1, "YT: also at 12m", false),
    ev("DTAP_HB_IPV_HIB_4M_YT", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("PNEU_C13_4M_YT", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_YT", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_HB_IPV_HIB_6M_YT", "DTaP-HB-IPV-Hib", "DTaP-HB-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib", "Hepatitis B"], 1, null, false),
    ev("MEN_C_C_12M_YT", "Meningococcal C conjugate (2nd dose)", "Men-C-C", 12, null, ["Meningococcal C"], 1, "2nd dose", false),
    ev("MMR_12M_YT", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_YT", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_YT", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_YT", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_YT", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_YT", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_YT", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G6_YT", "HPV", "HPV", null, "Grade 6", ["HPV"], 1, null, true),
    ev("TDAP_G6_YT", "Tdap", "Tdap", null, "Grade 6", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("MEN_ACYW_G9_YT", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 9", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("INFLUENZA_6M_YT", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const NT: ProvinceSchedule = {
  province: "NT",
  provinceName: "Northwest Territories",
  healthLinePhone: "811",
  scheduleUrl: "https://www.hss.gov.nt.ca/en/services/immunization",
  events: [
    ev("BCG_1M_NT", "BCG", "BCG", 1, null, ["Tuberculosis (limited settings)"], 1, "Unique to NT/NU", false),
    ev("HB_1M_NT", "Hepatitis B", "HBV", 1, null, ["Hepatitis B"], 1, null, false),
    ev("DTAP_IPV_HIB_2M_NT", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_NT", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_NT", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("MEN_C_C_2M_NT", "Meningococcal C conjugate", "Men-C-C", 2, null, ["Meningococcal C"], 1, "NT: also at 12m", false),
    ev("DTAP_IPV_HIB_4M_NT", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_NT", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_NT", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("DTAP_IPV_HIB_6M_NT", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 6, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("HB_6M_NT", "Hepatitis B", "HBV", 6, null, ["Hepatitis B"], 1, "3rd dose", false),
    ev("MEN_C_C_12M_NT", "Meningococcal C conjugate (2nd dose)", "Men-C-C", 12, null, ["Meningococcal C"], 1, "2nd dose", false),
    ev("MMR_12M_NT", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_NT", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_NT", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_NT", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_NT", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_NT", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_NT", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G4_6_NT", "HPV", "HPV", null, "Grade 4-6 (age 9+)", ["HPV"], 2, null, true),
    ev("MEN_ACYW_G12_NT", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 12 (or pre-college)", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("INFLUENZA_6M_NT", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

const NU: ProvinceSchedule = {
  province: "NU",
  provinceName: "Nunavut",
  healthLinePhone: "1-800-661-0844",
  scheduleUrl: "https://www.gov.nu.ca/health/information/immunization",
  events: [
    ev("HB_BIRTH_NU", "Hepatitis B", "HBV", 0, null, ["Hepatitis B"], 1, "Birth dose", false),
    ev("BCG_1M_NU", "BCG", "BCG", 1, null, ["Tuberculosis (limited settings)"], 1, null, false),
    ev("HB_1M_NU", "Hepatitis B", "HBV", 1, null, ["Hepatitis B"], 1, "2nd dose", false),
    ev("DTAP_IPV_HIB_2M_NU", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 2, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_2M_NU", "Pneumococcal conjugate", "Pneu-C-13", 2, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_2M_NU", "Rotavirus", "Rot", 2, null, ["Rotavirus"], 1, null, false),
    ev("MEN_C_C_2M_NU", "Meningococcal C conjugate", "Men-C-C", 2, null, ["Meningococcal C"], 1, null, false),
    ev("DTAP_IPV_HIB_4M_NU", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 4, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, null, false),
    ev("PNEU_C13_4M_NU", "Pneumococcal conjugate", "Pneu-C-13", 4, null, ["Pneumococcal disease"], 1, null, false),
    ev("ROT_4M_NU", "Rotavirus", "Rot", 4, null, ["Rotavirus"], 1, null, false),
    ev("HB_9M_NU", "Hepatitis B", "HBV", 9, null, ["Hepatitis B"], 1, "3rd dose; unique Nunavut timing", false),
    ev("MEN_C_C_12M_NU", "Meningococcal C conjugate (booster)", "Men-C-C", 12, null, ["Meningococcal C"], 1, "Booster", false),
    ev("MMR_12M_NU", "MMR", "MMR", 12, null, ["Measles", "Mumps", "Rubella"], 1, null, false),
    ev("VAR_12M_NU", "Varicella", "Varicella", 12, null, ["Varicella"], 1, null, false),
    ev("PNEU_C13_12M_NU", "Pneumococcal (booster)", "Pneu-C-13", 12, null, ["Pneumococcal disease"], 1, "Booster", false),
    ev("DTAP_IPV_HIB_18M_NU", "DTaP-IPV-Hib", "DTaP-IPV-Hib", 18, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio", "Hib"], 1, "Booster", false),
    ev("DTAP_IPV_4_6Y_NU", "DTaP-IPV", "DTaP-IPV", 60, null, ["Diphtheria", "Tetanus", "Pertussis", "Polio"], 1, null, false),
    ev("MMR_4_6Y_NU", "MMR (2nd dose)", "MMR", 60, null, ["Measles", "Mumps", "Rubella"], 1, "2nd dose", false),
    ev("VAR_4_6Y_NU", "Varicella (2nd dose)", "Varicella", 60, null, ["Varicella"], 1, "2nd dose", false),
    ev("HPV_G6_NU", "HPV", "HPV", null, "Grade 6", ["HPV"], 1, null, true),
    ev("TDAP_G6_NU", "Tdap", "Tdap", null, "Grade 6", ["Tetanus", "Diphtheria", "Pertussis"], 1, null, true),
    ev("MEN_ACYW_G9_NU", "Meningococcal ACYW-135", "Men-C-ACYW", null, "Grade 9", ["Meningococcal A, C, Y, W-135"], 1, null, true),
    ev("INFLUENZA_6M_NU", "Influenza", "Influenza", 6, null, ["Influenza"], 1, "Annually 6m+", false),
  ],
};

/** All provincial/territorial schedules (PHAC-aligned reference data). */
export const PROVINCE_SCHEDULES: Map<Province, ProvinceSchedule> = new Map([
  ["ON", ON],
  ["BC", BC],
  ["AB", AB],
  ["SK", SK],
  ["MB", MB],
  ["QC", QC],
  ["NB", NB],
  ["NS", NS],
  ["PE", PE],
  ["NL", NL],
  ["YT", YT],
  ["NT", NT],
  ["NU", NU],
]);

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function getScheduleForProvince(province: Province): ProvinceSchedule {
  const s = PROVINCE_SCHEDULES.get(province);
  if (!s) {
    throw new Error(`Unknown province: ${province}`);
  }
  return s;
}

/** Safe parse for `children.province` and API bodies (DB stores plain text). */
export function parseProvinceFromDb(value: string | null | undefined): Province | null {
  if (value == null || String(value).trim() === "") return null;
  const u = String(value).trim().toUpperCase();
  return PROVINCE_SCHEDULES.has(u as Province) ? (u as Province) : null;
}

const SCHOOL_AGE_MIN_MONTHS = 60;

export function generateVaccineTimeline(
  dob: string,
  province: Province,
  completedVaccines: Array<{ vaccine_code: string; administered_at: string }>
): ScheduledVaccine[] {
  const sched = getScheduleForProvince(province);
  const birth = parseDob(dob);
  const today = startOfDay(new Date());
  const childAgeMonths = ageInMonthsAt(birth, today);

  const completed = new Map<string, string>();
  for (const v of completedVaccines) {
    completed.set(v.vaccine_code, v.administered_at);
  }

  const out: ScheduledVaccine[] = [];

  for (const ev of sched.events) {
    if (ev.isSchoolAge && childAgeMonths < SCHOOL_AGE_MIN_MONTHS) {
      continue;
    }

    let scheduledDate: Date;
    if (ev.ageMonths != null) {
      scheduledDate = addMonths(birth, ev.ageMonths);
    } else if (ev.gradeNote != null) {
      const approx = gradeNoteToApproxMonths(ev.gradeNote);
      if (approx == null) {
        continue;
      }
      scheduledDate = addMonths(birth, approx);
    } else {
      continue;
    }

    const administered = completed.has(ev.code);
    const administeredDate = administered ? parseDob(completed.get(ev.code)!) : null;

    const due = startOfDay(scheduledDate);
    const dayMs = 86400000;
    const daysUntilDue = Math.round((due.getTime() - today.getTime()) / dayMs);
    const isOverdue = !administered && due < today;

    out.push({
      ...ev,
      scheduledDate,
      isOverdue,
      daysUntilDue,
      administered,
      administeredDate,
    });
  }

  return out.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
}

export function getUpcomingVaccines(
  timeline: ScheduledVaccine[],
  daysAhead: number = 90
): ScheduledVaccine[] {
  const today = startOfDay(new Date());
  const end = today.getTime() + daysAhead * 86400000;
  return timeline.filter((v) => {
    if (v.administered) return false;
    const t = startOfDay(v.scheduledDate).getTime();
    return t >= today.getTime() && t <= end;
  });
}

export function getOverdueVaccines(timeline: ScheduledVaccine[]): ScheduledVaccine[] {
  return timeline.filter((v) => v.isOverdue && !v.administered);
}

export function getNextVaccine(timeline: ScheduledVaccine[]): ScheduledVaccine | null {
  const pending = timeline
    .filter((v) => !v.administered)
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  return pending[0] ?? null;
}

export function getVaccineCountdown(vaccine: ScheduledVaccine): string {
  const d = vaccine.daysUntilDue;
  if (vaccine.administered) {
    return "Completed";
  }
  if (d === 0) {
    return "Today";
  }
  if (d === 1) {
    return "Tomorrow";
  }
  if (d === -1) {
    return "1 day overdue";
  }
  if (d < 0) {
    const days = Math.abs(d);
    if (days < 7) {
      return `${days} day${days === 1 ? "" : "s"} overdue`;
    }
    const w = Math.round(days / 7);
    return w === 1 ? "1 week overdue" : `${w} weeks overdue`;
  }
  if (d < 7) {
    return `In ${d} day${d === 1 ? "" : "s"}`;
  }
  const w = Math.round(d / 7);
  return w === 1 ? "In 1 week" : `In ${w} weeks`;
}

export function getProvinceList(): Array<{ code: Province; name: string }> {
  return Array.from(PROVINCE_SCHEDULES.values())
    .map((p) => ({ code: p.province, name: p.provinceName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllProvinceDifferences(vaccine_code: string): Record<Province, string> {
  const out = {} as Record<Province, string>;
  for (const p of PROVINCE_SCHEDULES.keys()) {
    const sched = PROVINCE_SCHEDULES.get(p)!;
    const event = sched.events.find((e) => e.code === vaccine_code);
    if (!event) {
      out[p] = "No event with this code in this province schedule.";
      continue;
    }
    const bits = [
      event.name,
      event.ageMonths != null ? `${event.ageMonths} months` : event.gradeNote ?? "School-based",
      event.notes,
    ].filter(Boolean);
    out[p] = bits.join(" · ");
  }
  return out;
}
