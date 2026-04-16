"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveChildButton({ childId }: { childId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onRemove() {
    const ok = window.confirm(
      "Remove this child profile? This action cannot be undone."
    );
    if (!ok) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${childId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(body.error ?? "Could not remove child profile.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(
        `Could not remove child profile: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
      >
        {busy ? "Removing…" : "🗑️ Remove child profile"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
