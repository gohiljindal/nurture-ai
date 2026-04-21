/**
 * Task 36 — feature flags from `FEATURE_FLAGS_JSON` and/or `FEATURE_*` env vars.
 * Missing keys default to enabled so production behavior is unchanged unless opted out.
 */

function parseJsonFlags(): Record<string, boolean> {
  const raw = process.env.FEATURE_FLAGS_JSON?.trim();
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** e.g. FEATURE_EXPORT_JOBS=false → key `export_jobs` */
function parseEnvFeatureVars(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("FEATURE_") || k === "FEATURE_FLAGS_JSON") continue;
    const flagKey = k.slice(8).toLowerCase();
    if (v === "true" || v === "1") out[flagKey] = true;
    if (v === "false" || v === "0") out[flagKey] = false;
  }
  return out;
}

let cached: Record<string, boolean> | null = null;

export function getFeatureFlags(): Record<string, boolean> {
  if (cached) return cached;
  const fromJson = parseJsonFlags();
  const fromEnv = parseEnvFeatureVars();
  cached = { ...fromJson, ...fromEnv };
  return cached;
}

/** Use in tests to reset merged flags. */
export function resetFeatureFlagsCacheForTests(): void {
  cached = null;
}

/**
 * @param key snake_case flag name (e.g. `export_jobs`)
 * @param defaultEnabled when the flag was never set — default true for safe rollout
 */
export function isFeatureEnabled(key: string, defaultEnabled = true): boolean {
  const v = getFeatureFlags()[key];
  if (v === undefined) return defaultEnabled;
  return v;
}
