# `child-photos` storage — quarterly policy review (task 14)

**Purpose:** Supabase Storage bucket `child-photos` holds child profile images. Policies must stay aligned with product rules (authenticated upload, user-scoped reads).

## Where policies live

- SQL to apply / re-apply: `supabase/manual/child-photos-storage-policies.sql`
- Upload error helpers: `lib/child-photo-upload-error.ts`

## Quarterly checklist (calendar reminder)

1. **Re-read policies** in the SQL file — confirm `INSERT`/`UPDATE`/`SELECT` still match how the app builds URLs (`/object/public/...`).
2. **Supabase Dashboard → Storage → Policies** — verify the bucket exists and RLS policies match the repo (no accidental “public write”).
3. **New environments** — staging/prod buckets created with the same policy pattern before enabling uploads.
4. **Dependency / Supabase releases** — skim [Supabase changelog](https://github.com/supabase/supabase/releases) for storage breaking changes.

No code change is required each quarter unless a drift or incident is found.
