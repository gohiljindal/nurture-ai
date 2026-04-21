/**
 * PII-safe identifiers for logs. Never log full emails, names, or symptom text in production logs.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Short stable suffix for correlating support tickets without exposing full UUID. */
export function redactUserId(userId: string | null | undefined): string | undefined {
  if (!userId?.trim()) return undefined;
  const id = userId.trim();
  if (UUID_RE.test(id)) {
    return `user:…${id.slice(-8)}`;
  }
  return "user:opaque";
}

/** Redact email to `a***@domain.com` for debug-only logs. Prefer not logging emails at all. */
export function redactEmail(email: string | null | undefined): string | undefined {
  if (!email?.includes("@")) return undefined;
  const [local, domain] = email.split("@");
  if (!local || !domain) return undefined;
  const safeLocal = local.length <= 2 ? "*" : `${local[0]}***`;
  return `${safeLocal}@${domain}`;
}
