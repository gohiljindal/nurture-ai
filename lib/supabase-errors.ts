/**
 * Detects Postgres/PostgREST errors when a table or relation is missing (migrations not applied).
 */
export function isMissingRelationError(
  error: { code?: string; message?: string } | null | undefined,
  relationName: string
): boolean {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  const rel = relationName.toLowerCase();
  if (code === "42P01") return true;
  if (msg.includes(rel) && msg.includes("does not exist")) return true;
  if (msg.includes("schema cache") && msg.includes(rel)) return true;
  return false;
}
