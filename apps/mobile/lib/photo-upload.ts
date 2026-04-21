/** Supabase Storage bucket used for child profile photos (public read). */
export const CHILD_PHOTOS_BUCKET = "child-photos";

/**
 * Turns raw Storage API errors into actionable copy.
 */
export function formatChildPhotoUploadErrorMessage(rawMessage: string): string {
  const m = rawMessage.trim().toLowerCase();

  if (
    m.includes("bucket not found") ||
    m.includes("bucket does not exist") ||
    (m.includes("not found") && m.includes("bucket"))
  ) {
    return `Storage bucket "${CHILD_PHOTOS_BUCKET}" is missing. Create it in Supabase Dashboard → Storage → New bucket → name "child-photos" → enable Public.`;
  }

  if (
    m.includes("row level security") ||
    m.includes("rls") ||
    m.includes("policy") ||
    m.includes("permission denied") ||
    m.includes("unauthorized") ||
    m.includes("403")
  ) {
    return `Upload blocked by Storage policies for "${CHILD_PHOTOS_BUCKET}". Run the SQL policies in Supabase Dashboard → SQL Editor.`;
  }

  return `Could not upload photo (${rawMessage}). Ensure bucket "${CHILD_PHOTOS_BUCKET}" exists and is writable for signed-in users.`;
}
