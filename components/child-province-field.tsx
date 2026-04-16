"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProvinceList } from "@/lib/canada-vaccine-schedule";

const PROVINCES = getProvinceList();

type Props = {
  childId: string;
  initialProvince: string | null;
};

export default function ChildProvinceField({ childId, initialProvince }: Props) {
  const router = useRouter();
  const normalized = initialProvince?.trim() || null;
  const [province, setProvince] = useState<string | null>(normalized);
  const [editing, setEditing] = useState(!normalized);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setProvince(initialProvince?.trim() || null);
  }, [initialProvince]);

  const nameForCode = (code: string) =>
    PROVINCES.find((p) => p.code === code)?.name ?? code;

  async function save(value: string) {
    if (value === province) {
      setEditing(false);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/vaccines/${childId}/province`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ province: value }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Could not save province.");
        return;
      }
      setProvince(value);
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="child-province" className="sm:col-span-2">
      <p className="text-sm text-gray-500">Province / Territory</p>

      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {province && !editing ? (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium">{nameForCode(province)}</span>
          <span className="text-sm text-gray-500">({province})</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
            className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <select
            className="max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            value={province ?? ""}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              void save(v);
            }}
            aria-label="Province or territory"
          >
            <option value="">Select province or territory…</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          {province && editing && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setEditing(false);
              }}
              className="text-sm text-gray-600 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
