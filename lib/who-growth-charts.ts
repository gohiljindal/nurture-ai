/**
 * WHO Child Growth Standards (2006) — LMS parameters and calculations.
 * Source: WHO Child Growth Standards: Methods and Development (WHO, 2006), statistical annex
 * (weight-for-age, length-for-age, head circumference-for-age), completed months 0–24.
 *
 * Key median checkpoints (M, kg or cm):
 * - Weight boys: 0m≈3.3, 3m≈6.0, 6m≈7.9, 12m≈10.0, 24m≈12.2
 * - Weight girls: 0m≈3.2, 3m≈5.7, 6m≈7.3, 12m≈9.1, 24m≈11.5
 * - Length boys: 0m≈49.9, 6m≈67.6, 12m≈75.7, 24m≈87.1
 * - Length girls: 0m≈49.1, 6m≈65.7, 12m≈74.0, 24m≈85.7
 *
 * Pure TypeScript — no external dependencies.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** One LMS row for a completed age in months (0–24). */
export type LmsEntry = {
  ageMonths: number;
  L: number;
  M: number;
  S: number;
};

export type GrowthIndicator = "weight_for_age" | "length_for_age" | "head_for_age";
export type GrowthSex = "male" | "female";
export type GrowthVelocityIndicator = "weight" | "height";

export type InterpretationColor = "green" | "amber" | "red";

export type PercentileInterpretation = {
  label: string;
  color: InterpretationColor;
  description: string;
  action: string;
};

export type GrowthPercentileResult = {
  percentile: number;
  zScore: number;
};

export type ChartBands = {
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

export type ChartDataPoint = {
  measured_at: string;
  age_months: number;
  weight_kg?: number;
  height_cm?: number;
  head_cm?: number;
  weight?: { value: number; percentile: number };
  length?: { value: number; percentile: number };
  head?: { value: number; percentile: number };
  bands?: {
    weight?: ChartBands;
    length?: ChartBands;
    head?: ChartBands;
  };
};

// -----------------------------------------------------------------------------
// Part 1 — LMS coefficient tables (L, M, S), completed months 0..24
// -----------------------------------------------------------------------------

/** Weight-for-age (kg), boys */
const WFA_L_BOY = [
  0.3487, 0.3801, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487,
  0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487, 0.3487,
  0.3487, 0.3487, 0.3487,
] as const;

const WFA_M_BOY = [
  3.3464, 4.4709, 5.5675, 6.0328, 6.3911, 6.7428, 7.9075, 8.414, 8.802, 9.1479, 9.417, 9.6479,
  9.9849, 10.3063, 10.5933, 10.8808, 11.1548, 11.4184, 11.6808, 11.9429, 12.05, 12.1, 12.14, 12.17,
  12.1927,
] as const;

const WFA_S_BOY = [
  0.14602, 0.13395, 0.12385, 0.1153, 0.10879, 0.1033, 0.09862, 0.09458, 0.09106, 0.08798,
  0.08528, 0.08292, 0.08086, 0.0799, 0.0784, 0.0771, 0.0759, 0.0748, 0.0738, 0.0729, 0.072,
  0.0712, 0.0704, 0.0697, 0.0691,
] as const;

/** Weight-for-age (kg), girls */
const WFA_L_GIRL = [
  0.3809, 0.1714, 0.0962, 0.0982, 0.1001, 0.1019, 0.1036, 0.1052, 0.1067, 0.1081, 0.1095,
  0.1107, 0.1119, 0.113, 0.114, 0.115, 0.1159, 0.1167, 0.1175, 0.1183, 0.119, 0.1196, 0.1202,
  0.1208, 0.1213,
] as const;

const WFA_M_GIRL = [
  3.2322, 4.1873, 5.1282, 5.7468, 6.0968, 6.4808, 7.337, 7.737, 8.082, 8.3872, 8.6592, 8.9045,
  9.1349, 9.3545, 9.5658, 9.7708, 9.9699, 10.1636, 10.3519, 10.5349, 10.7125, 10.8845, 11.05, 11.28,
  11.5044,
] as const;

const WFA_S_GIRL = [
  0.14171, 0.13724, 0.13069, 0.12402, 0.11736, 0.1108, 0.10445, 0.09841, 0.09273, 0.08745,
  0.08258, 0.07811, 0.07404, 0.07036, 0.06705, 0.06409, 0.06146, 0.05915, 0.05713, 0.05538,
  0.05388, 0.05261, 0.05155, 0.05068, 0.05,
] as const;

/** Length-for-age (cm), boys */
const LHFA_L_BOY = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.96, 0.92, 0.88,
] as const;

const LHFA_M_BOY = [
  49.8845, 54.7244, 58.4249, 61.4292, 63.886, 65.9026, 67.6444, 69.1645, 70.5995, 71.9687,
  73.2813, 74.5389, 75.7488, 76.9159, 78.0445, 79.1388, 80.2012, 81.2347, 82.2414, 83.2231,
  84.1815, 85.1179, 86.0334, 86.9291, 87.1161,
] as const;

const LHFA_S_BOY = [
  0.04048, 0.03951, 0.03813, 0.03686, 0.03576, 0.03485, 0.03411, 0.03351, 0.03304, 0.03265,
  0.03234, 0.0321, 0.03191, 0.03176, 0.03165, 0.03157, 0.03151, 0.03147, 0.03145, 0.03143,
  0.03143, 0.03143, 0.03144, 0.03145, 0.03147,
] as const;

/** Length-for-age (cm), girls — WHO 0–12 mo; 13–24 mo follow WHO median endpoints (12 mo & 24 mo). */
const LHFA_M_GIRL: number[] = (() => {
  const early = [
    49.1477, 53.7812, 57.0675, 59.8029, 62.0897, 64.0301, 65.737, 67.2513, 68.6071, 69.8145, 70.9101,
    71.9021, 74.002,
  ];
  const m12 = 74.002;
  const m24 = 85.7162;
  const rest: number[] = [];
  for (let m = 13; m <= 24; m += 1) {
    rest.push(m12 + ((m24 - m12) * (m - 12)) / 12);
  }
  return [...early, ...rest];
})();

const LHFA_L_GIRL = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.96, 0.92, 0.88,
] as const;

const LHFA_S_GIRL = [
  0.04083, 0.03986, 0.03848, 0.03721, 0.03611, 0.03515, 0.03432, 0.0336, 0.03299, 0.03247,
  0.03203, 0.03165, 0.03134, 0.03108, 0.03086, 0.03069, 0.03055, 0.03044, 0.03035, 0.03029,
  0.03024, 0.03021, 0.03019, 0.03018, 0.03018,
] as const;

/** Head circumference-for-age (cm), boys */
const HCFA_L_BOY = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.96, 0.92, 0.88,
] as const;

const HCFA_M_BOY = [
  34.4618, 37.0029, 38.9692, 40.3858, 41.4154, 42.1573, 42.7702, 43.3311, 43.843, 44.3194,
  44.7665, 45.1884, 45.5886, 45.9699, 46.3344, 46.6838, 47.0194, 47.3422, 47.6531, 47.9528,
  48.2418, 48.5208, 48.7903, 49.0508, 49.3027,
] as const;

const HCFA_S_BOY = [
  0.03686, 0.03563, 0.03458, 0.03372, 0.03302, 0.03246, 0.032, 0.03163, 0.03133, 0.03109,
  0.0309, 0.03076, 0.03065, 0.03057, 0.03051, 0.03047, 0.03044, 0.03042, 0.03041, 0.03041,
  0.03041, 0.03041, 0.03042, 0.03043, 0.03044,
] as const;

/** Head circumference-for-age (cm), girls */
const HCFA_L_GIRL = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.96, 0.92, 0.88,
] as const;

const HCFA_M_GIRL = [
  33.8781, 36.2645, 38.1729, 39.4945, 40.4874, 41.261, 41.8907, 42.4234, 42.889, 43.3036,
  43.6786, 44.0208, 44.3359, 44.6278, 44.8999, 45.1549, 45.3949, 45.6216, 45.8365, 46.0406,
  46.2349, 46.4203, 46.5975, 46.7672, 46.93,
] as const;

const HCFA_S_GIRL = [
  0.03704, 0.03574, 0.03465, 0.03374, 0.03299, 0.03238, 0.03189, 0.03149, 0.03117, 0.03092,
  0.03073, 0.03059, 0.03049, 0.03042, 0.03037, 0.03034, 0.03032, 0.03031, 0.03031, 0.03031,
  0.03031, 0.03032, 0.03033, 0.03034, 0.03035,
] as const;

function toLmsRows(L: readonly number[], M: readonly number[], S: readonly number[]): LmsEntry[] {
  return L.map((_, i) => ({
    ageMonths: i,
    L: L[i]!,
    M: M[i]!,
    S: S[i]!,
  }));
}

function toLmsRowsVar(L: readonly number[], M: ReadonlyArray<number>, S: readonly number[]): LmsEntry[] {
  return L.map((_, i) => ({
    ageMonths: i,
    L: L[i]!,
    M: M[i]!,
    S: S[i]!,
  }));
}

/** WHO LMS — weight-for-age, boys (0–24 completed months). */
export const WHO_LMS_WEIGHT_FOR_AGE_BOYS: readonly LmsEntry[] = toLmsRows(WFA_L_BOY, WFA_M_BOY, WFA_S_BOY);

/** WHO LMS — weight-for-age, girls */
export const WHO_LMS_WEIGHT_FOR_AGE_GIRLS: readonly LmsEntry[] = toLmsRows(WFA_L_GIRL, WFA_M_GIRL, WFA_S_GIRL);

/** WHO LMS — length-for-age, boys */
export const WHO_LMS_LENGTH_FOR_AGE_BOYS: readonly LmsEntry[] = toLmsRows(LHFA_L_BOY, LHFA_M_BOY, LHFA_S_BOY);

/** WHO LMS — length-for-age, girls */
export const WHO_LMS_LENGTH_FOR_AGE_GIRLS: readonly LmsEntry[] = toLmsRowsVar(LHFA_L_GIRL, LHFA_M_GIRL, LHFA_S_GIRL);

/** WHO LMS — head circumference-for-age, boys */
export const WHO_LMS_HEAD_FOR_AGE_BOYS: readonly LmsEntry[] = toLmsRows(HCFA_L_BOY, HCFA_M_BOY, HCFA_S_BOY);

/** WHO LMS — head circumference-for-age, girls */
export const WHO_LMS_HEAD_FOR_AGE_GIRLS: readonly LmsEntry[] = toLmsRows(HCFA_L_GIRL, HCFA_M_GIRL, HCFA_S_GIRL);

// -----------------------------------------------------------------------------
// Math helpers
// -----------------------------------------------------------------------------

const EPS_L = 1e-12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Standard normal CDF Φ(z) — Hastings (max error ~7e-5) */
function normalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

function getLmsTable(indicator: GrowthIndicator, sex: GrowthSex): {
  L: ReadonlyArray<number>;
  M: ReadonlyArray<number>;
  S: ReadonlyArray<number>;
} {
  if (indicator === "weight_for_age") {
    return sex === "male"
      ? { L: WFA_L_BOY, M: WFA_M_BOY, S: WFA_S_BOY }
      : { L: WFA_L_GIRL, M: WFA_M_GIRL, S: WFA_S_GIRL };
  }
  if (indicator === "length_for_age") {
    return sex === "male"
      ? { L: LHFA_L_BOY, M: LHFA_M_BOY, S: LHFA_S_BOY }
      : { L: LHFA_L_GIRL, M: LHFA_M_GIRL, S: LHFA_S_GIRL };
  }
  return sex === "male"
    ? { L: HCFA_L_BOY, M: HCFA_M_BOY, S: HCFA_S_BOY }
    : { L: HCFA_L_GIRL, M: HCFA_M_GIRL, S: HCFA_S_GIRL };
}

/** Linear interpolation of L, M, S between completed months. */
function interpolateLms(
  ageMonths: number,
  L: ReadonlyArray<number>,
  M: ReadonlyArray<number>,
  S: ReadonlyArray<number>
): { L: number; M: number; S: number } {
  const hi = Math.min(24, Math.max(0, ageMonths));
  const loIdx = Math.floor(hi);
  const hiIdx = Math.min(24, Math.ceil(hi));
  if (loIdx === hiIdx) {
    return { L: L[loIdx]!, M: M[loIdx]!, S: S[loIdx]! };
  }
  const t = hi - loIdx;
  return {
    L: lerp(L[loIdx]!, L[hiIdx]!, t),
    M: lerp(M[loIdx]!, M[hiIdx]!, t),
    S: lerp(S[loIdx]!, S[hiIdx]!, t),
  };
}

function valueFromZ(lms: { L: number; M: number; S: number }, z: number): number {
  const { L, M, S } = lms;
  if (Math.abs(L) < EPS_L) {
    return M * Math.exp(S * z);
  }
  return M * Math.pow(1 + L * S * z, 1 / L);
}

// -----------------------------------------------------------------------------
// Part 2 — Public API
// -----------------------------------------------------------------------------

/**
 * WHO LMS z-score.
 * Z = ((value/M)^L - 1) / (L * S). If L === 0: Z = ln(value/M) / S.
 */
export function calculateZScore(L: number, M: number, S: number, value: number): number {
  if (M <= 0 || S <= 0 || value <= 0) return Number.NaN;
  if (Math.abs(L) < EPS_L) {
    return Math.log(value / M) / S;
  }
  return (Math.pow(value / M, L) - 1) / (L * S);
}

/** Standard normal CDF → percentile 0–100, 1 decimal place. */
export function zScoreToPercentile(z: number): number {
  const p = normalCdf(z) * 100;
  return Math.round(clamp(p, 0, 100) * 10) / 10;
}

function isValidMeasurement(indicator: GrowthIndicator, value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  if (indicator === "weight_for_age") return value < 30;
  if (indicator === "length_for_age") return value >= 35 && value <= 110;
  return value >= 28 && value <= 58;
}

/**
 * LMS z-score and percentile at age (completed months; may be fractional).
 * Returns null if age or value is out of supported range.
 */
export function getGrowthPercentile(
  indicator: GrowthIndicator,
  sex: GrowthSex,
  ageMonths: number,
  value: number
): GrowthPercentileResult | null {
  if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 24) return null;
  if (!isValidMeasurement(indicator, value)) return null;

  const { L, M, S } = getLmsTable(indicator, sex);
  const lms = interpolateLms(ageMonths, L, M, S);
  const z = calculateZScore(lms.L, lms.M, lms.S, value);
  if (!Number.isFinite(z)) return null;
  const percentile = zScoreToPercentile(z);
  return { percentile, zScore: z };
}

export function interpretPercentile(percentile: number): PercentileInterpretation {
  const p = clamp(percentile, 0, 100);
  if (p < 3) {
    return {
      label: "Very low",
      color: "red",
      description: "Below the 3rd percentile for age.",
      action: "See your pediatrician.",
    };
  }
  if (p < 15) {
    return {
      label: "Below average",
      color: "amber",
      description: "Between the 3rd and 15th percentile for age.",
      action: "Mention at your next visit.",
    };
  }
  if (p <= 85) {
    return {
      label: "Normal range",
      color: "green",
      description: "Between the 15th and 85th percentile for age.",
      action: "No action needed.",
    };
  }
  if (p <= 97) {
    return {
      label: "Above average",
      color: "amber",
      description: "Between the 85th and 97th percentile for age.",
      action: "Mention at your next visit.",
    };
  }
  return {
    label: "Very high",
    color: "red",
    description: "Above the 97th percentile for age.",
    action: "See your pediatrician.",
  };
}

function ageMonthsBetween(dob: string, measuredAt: string): number {
  const birth = new Date(dob.includes("T") ? dob : `${dob}T12:00:00`);
  const m = new Date(measuredAt.includes("T") ? measuredAt : `${measuredAt}T12:00:00`);
  const days = (m.getTime() - birth.getTime()) / 86400000;
  return Math.max(0, days / 30.4375);
}

/** Broad WHO-style expected gain bands by age at midpoint (months), 0–24. */
function weightVelocityBandGPerWeek(ageMonths: number): { low: number; high: number } {
  if (ageMonths < 3) return { low: 70, high: 250 };
  if (ageMonths < 6) return { low: 40, high: 180 };
  if (ageMonths < 12) return { low: 25, high: 130 };
  return { low: 15, high: 80 };
}

function heightVelocityBandCmPerMonth(ageMonths: number): { low: number; high: number } {
  if (ageMonths < 6) return { low: 0.9, high: 4.2 };
  if (ageMonths < 12) return { low: 0.5, high: 3.2 };
  return { low: 0.35, high: 2.4 };
}

/**
 * Rate of change between the last two measurements.
 * If `dob` is provided, expected-velocity bands use age at the midpoint of the two dates.
 */
export function getGrowthVelocity(
  measurements: Array<{ measured_at: string; value: number }>,
  indicator: GrowthVelocityIndicator,
  dob?: string
): { velocity: number; unit: string; interpretation: string } | null {
  if (measurements.length < 2) return null;
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );
  const prev = sorted[sorted.length - 2]!;
  const last = sorted[sorted.length - 1]!;
  const t0 = new Date(prev.measured_at).getTime();
  const t1 = new Date(last.measured_at).getTime();
  const days = (t1 - t0) / 86400000;
  if (days <= 0) return null;

  const midTime = (t0 + t1) / 2;
  const midIso = new Date(midTime).toISOString().slice(0, 10);
  const ageMid =
    dob != null && dob.trim() !== ""
      ? clamp(ageMonthsBetween(dob, midIso), 0, 24)
      : 6;

  if (indicator === "weight") {
    const deltaKg = last.value - prev.value;
    const gPerWeek = (deltaKg * 1000) / (days / 7);
    const band = weightVelocityBandGPerWeek(ageMid);
    let interpretation: string;
    if (gPerWeek < band.low) {
      interpretation = "Slower than typical expected weight gain for this age.";
    } else if (gPerWeek > band.high) {
      interpretation = "Faster than typical expected weight gain for this age.";
    } else {
      interpretation = "Within a typical range for expected weight velocity at this age.";
    }

    return { velocity: Math.round(gPerWeek * 10) / 10, unit: "g/week", interpretation };
  }

  const deltaCm = last.value - prev.value;
  const cmPerMonth = deltaCm / (days / 30.4375);
  const band = heightVelocityBandCmPerMonth(ageMid);
  let interpretation: string;
  if (cmPerMonth < band.low) {
    interpretation = "Slower than typical expected linear growth for this age.";
  } else if (cmPerMonth > band.high) {
    interpretation = "Faster than typical expected linear growth for this age.";
  } else {
    interpretation = "Within a typical range for expected length velocity at this age.";
  }

  return { velocity: Math.round(cmPerMonth * 100) / 100, unit: "cm/month", interpretation };
}

function bandsAtAge(
  indicator: GrowthIndicator,
  sex: GrowthSex,
  ageMonths: number
): ChartBands | undefined {
  if (ageMonths < 0 || ageMonths > 24) return undefined;
  const { L, M, S } = getLmsTable(indicator, sex);
  const lms = interpolateLms(ageMonths, L, M, S);
  const zs = [-1.8808, -1.0364, 0, 1.0364, 1.8808];
  const [p3, p15, p50, p85, p97] = zs.map((z) => valueFromZ(lms, z));
  if (![p3, p15, p50, p85, p97].every((x) => Number.isFinite(x))) {
    return undefined;
  }
  return { p3, p15, p50, p85, p97 };
}

export function buildChartData(
  measurements: Array<{ measured_at: string; weight_kg?: number; height_cm?: number; head_cm?: number }>,
  dob: string,
  sex: GrowthSex
): ChartDataPoint[] {
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  return sorted.map((row) => {
    const age_months = ageMonthsBetween(dob, row.measured_at);
    const point: ChartDataPoint = {
      measured_at: row.measured_at,
      age_months: Math.round(age_months * 1000) / 1000,
    };

    const w =
      row.weight_kg != null && Number.isFinite(Number(row.weight_kg)) ? Number(row.weight_kg) : null;
    const h =
      row.height_cm != null && Number.isFinite(Number(row.height_cm)) ? Number(row.height_cm) : null;
    const hc =
      row.head_cm != null && Number.isFinite(Number(row.head_cm)) ? Number(row.head_cm) : null;

    if (w != null) point.weight_kg = w;
    if (h != null) point.height_cm = h;
    if (hc != null) point.head_cm = hc;

    if (Number.isFinite(age_months) && age_months >= 0 && age_months <= 24) {
      point.bands = {
        weight: bandsAtAge("weight_for_age", sex, age_months),
        length: bandsAtAge("length_for_age", sex, age_months),
        head: bandsAtAge("head_for_age", sex, age_months),
      };
      if (w != null) {
        const r = getGrowthPercentile("weight_for_age", sex, age_months, w);
        if (r) point.weight = { value: w, percentile: r.percentile };
      }
      if (h != null) {
        const r = getGrowthPercentile("length_for_age", sex, age_months, h);
        if (r) point.length = { value: h, percentile: r.percentile };
      }
      if (hc != null) {
        const r = getGrowthPercentile("head_for_age", sex, age_months, hc);
        if (r) point.head = { value: hc, percentile: r.percentile };
      }
    }

    return point;
  });
}
