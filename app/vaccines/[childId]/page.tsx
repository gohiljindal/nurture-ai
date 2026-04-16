"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getProvinceList,
  getScheduleForProvince,
  getVaccineCountdown,
  parseProvinceFromDb,
  type Province,
  type ScheduledVaccine,
} from "@/lib/canada-vaccine-schedule";

const GROUP_ORDER = [
  "Newborn",
  "2 months",
  "4 months",
  "6 months",
  "12 months",
  "15 months",
  "18 months",
  "4-6 years",
  "School age",
] as const;

type GroupId = (typeof GROUP_ORDER)[number];

function groupLabel(v: ScheduledVaccine): GroupId {
  if (v.isSchoolAge) return "School age";
  const m = v.ageMonths;
  if (m === null) return "School age";
  if (m === 0) return "Newborn";
  if (m <= 2) return "2 months";
  if (m <= 4) return "4 months";
  if (m <= 6) return "6 months";
  if (m <= 11) return "12 months";
  if (m <= 15) return "15 months";
  if (m <= 47) return "18 months";
  if (m <= 72) return "4-6 years";
  return "School age";
}

function parseScheduled(raw: Record<string, unknown>): ScheduledVaccine {
  return {
    code: String(raw.code),
    name: String(raw.name),
    shortName: String(raw.shortName),
    ageMonths: raw.ageMonths == null ? null : Number(raw.ageMonths),
    gradeNote: raw.gradeNote == null ? null : String(raw.gradeNote),
    diseases: Array.isArray(raw.diseases) ? (raw.diseases as string[]) : [],
    doses: Number(raw.doses),
    notes: raw.notes == null ? null : String(raw.notes),
    isSchoolAge: Boolean(raw.isSchoolAge),
    scheduledDate: new Date(String(raw.scheduledDate)),
    isOverdue: Boolean(raw.isOverdue),
    daysUntilDue: Number(raw.daysUntilDue),
    administered: Boolean(raw.administered),
    administeredDate: raw.administeredDate ? new Date(String(raw.administeredDate)) : null,
  };
}

type VaccinePayload = {
  child: {
    id: string;
    name: string;
    dob: string;
    province: Province;
    province_name: string;
  };
  timeline: ScheduledVaccine[];
  upcoming: ScheduledVaccine[];
  overdue: ScheduledVaccine[];
  next_vaccine: ScheduledVaccine | null;
  stats: {
    total: number;
    administered: number;
    overdue: number;
    upcoming_90_days: number;
    completion_pct: number;
  };
  province_info: {
    health_line: string;
    schedule_url: string;
  };
};

type RequiresProvincePayload = {
  requires_province: true;
  child: { id: string; name: string };
};

function normalizeStats(raw: unknown): VaccinePayload["stats"] {
  const s = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    total: typeof s.total === "number" ? s.total : 0,
    administered: typeof s.administered === "number" ? s.administered : 0,
    overdue: typeof s.overdue === "number" ? s.overdue : 0,
    upcoming_90_days: typeof s.upcoming_90_days === "number" ? s.upcoming_90_days : 0,
    completion_pct: typeof s.completion_pct === "number" ? s.completion_pct : 0,
  };
}

function normalizeProvinceInfo(raw: unknown, province: Province): VaccinePayload["province_info"] {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sched = getScheduleForProvince(province);
  return {
    health_line: typeof p.health_line === "string" ? p.health_line : sched.healthLinePhone,
    schedule_url: typeof p.schedule_url === "string" ? p.schedule_url : sched.scheduleUrl,
  };
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function VaccinesPage() {
  const params = useParams();
  const childId = typeof params.childId === "string" ? params.childId : "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requiresProvince, setRequiresProvince] = useState<RequiresProvincePayload | null>(null);
  const [data, setData] = useState<VaccinePayload | null>(null);

  const [provinceChoice, setProvinceChoice] = useState<Province | "">("");
  const [savingProvince, setSavingProvince] = useState(false);
  const [provinceError, setProvinceError] = useState<string | null>(null);

  const [showProvinceEditor, setShowProvinceEditor] = useState(false);
  const [changeProvinceChoice, setChangeProvinceChoice] = useState<Province | "">("");

  const [expandedGroups, setExpandedGroups] = useState<Set<GroupId>>(() => new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [markingCode, setMarkingCode] = useState<string | null>(null);
  const [markDate, setMarkDate] = useState(todayISODate());
  const [markClinic, setMarkClinic] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const provinces = useMemo(() => getProvinceList(), []);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/vaccines/${childId}`);
      const jsonUnknown: unknown = await res.json();
      const json = jsonUnknown as Record<string, unknown>;

      if (!res.ok) {
        setLoadError(typeof json.error === "string" ? json.error : "Could not load vaccines.");
        setRequiresProvince(null);
        setData(null);
        return;
      }

      if (json.requires_province === true) {
        const ch = json.child;
        const id =
          ch && typeof ch === "object" && typeof (ch as { id?: unknown }).id === "string"
            ? (ch as { id: string }).id
            : childId;
        const name =
          ch && typeof ch === "object" && typeof (ch as { name?: unknown }).name === "string"
            ? (ch as { name: string }).name
            : "Child";
        setRequiresProvince({ requires_province: true, child: { id, name } });
        setData(null);
        return;
      }

      const childRaw = json.child;
      if (!childRaw || typeof childRaw !== "object") {
        setLoadError("Invalid response.");
        setRequiresProvince(null);
        setData(null);
        return;
      }
      const cr = childRaw as Record<string, unknown>;
      const province = parseProvinceFromDb(
        typeof cr.province === "string" ? cr.province : null
      );
      if (province == null) {
        setRequiresProvince({
          requires_province: true,
          child: {
            id: typeof cr.id === "string" ? cr.id : childId,
            name: typeof cr.name === "string" ? cr.name : "Child",
          },
        });
        setData(null);
        return;
      }

      const timelineRaw = json.timeline;
      const timeline = Array.isArray(timelineRaw)
        ? timelineRaw.map((t) => parseScheduled(t as Record<string, unknown>))
        : [];
      const upcomingRaw = json.upcoming;
      const upcoming = Array.isArray(upcomingRaw)
        ? upcomingRaw.map((t) => parseScheduled(t as Record<string, unknown>))
        : [];
      const overdueRaw = json.overdue;
      const overdue = Array.isArray(overdueRaw)
        ? overdueRaw.map((t) => parseScheduled(t as Record<string, unknown>))
        : [];
      const nextRaw = json.next_vaccine;
      const next_vaccine =
        nextRaw && typeof nextRaw === "object"
          ? parseScheduled(nextRaw as Record<string, unknown>)
          : null;

      const sched = getScheduleForProvince(province);
      const province_name =
        typeof cr.province_name === "string" && cr.province_name.trim() !== ""
          ? cr.province_name
          : sched.provinceName;

      setRequiresProvince(null);
      setData({
        child: {
          id: typeof cr.id === "string" ? cr.id : childId,
          name: typeof cr.name === "string" ? cr.name : "Child",
          dob: typeof cr.dob === "string" ? cr.dob : "",
          province,
          province_name,
        },
        timeline,
        upcoming,
        overdue,
        next_vaccine,
        stats: normalizeStats(json.stats),
        province_info: normalizeProvinceInfo(json.province_info, province),
      });

      const firstOpen = timeline.find((v) => !v.administered);
      const g = firstOpen ? groupLabel(firstOpen) : GROUP_ORDER[0];
      setExpandedGroups(new Set([g]));
    } catch {
      setLoadError("Something went wrong. Please try again.");
      setRequiresProvince(null);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data?.child.province) {
      setChangeProvinceChoice(data.child.province);
    }
  }, [data?.child.province]);

  const grouped = useMemo(() => {
    if (!data) return new Map<GroupId, ScheduledVaccine[]>();
    const map = new Map<GroupId, ScheduledVaccine[]>();
    for (const g of GROUP_ORDER) {
      map.set(g, []);
    }
    for (const v of data.timeline) {
      const g = groupLabel(v);
      map.get(g)!.push(v);
    }
    for (const g of GROUP_ORDER) {
      map.get(g)!.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    }
    return map;
  }, [data]);

  const toggleGroup = (g: GroupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const toggleRow = (code: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const saveProvince = async (code: Province) => {
    setSavingProvince(true);
    setProvinceError(null);
    try {
      const res = await fetch(`/api/vaccines/${childId}/province`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ province: code }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setProvinceError(j.error || "Could not save province.");
        return;
      }
      await load();
    } catch {
      setProvinceError("Could not save province.");
    } finally {
      setSavingProvince(false);
    }
  };

  const saveProvinceChange = async () => {
    if (!changeProvinceChoice) return;
    setSavingProvince(true);
    setProvinceError(null);
    try {
      const res = await fetch(`/api/vaccines/${childId}/province`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ province: changeProvinceChoice }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setProvinceError(j.error || "Could not update province.");
        return;
      }
      setShowProvinceEditor(false);
      await load();
    } catch {
      setProvinceError("Could not update province.");
    } finally {
      setSavingProvince(false);
    }
  };

  const submitMark = async (v: ScheduledVaccine) => {
    const at = markDate.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(at)) {
      setSaveError("Use a valid date (YYYY-MM-DD).");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/vaccines/${childId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaccine_code: v.code,
          vaccine_name: v.name,
          administered_at: at,
          administered_by: markClinic.trim() || undefined,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(j.error || "Could not save.");
        return;
      }
      setMarkingCode(null);
      setMarkClinic("");
      setMarkDate(todayISODate());
      await load();
    } catch {
      setSaveError("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (!childId) {
    return (
      <main className="nurture-page mx-auto max-w-3xl">
        <p className="text-slate-600">Invalid child.</p>
      </main>
    );
  }

  if (loading && !data && !requiresProvince) {
    return (
      <main className="nurture-page mx-auto min-h-screen max-w-3xl pb-20 pt-2">
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded-lg bg-slate-200" />
          <div className="h-40 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (loadError && !data && !requiresProvince) {
    return (
      <main className="nurture-page mx-auto max-w-3xl">
        <p className="text-red-700">{loadError}</p>
        <Link href={`/child/${childId}`} className="mt-4 inline-block text-violet-700 underline">
          Back to child profile
        </Link>
      </main>
    );
  }

  if (requiresProvince) {
    return (
      <div className="nurture-app-bg pb-20">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Link
              href={`/child/${childId}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
              aria-label="Back"
            >
              ←
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">{requiresProvince.child.name}</h1>
          </div>
        </header>
        <main className="nurture-page mx-auto max-w-3xl space-y-6 pt-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
            <p className="font-medium text-amber-900">Choose your province or territory</p>
            <p className="mt-2 text-amber-900/90">
              Routine immunization schedules in Canada are set by each province and territory. Dates
              and products can differ (for example, meningococcal or school-based programs), so we
              need your location to show the right plan.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">Province / territory</label>
            <select
              value={provinceChoice}
              onChange={(e) => setProvinceChoice(e.target.value as Province | "")}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Select…</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {provinceError ? <p className="mt-2 text-sm text-red-700">{provinceError}</p> : null}
            <button
              type="button"
              disabled={!provinceChoice || savingProvince}
              onClick={() => provinceChoice && saveProvince(provinceChoice)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {savingProvince ? <Spinner className="h-4 w-4 animate-spin" /> : null}
              Continue
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const { child, stats, province_info, next_vaccine, overdue } = data;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f8fafc]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href={`/child/${childId}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
            aria-label="Back to child profile"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {child.name}&rsquo;s vaccines — {child.province_name}
            </h1>
            <button
              type="button"
              onClick={() => {
                setShowProvinceEditor((o) => !o);
                setProvinceError(null);
                setChangeProvinceChoice(child.province);
              }}
              className="mt-0.5 text-xs font-medium text-violet-800 hover:underline"
            >
              Change province
            </button>
          </div>
          <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold tabular-nums text-violet-900">
            {stats.completion_pct}%
          </span>
        </div>
      </header>

      <main className="nurture-page mx-auto max-w-3xl space-y-6 pt-2">
        {showProvinceEditor ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-800">Update province / territory</p>
            <select
              value={changeProvinceChoice}
              onChange={(e) => setChangeProvinceChoice(e.target.value as Province)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {provinceError ? <p className="mt-2 text-sm text-red-700">{provinceError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingProvince}
                onClick={saveProvinceChange}
                className="rounded-full bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowProvinceEditor(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : null}

        {overdue.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <p className="font-medium text-amber-900">
              {overdue.length} vaccine{overdue.length === 1 ? "" : "s"} overdue — worth mentioning at
              your next visit
            </p>
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-amber-900/90">
              {overdue.slice(0, 5).map((v) => (
                <li key={v.code}>
                  {v.shortName} ({v.code})
                </li>
              ))}
              {overdue.length > 5 ? (
                <li className="list-none pl-0 text-amber-800/80">…and {overdue.length - 5} more</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {next_vaccine && !next_vaccine.administered ? (
          <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Next due</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{next_vaccine.shortName}</h2>
            <p className="mt-1 text-sm text-slate-600">{next_vaccine.name}</p>
            <p className="mt-2 text-sm text-slate-700">
              Protects against: {next_vaccine.diseases.join(", ")}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Due around{" "}
              <span className="font-medium tabular-nums text-slate-900">
                {next_vaccine.scheduledDate.toLocaleDateString()}
              </span>
              <span className="ml-2 text-violet-800">
                · {getVaccineCountdown(next_vaccine)}
              </span>
            </p>
            {markingCode === next_vaccine.code ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    Date given
                    <input
                      type="date"
                      value={markDate}
                      onChange={(e) => setMarkDate(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Clinic (optional)
                    <input
                      value={markClinic}
                      onChange={(e) => setMarkClinic(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="Clinic name"
                    />
                  </label>
                </div>
                {saveError ? <p className="mt-2 text-xs text-red-700">{saveError}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => submitMark(next_vaccine)}
                    className="rounded-full bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {saving ? <Spinner className="h-4 w-4 animate-spin" /> : null}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMarkingCode(null);
                      setSaveError(null);
                    }}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMarkingCode(next_vaccine.code);
                  setMarkDate(todayISODate());
                  setMarkClinic("");
                  setSaveError(null);
                }}
                className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
              >
                Mark as done
              </button>
            )}
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Given</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-violet-800">
              {stats.administered}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Upcoming (90d)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">
              {stats.upcoming_90_days}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Overdue</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800">
              {stats.overdue}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">
              {stats.total}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-900">
            Schedule is specific to {child.province_name}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            This list follows provincial guidance for reference only — not a substitute for your
            health-care provider.
          </p>
          <a
            href={province_info.schedule_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-violet-800 underline"
          >
            Official {child.province_name} immunization schedule
          </a>
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Health line:</span> call{" "}
            <span className="tabular-nums font-medium">{province_info.health_line}</span> for
            vaccine questions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h2>
          {GROUP_ORDER.map((gid) => {
            const items = grouped.get(gid) ?? [];
            if (items.length === 0) return null;
            const done = items.filter((v) => v.administered).length;
            const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
            const open = expandedGroups.has(gid);

            return (
              <div
                key={gid}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(gid)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
                >
                  <span className="text-slate-400">{open ? "▼" : "▶"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{gid}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {done}/{items.length} done
                    </p>
                  </div>
                </button>
                {open ? (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {items.map((v) => {
                      const rowOpen = expandedRows.has(v.code);
                      const statusDone = v.administered;
                      const statusOver = v.isOverdue && !v.administered;
                      return (
                        <li key={v.code} className="bg-white">
                          <div className="flex gap-3 px-4 py-3">
                            <div className="mt-0.5 shrink-0">
                              {statusDone ? (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                                  ✓
                                </span>
                              ) : statusOver ? (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700">
                                  !
                                </span>
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-400">
                                  ○
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-slate-900">{v.shortName}</p>
                                  <p className="text-xs text-slate-600">
                                    {v.diseases.slice(0, 3).join(", ")}
                                    {v.diseases.length > 3 ? "…" : ""}
                                  </p>
                                  <p className="mt-1 text-xs tabular-nums text-slate-500">
                                    Due ~ {v.scheduledDate.toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  {!statusDone ? (
                                    markingCode === v.code ? (
                                      <div className="w-full min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 p-2">
                                        <input
                                          type="date"
                                          value={markDate}
                                          onChange={(e) => setMarkDate(e.target.value)}
                                          className="w-full rounded border px-2 py-1 text-xs"
                                        />
                                        <input
                                          value={markClinic}
                                          onChange={(e) => setMarkClinic(e.target.value)}
                                          placeholder="Clinic (optional)"
                                          className="mt-1 w-full rounded border px-2 py-1 text-xs"
                                        />
                                        {saveError ? (
                                          <p className="mt-1 text-xs text-red-700">{saveError}</p>
                                        ) : null}
                                        <div className="mt-2 flex gap-2">
                                          <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => submitMark(v)}
                                            className="rounded bg-violet-600 px-2 py-1 text-xs text-white"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMarkingCode(null);
                                              setSaveError(null);
                                            }}
                                            className="text-xs text-slate-600"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMarkingCode(v.code);
                                          setMarkDate(todayISODate());
                                          setMarkClinic("");
                                          setSaveError(null);
                                        }}
                                        className="rounded-full border border-violet-600 px-2.5 py-1 text-xs font-medium text-violet-800 hover:bg-violet-50"
                                      >
                                        Mark given
                                      </button>
                                    )
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(v.code)}
                                    className="text-xs text-slate-500 hover:text-slate-800"
                                  >
                                    {rowOpen ? "Less" : "Details"}
                                  </button>
                                </div>
                              </div>
                              {rowOpen ? (
                                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                                  <p className="font-medium text-slate-900">{v.name}</p>
                                  {v.notes ? <p className="mt-1 text-xs">{v.notes}</p> : null}
                                  <p className="mt-2 text-xs">
                                    <span className="font-medium">Diseases:</span>{" "}
                                    {v.diseases.join(", ")}
                                  </p>
                                  {v.administeredDate ? (
                                    <p className="mt-2 text-xs text-violet-800">
                                      Recorded: {v.administeredDate.toLocaleDateString()}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </section>

        <footer className="pb-8 pt-2 text-center text-xs leading-relaxed text-slate-500">
          Informational only — always confirm vaccines with your clinician or public health office.
        </footer>
      </main>
    </div>
  );
}
