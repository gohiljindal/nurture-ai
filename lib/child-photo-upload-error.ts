/** Supabase Storage bucket used for child profile photos (public read). */
export const CHILD_PHOTOS_BUCKET = "child-photos";

const DOCS_URL =
  "https://supabase.com/docs/guides/storage/buckets/creating-buckets";

/** Repo-local SQL to paste into Supabase SQL Editor (policies for `child-photos`). */
export const CHILD_PHOTOS_POLICIES_SQL_PATH =
  "supabase/manual/child-photos-storage-policies.sql";

/**
 * Turns raw Storage API errors into actionable copy for developers.
 */
export function formatChildPhotoUploadErrorMessage(rawMessage: string): string {
  const m = rawMessage.trim().toLowerCase();

  if (
    m.includes("bucket not found") ||
    m.includes("bucket does not exist") ||
    (m.includes("not found") && m.includes("bucket"))
  ) {
    return [
      `Storage bucket "${CHILD_PHOTOS_BUCKET}" is missing in your Supabase project.`,
      "Create it: Supabase Dashboard → Storage → New bucket → name `child-photos` → enable Public.",
      `Then run the SQL in ${CHILD_PHOTOS_POLICIES_SQL_PATH} (Supabase Dashboard → SQL Editor).`,
      `Docs: ${DOCS_URL}`,
    ].join(" ");
  }

  if (
    m.includes("row level security") ||
    m.includes("rls") ||
    m.includes("policy") ||
    m.includes("permission denied") ||
    m.includes("unauthorized") ||
    m.includes("403")
  ) {
    return [
      `Upload was blocked by Storage policies for "${CHILD_PHOTOS_BUCKET}".`,
      `Or run ${CHILD_PHOTOS_POLICIES_SQL_PATH} in the SQL Editor to apply the standard policies.`,
      `Docs: ${DOCS_URL}`,
    ].join(" ");
  }

  return [
    `Could not upload photo (${rawMessage}).`,
    `Ensure bucket "${CHILD_PHOTOS_BUCKET}" exists and is writable for signed-in users.`,
    `If the bucket exists, run ${CHILD_PHOTOS_POLICIES_SQL_PATH} in the SQL Editor.`,
    `Docs: ${DOCS_URL}`,
  ].join(" ");
}
