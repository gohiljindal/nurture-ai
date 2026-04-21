import { redactUserId } from "@/lib/logging/redact";

export type ApiLogLevel = "info" | "warn" | "error";

export type ApiLogFields = {
  scope: "api";
  requestId: string;
  route: string;
  /** Redacted user id for correlation (never raw UUID in prod). */
  userRef?: string;
  message: string;
  code?: string;
  ts: string;
} & Record<string, unknown>;

/**
 * Structured JSON line for API diagnostics. Does not log request bodies or symptom text.
 */
export function apiLog(
  level: ApiLogLevel,
  fields: Omit<ApiLogFields, "scope" | "ts"> & { userId?: string | null }
): void {
  const { userId, ...rest } = fields;
  const line = {
    scope: "api" as const,
    ...rest,
    userRef: userId != null ? redactUserId(userId) : undefined,
    ts: new Date().toISOString(),
  } as ApiLogFields;
  const payload = JSON.stringify(line);
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
