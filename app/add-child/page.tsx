"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CHILD_PHOTOS_BUCKET,
  formatChildPhotoUploadErrorMessage,
} from "@/lib/child-photo-upload-error";

function validateOptionalPhotoUrl(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) {
    return "Photo URL must start with http:// or https://.";
  }
  if (/supabase\.co\/storage/i.test(t) && !/\/object\/(public|sign)\//i.test(t)) {
    return "Photo URL is incomplete. Upload the image again, or paste the full URL (it must contain /object/public/…).";
  }
  return null;
}

export default function AddChildPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sexAtBirth, setSexAtBirth] = useState("");
  const [isPremature, setIsPremature] = useState(false);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  /** When true, `photoUrl` came from Storage upload — show read-only so it cannot be truncated by editing. */
  const [photoUrlLockedFromUpload, setPhotoUrlLockedFromUpload] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("");
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("You must be logged in to upload a photo.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const objectPath = `${user.id}/child-${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from(CHILD_PHOTOS_BUCKET)
        .upload(objectPath, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        setMessage(formatChildPhotoUploadErrorMessage(uploadError.message));
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(CHILD_PHOTOS_BUCKET).getPublicUrl(objectPath);
      setPhotoUrl(publicUrl);
      setPhotoUrlLockedFromUpload(true);
    } catch (err) {
      setMessage(`Could not upload photo: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const photoErr = validateOptionalPhotoUrl(photoUrl);
    if (photoErr) {
      setLoading(false);
      setMessage(photoErr);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setMessage("You must be logged in.");
      return;
    }

    const res = await fetch("/api/children", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        photo_url: photoUrl.trim() || null,
        date_of_birth: dateOfBirth,
        sex_at_birth: sexAtBirth === "prefer not to say" ? null : sexAtBirth || null,
        is_premature: isPremature,
        gestational_age_weeks:
          isPremature && gestationalAgeWeeks ? Number(gestationalAgeWeeks) : null,
      }),
    });

    const json = (await res.json()) as { error?: string };

    setLoading(false);

    if (!res.ok) {
      setMessage(json.error ?? "Could not save child.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="nurture-page mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl text-slate-900 sm:text-3xl">👶 Add a child</h1>
      <p className="mb-6 text-sm leading-relaxed text-slate-600 sm:mb-8">
        We use age to tailor symptom checks and guidance—same caring flow as your parenting
        journey.
      </p>

      <form onSubmit={handleSubmit} className="nurture-card space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Child name</label>
          <input
            className="nurture-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Child photo (optional)</label>
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-violet-900 hover:file:bg-violet-200"
            />
            {photoUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <img src={photoUrl} alt="Child preview" className="h-14 w-14 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl("");
                    setPhotoUrlLockedFromUpload(false);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  🗑️ Remove photo
                </button>
              </div>
            ) : null}
            {photoUrl && photoUrlLockedFromUpload ? (
              <p className="text-xs text-slate-600">
                Photo attached. Tap <span className="font-semibold">Remove photo</span> above to choose a
                different image.
              </p>
            ) : (
              <textarea
                className="nurture-input min-h-[4.5rem] resize-y text-sm leading-snug"
                value={photoUrl}
                onChange={(ev) => {
                  setPhotoUrl(ev.target.value);
                  setPhotoUrlLockedFromUpload(false);
                }}
                placeholder="Or paste a full image URL (https://…)"
                autoComplete="off"
                rows={3}
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Date of birth</label>
          <input
            type="date"
            className="nurture-input"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Sex</label>
          <select
            className="nurture-input"
            value={sexAtBirth}
            onChange={(e) => setSexAtBirth(e.target.value)}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-violet-50/40 px-4 py-3">
          <input
            id="premature"
            type="checkbox"
            className="size-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
            checked={isPremature}
            onChange={(e) => setIsPremature(e.target.checked)}
          />
          <label htmlFor="premature" className="text-sm font-medium text-slate-800">
            🍼 Premature baby
          </label>
        </div>

        {isPremature && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Gestational age at birth (weeks)
            </label>
            <input
              type="number"
              min="20"
              max="42"
              className="nurture-input"
              value={gestationalAgeWeeks}
              onChange={(e) => setGestationalAgeWeeks(e.target.value)}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-nurture-primary w-full min-h-12 py-3 text-base sm:min-h-11 sm:text-sm"
        >
          {loading ? "Saving…" : "💾 Save child"}
        </button>

        {message ? (
          <p className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-800">
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}
