"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  formatSleepDuration,
  getWakeWindowGuidance,
  type NapSchedule,
  type SafeSleepCategory,
  type SafeSleepItem,
  type SleepExpectations,
  type SleepRegression,
  type SleepSummary,
} from "@/lib/sleep-engine";
import { formatAgeMonths } from "@/lib/milestone-engine";

type TabId = "guide" | "safe" | "log";

type GuidancePayload = {
  child: { id: string; name: string; age_months: number };
  expectations: SleepExpectations;
  nap_schedule: NapSchedule;
  is_regression_age: boolean;
  current_regression: SleepRegression | null;
  safe_sleep_checklist: {
    items: SafeSleepItem[];
    completed_codes: string[];
  };
  recent_summary: SleepSummary;
};

type SleepLogRow = {
  id: string;
  child_id: string;
  sleep_start: string;
  sleep_end: string | null;
  sleep_type: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const TIRED_SIGNS = [
  "Eye rubbing or rubbing face",
  "Yawning",
  "Staring off or going quiet",
  "Fussing that escalates if you wait too long",
];

const OVERTIRED_SIGNS = [
  "Inconsolable crying or screaming",
  "Arching the back, rigid body",
  "Much harder to settle than usual",
];

const NOT_READY_DROP = [
  "Short naps only sometimes — not the same as ready to drop",
  "Cranky by late afternoon if a nap is skipped — still needs it",
  "Early morning waking after a nap was dropped — often overtiredness",
];

function logDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function todayLocalDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function formatDayHeading(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  const today = todayLocalDateStr();
  if (dateKey === today) return "Today";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const ystr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (dateKey === ystr) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function displayAgeLabel(ageMonths: number): string {
  const a = Math.max(0, ageMonths);
  if (a < 1) return a <= 0 ? "newborn" : "under 1 month";
  if (a < 12) {
    const m = Math.floor(a);
    return m === 1 ? "1 month" : `${m} months`;
  }
  return formatAgeMonths(Math.floor(a));
}

function ageHeaderSubtitle(
  payload: GuidancePayload | null
): string {
  if (!payload) return "";
  const reg = payload.current_regression;
  if (payload.is_regression_age && reg != null && reg.age_label) {
    return `${reg.age_label} regression window`;
  }
  return payload.expectations.age_label;
}

function showNapTransition(ageMonths: number): boolean {
  const a = Math.max(0, ageMonths);
  return (a >= 5 && a < 8) || (a >= 13 && a < 20);
}

/** Critical first, then Environment (incl. clothing), Position, Sharing, General */
function checklistSections(items: SafeSleepItem[]): {
  title: string;
  items: SafeSleepItem[];
}[] {
  const crit = items.filter((i) => i.is_critical);
  crit.sort((a, b) => a.title.localeCompare(b.title));

  const non = items.filter((i) => !i.is_critical);
  const pick = (...cats: SafeSleepCategory[]) =>
    non
      .filter((i) => cats.includes(i.category))
      .sort((a, b) => a.title.localeCompare(b.title));

  const sections: { title: string; items: SafeSleepItem[] }[] = [];
  if (crit.length) sections.push({ title: "Critical", items: crit });

  const env = pick("environment", "clothing");
  if (env.length) sections.push({ title: "Environment", items: env });

  const pos = pick("position");
  if (pos.length) sections.push({ title: "Position", items: pos });

  const share = pick("sharing");
  if (share.length) sections.push({ title: "Sharing", items: share });

  const gen = pick("general");
  if (gen.length) sections.push({ title: "General", items: gen });

  return sections;
}

function daysAgoFromToday(dateKey: string): number {
  const today = todayLocalDateStr();
  const t = new Date(`${today}T12:00:00`).getTime();
  const d = new Date(`${dateKey}T12:00:00`).getTime();
  if (Number.isNaN(d)) return 999;
  return Math.round((t - d) / 86400000);
}

function sleepMinutesBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 60000);
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

export default function SleepPage() {
  const params = useParams();
  const childId = typeof params.childId === "string" ? params.childId : "";

  const [tab, setTab] = useState<TabId>("guide");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<GuidancePayload | null>(null);

  const [logs, setLogs] = useState<SleepLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [regressionOpen, setRegressionOpen] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);

  const [checklistBusy, setChecklistBusy] = useState<string | null>(null);
  const [completedCodes, setCompletedCodes] = useState<Set<string>>(new Set());

  const [liveTick, setLiveTick] = useState(0);
  const [pastFormOpen, setPastFormOpen] = useState(false);
  const [pastStart, setPastStart] = useState("");
  const [pastEnd, setPastEnd] = useState("");
  const [pastType, setPastType] = useState<"nap" | "night" | "unknown">("nap");
  const [pastLocation, setPastLocation] = useState<string>("");

  const fetchGuidance = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sleep/guidance/${childId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Could not load sleep guidance.");
      setLoading(false);
      return;
    }
    const p = json as GuidancePayload;
    setPayload(p);
    setCompletedCodes(new Set(p.safe_sleep_checklist.completed_codes ?? []));
    setLoading(false);
  }, [childId]);

  const fetchLogs = useCallback(async () => {
    if (!childId) return;
    setLogsLoading(true);
    const res = await fetch(`/api/sleep/log/${childId}`);
    const json = await res.json().catch(() => ({}));
    setLogsLoading(false);
    if (!res.ok) return;
    if (Array.isArray(json.logs)) setLogs(json.logs as SleepLogRow[]);
  }, [childId]);

  useEffect(() => {
    void fetchGuidance();
  }, [fetchGuidance]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const open = logs.find((l) => l.sleep_end == null);
    if (!open) {
      return () => {};
    }
    const id = window.setInterval(() => setLiveTick((x) => x + 1), 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [logs]);

  const activeOpenLog = useMemo(
    () => logs.find((l) => l.sleep_end == null),
    [logs, liveTick]
  );

  const currentlySleeping = Boolean(activeOpenLog);

  const toggleChecklist = async (code: string, completed: boolean) => {
    setChecklistBusy(code);
    const res = await fetch(`/api/sleep/checklist/${childId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_code: code, completed }),
    });
    setChecklistBusy(null);
    if (res.ok) {
      setCompletedCodes((prev) => {
        const n = new Set(prev);
        if (completed) n.add(code);
        else n.delete(code);
        return n;
      });
    }
  };

  const startSleepSession = async () => {
    const res = await fetch(`/api/sleep/log/${childId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sleep_start: new Date().toISOString(),
        sleep_type: "nap",
      }),
    });
    if (res.ok) {
      await fetchLogs();
      await fetchGuidance();
    }
  };

  const endSleepSession = async () => {
    if (!activeOpenLog) return;
    const res = await fetch(`/api/sleep/log/${childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeOpenLog.id,
        sleep_end: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      await fetchLogs();
      await fetchGuidance();
    }
  };

  const submitPastSleep = async () => {
    if (!pastStart.trim()) return;
    const start = new Date(pastStart);
    if (Number.isNaN(start.getTime())) return;
    let sleep_end: string | undefined;
    if (pastEnd.trim()) {
      const end = new Date(pastEnd);
      if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) return;
      sleep_end = end.toISOString();
    }
    const res = await fetch(`/api/sleep/log/${childId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sleep_start: start.toISOString(),
        sleep_end,
        sleep_type: pastType,
        location: pastLocation || undefined,
      }),
    });
    if (res.ok) {
      setPastFormOpen(false);
      setPastStart("");
      setPastEnd("");
      setPastType("nap");
      setPastLocation("");
      await fetchLogs();
      await fetchGuidance();
    }
  };

  const deleteLog = async (id: string) => {
    const res = await fetch(`/api/sleep/log/${childId}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchLogs();
      await fetchGuidance();
    }
  };

  const logsByDay = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.sleep_start).getTime() - new Date(a.sleep_start).getTime()
    );
    const map = new Map<string, SleepLogRow[]>();
    for (const log of sorted) {
      const k = logDateKey(log.sleep_start);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(log);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [logs]);

  const logsByDayLast7 = useMemo(
    () =>
      logsByDay.filter(
        ([dayKey]) => daysAgoFromToday(dayKey) >= 0 && daysAgoFromToday(dayKey) < 7
      ),
    [logsByDay]
  );

  if (!childId) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200">
        <p>Missing child id.</p>
      </div>
    );
  }

  if (loading && !payload) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-indigo-200">
        <Spinner className="h-8 w-8 animate-spin" />
        <p className="mt-4 text-sm text-slate-400">Loading sleep guidance…</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200">
        <p className="text-amber-300">{error ?? "Something went wrong."}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-indigo-300 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const {
    child,
    expectations: exp,
    nap_schedule: napSch,
    recent_summary,
  } = payload;
  const ageMonths = child.age_months;
  const regressionDetail =
    payload.is_regression_age && payload.current_regression != null
      ? payload.current_regression
      : null;

  const criticalItems = payload.safe_sleep_checklist.items.filter((i) => i.is_critical);
  const criticalConfirmed = criticalItems.filter((i) =>
    completedCodes.has(i.code)
  ).length;
  const criticalTotal = criticalItems.length;
  const allCriticalDone = criticalTotal > 0 && criticalConfirmed === criticalTotal;

  const safeSleepSections = checklistSections([
    ...payload.safe_sleep_checklist.items,
  ]);

  const wwMin = exp.wake_window_minutes_min;
  const wwMax = exp.wake_window_minutes_max;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-28 text-slate-100">
      <div
        className={`pointer-events-none fixed inset-0 ${tab === "log" ? "opacity-[0.11]" : "opacity-[0.07]"}`}
        style={{
          backgroundImage:
            tab === "log"
              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath fill='%23c4b5fd' fill-opacity='0.35' d='M60 12a48 48 0 100 96 48 48 0 000-96zm0 8a40 40 0 110 80 40 40 0 010-80z'/%3E%3Cpath fill='%23a5b4fc' d='M24 20l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z M96 88l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z M96 24l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z'/%3E%3C/svg%3E")`
              : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath fill='%23a5b4fc' d='M40 8l4 10h10l-8 6 3 10-9-6-9 6 3-10-8-6h10z'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-indigo-950/80 via-slate-950 to-slate-950"
        aria-hidden
      />

      <header className="relative z-10 sticky top-0 border-b border-indigo-500/20 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-300/90 hover:text-indigo-200"
          >
            ← Back
          </Link>
          <h1 className="text-center text-lg font-semibold tracking-tight text-indigo-100">
            Sleep
          </h1>
          <span className="w-12" aria-hidden />
        </div>
        <nav
          className="mx-auto flex max-w-lg gap-1 px-2 pb-2"
          aria-label="Sleep sections"
        >
          {(
            [
              ["guide", "Guide"],
              ["safe", "Safe Sleep"],
              ["log", "Sleep Log"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="nurture-page relative z-10 mx-auto max-w-lg pt-2">
        {tab === "guide" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-indigo-500/25 bg-slate-900/60 px-4 py-4 shadow-inner backdrop-blur">
              <p className="text-center text-base text-indigo-50">
                <span className="font-semibold text-amber-100">{child.name}</span> at{" "}
                <span className="font-medium">{displayAgeLabel(ageMonths)}</span>
                <span className="text-slate-500"> — </span>
                <span className="text-indigo-200/90">{ageHeaderSubtitle(payload)}</span>
              </p>
            </section>

            {regressionDetail != null && (
              <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/40">
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-amber-100">
                    This is a known regression age
                  </p>
                  <p
                    className={`mt-2 text-sm leading-relaxed text-amber-100/90 ${
                      regressionOpen ? "" : "line-clamp-3"
                    }`}
                  >
                    {regressionDetail.why_it_happens}
                  </p>
                  <p className="mt-3 text-sm text-amber-100/90">
                    Often lasts about{" "}
                    <strong>
                      {regressionDetail.duration_weeks_min}–
                      {regressionDetail.duration_weeks_max} weeks
                    </strong>
                    .
                  </p>
                  <p className="mt-3 rounded-lg bg-amber-950/50 px-3 py-2 text-sm font-medium text-amber-50">
                    This is temporary and completely normal
                  </p>
                  <button
                    type="button"
                    onClick={() => setRegressionOpen(!regressionOpen)}
                    className="mt-3 text-xs font-medium text-amber-300/90 underline-offset-2 hover:text-amber-200 hover:underline"
                  >
                    {regressionOpen ? "Hide full regression details" : "Show full regression details"}
                  </button>
                </div>
                {regressionOpen && (
                  <div className="space-y-3 border-t border-amber-500/15 px-4 py-4 text-sm text-amber-50/90">
                    <div>
                      <p className="font-semibold text-amber-200">Signs</p>
                      <ul className="mt-1 list-disc pl-5">
                        {regressionDetail.signs.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-200">What helps</p>
                      <ul className="mt-1 list-disc pl-5">
                        {regressionDetail.what_helps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <p>
                      <span className="font-semibold">Avoid: </span>
                      {regressionDetail.what_doesnt_help}
                    </p>
                    <p className="rounded-lg bg-amber-950/50 p-3 text-amber-100/95">
                      {regressionDetail.reassurance}
                    </p>
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-300/90">
                Sleep expectations
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 px-2 py-3">
                  <p className="text-[10px] font-medium uppercase text-slate-500">Total sleep</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-100">
                    {exp.total_hours_min}–{exp.total_hours_max}h
                  </p>
                  <p className="text-[10px] text-slate-500">~{exp.total_hours_typical}h typical</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 px-2 py-3">
                  <p className="text-[10px] font-medium uppercase text-slate-500">Night sleep</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-100">
                    ~{exp.night_sleep_hours}h
                  </p>
                  <p className="text-[10px] leading-tight text-slate-500">overnight total</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 px-2 py-3">
                  <p className="text-[10px] font-medium uppercase text-slate-500">Naps</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-100">
                    {exp.nap_count_typical}{" "}
                    {exp.nap_count_typical === 1 ? "nap" : "naps"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {exp.nap_count_min}–{exp.nap_count_max} typical range
                  </p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Normal range is wide — both ends are okay
              </p>
              <p className="mt-2 text-center text-xs text-indigo-200/80">
                Longest night stretch many families see: about{" "}
                <strong>{exp.longest_night_stretch_hours} hours</strong> (varies a lot)
              </p>
            </section>

            <section className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4">
              <h2 className="text-sm font-semibold text-indigo-200">Wake windows</h2>
              <p className="mt-1 text-xs text-slate-400">{getWakeWindowGuidance(ageMonths)}</p>
              <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <p className="text-center text-xs text-slate-400">Typical window length</p>
                <div className="mt-2 flex h-8 items-end justify-between gap-1 px-1">
                  <span className="text-[10px] text-slate-500">{wwMin}m</span>
                  <div className="flex h-6 flex-1 items-center px-1">
                    <div className="h-3 w-full rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-400"
                        style={{
                          width: `${Math.min(100, ((wwMin + wwMax) / 2 / Math.max(wwMax, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{wwMax}m</span>
                </div>
                <p className="mt-2 text-center text-xs text-slate-500">
                  Typical awake window: {wwMin}–{wwMax} minutes
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3">
                  <p className="text-xs font-semibold text-emerald-200">Tired signs</p>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-100/90">
                    {TIRED_SIGNS.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-3">
                  <p className="text-xs font-semibold text-rose-200">Overtired signs</p>
                  <ul className="mt-2 space-y-1 text-xs text-rose-100/90">
                    {OVERTIRED_SIGNS.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4">
              <h2 className="text-sm font-semibold text-indigo-200">Nap schedule</h2>
              <p className="mt-2 text-sm text-slate-300">
                <strong className="text-indigo-100">{napSch.nap_count} naps</strong> —{" "}
                {napSch.schedule_example}
              </p>
              <p className="mt-2 text-xs text-slate-400">Wake windows: {napSch.wake_windows}</p>
              {showNapTransition(ageMonths) && (
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-950/25 p-3">
                  <p className="text-xs font-semibold text-amber-200">Nap transition</p>
                  <p className="mt-2 text-xs text-amber-100/90">
                    <strong>Ready to drop a nap:</strong> {napSch.drop_signs}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-300">
                    Often <em>not</em> ready yet — parents drop too early:
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-400">
                    {NOT_READY_DROP.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  {napSch.transition_note && (
                    <p className="mt-2 text-xs text-slate-500">{napSch.transition_note}</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-indigo-500/15 bg-indigo-950/30 p-4">
              <h2 className="text-sm font-semibold text-indigo-200">What&apos;s normal</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                You&apos;re not alone — at this age, many parents see the following. If these sound
                familiar, you&apos;re likely right on track:
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
                {exp.what_is_normal.slice(0, 4).map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-indigo-400">✦</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <h2 className="text-sm font-semibold text-slate-200">Common challenges</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {exp.common_challenges.slice(0, 3).map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-600">—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950/80 to-slate-900 p-4 shadow-lg shadow-indigo-950/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                Parent survival tip
              </p>
              <p className="mt-2 text-sm leading-relaxed text-indigo-50">{exp.parent_tip}</p>
            </section>
          </div>
        )}

        {tab === "safe" && (
          <div className="space-y-4 pb-8">
            <div>
              <h2 className="text-xl font-semibold text-indigo-100">Safe sleep setup</h2>
              <p className="mt-1 text-sm text-slate-400">
                AAP 2022 guidelines — the most important thing you can do
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">
                  <strong className="text-indigo-200">{criticalConfirmed}</strong> of{" "}
                  <strong>{criticalTotal}</strong> critical items confirmed
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all ${
                    allCriticalDone ? "bg-emerald-500" : "bg-indigo-500"
                  }`}
                  style={{
                    width: `${criticalTotal ? (criticalConfirmed / criticalTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {allCriticalDone && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-center text-sm text-emerald-100">
                Great — safe sleep environment confirmed
              </div>
            )}

            <div className="space-y-6">
              {safeSleepSections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {section.title}
                  </h3>
                  {section.items.map((item) => {
                const done = completedCodes.has(item.code);
                const busy = checklistBusy === item.code;
                return (
                  <div
                    key={item.code}
                    className={`rounded-2xl border p-3 transition ${
                      item.is_critical
                        ? done
                          ? "border-emerald-500/40 bg-emerald-950/20"
                          : "border-red-500/35 bg-red-950/20"
                        : done
                          ? "border-emerald-500/25 bg-emerald-950/15"
                          : "border-slate-700/80 bg-slate-900/40"
                    }`}
                  >
                    <label className="flex cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={busy}
                        onChange={(e) => void toggleChecklist(item.code, e.target.checked)}
                        className="mt-1 size-4 rounded border-slate-600 bg-slate-800 text-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-indigo-50">{item.title}</span>
                          {item.is_critical && (
                            <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[10px] font-bold uppercase text-red-200">
                              Critical
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedWhy(expandedWhy === item.code ? null : item.code)
                          }
                          className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Why it matters {expandedWhy === item.code ? "▲" : "▼"}
                        </button>
                        {expandedWhy === item.code && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-400">
                            {item.why_it_matters}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                );
                  })}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 text-xs leading-relaxed text-slate-500">
              <p>
                Safe sleep practices reduce the risk of SIDS and sleep-related infant death, but
                cannot remove risk entirely.
              </p>
              <p className="mt-2">
                Once your baby can roll independently both ways, you cannot control their position
                all night — keep placing on the back to start.
              </p>
              <p className="mt-2">
                Room sharing (not bed sharing) on a separate surface is recommended for at least
                the first 6 months.
              </p>
              <p className="mt-3 text-slate-600">
                Source: AAP Safe Sleep Guidelines 2022
              </p>
            </div>
          </div>
        )}

        {tab === "log" && (
          <div className="space-y-5 pb-8">
            <p className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 px-3 py-2 text-center text-sm text-indigo-200/90">
              Sleep logging is optional — it is for your use, not a requirement
            </p>

            {(() => {
              const raw = recent_summary.last_wake_time;
              if (raw == null || String(raw).trim() === "") {
                return (
                  <p className="text-center text-xs text-slate-500">
                    Last wake today: not recorded yet (logs will fill this in).
                  </p>
                );
              }
              const d = new Date(raw);
              if (Number.isNaN(d.getTime())) {
                return null;
              }
              return (
                <p className="text-center text-xs text-slate-400">
                  Last wake today:{" "}
                  {d.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              );
            })()}

            <section className="rounded-3xl border-2 border-indigo-400/25 bg-gradient-to-b from-slate-900/90 to-indigo-950/40 p-6 text-center shadow-lg shadow-indigo-950/30">
              {currentlySleeping && activeOpenLog ? (
                <>
                  <p className="text-xl font-semibold tracking-tight text-[#f5f0e8]">
                    Baby is sleeping 😴
                  </p>
                  <p className="mt-3 font-mono text-3xl text-amber-100/95 tabular-nums">
                    {formatSleepDuration(
                      sleepMinutesBetween(activeOpenLog.sleep_start, new Date().toISOString())
                    )}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Current session · updates live</p>
                  <button
                    type="button"
                    onClick={() => void endSleepSession()}
                    className="mt-6 w-full rounded-2xl bg-indigo-500 py-4 text-base font-semibold text-[#f5f0e8] shadow-md shadow-indigo-900/40 hover:bg-indigo-400"
                  >
                    Tap to end sleep — save to log
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xl font-semibold tracking-tight text-[#f5f0e8]">
                    Baby is awake 🌅
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    When they drift off, tap below to start the timer.
                  </p>
                  <button
                    type="button"
                    onClick={() => void startSleepSession()}
                    className="mt-6 w-full rounded-2xl border-2 border-indigo-400/35 bg-indigo-950/60 py-4 text-base font-semibold text-[#f5f0e8] hover:border-indigo-300/50 hover:bg-indigo-900/50"
                  >
                    Baby is sleeping now — start timer
                  </button>
                </>
              )}
            </section>

            <div>
              <button
                type="button"
                onClick={() => setPastFormOpen(!pastFormOpen)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800/50 py-2 text-sm text-slate-300"
              >
                {pastFormOpen ? "Hide" : "Log a past sleep"}
              </button>
              {pastFormOpen && (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm">
                  <label className="block text-xs text-slate-500">
                    Start
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200"
                      value={pastStart}
                      onChange={(e) => setPastStart(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    End (optional)
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200"
                      value={pastEnd}
                      onChange={(e) => setPastEnd(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    Type
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200"
                      value={pastType}
                      onChange={(e) =>
                        setPastType(e.target.value as "nap" | "night" | "unknown")
                      }
                    >
                      <option value="nap">Nap</option>
                      <option value="night">Night</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  <label className="block text-xs text-slate-500">
                    Location (optional)
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200"
                      value={pastLocation}
                      onChange={(e) => setPastLocation(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="crib">Crib</option>
                      <option value="bassinet">Bassinet</option>
                      <option value="contact">Contact</option>
                      <option value="car">Car</option>
                      <option value="stroller">Stroller</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void submitPastSleep()}
                    className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            <section>
              <h3 className="text-sm font-semibold text-indigo-200">Last 7 days</h3>
              {logsLoading ? (
                <Spinner className="mt-2 h-6 w-6 animate-spin text-indigo-400" />
              ) : logsByDayLast7.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No logs yet.</p>
              ) : (
                <div className="mt-3 space-y-5">
                  {logsByDayLast7.map(([dayKey, dayLogs]) => {
                    const dayMins = dayLogs.reduce((acc, log) => {
                      if (!log.sleep_end) return acc;
                      return acc + sleepMinutesBetween(log.sleep_start, log.sleep_end);
                    }, 0);
                    const inRange =
                      dayMins / 60 >= exp.total_hours_min &&
                      dayMins / 60 <= exp.total_hours_max;
                    return (
                      <div key={dayKey}>
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {formatDayHeading(dayKey)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Total: {formatSleepDuration(dayMins)} · Target ~{exp.total_hours_min}–
                            {exp.total_hours_max}h
                            {inRange ? (
                              <span className="ml-1 text-emerald-400">✓</span>
                            ) : (
                              <span className="ml-1 text-slate-600">(wide range is normal)</span>
                            )}
                          </p>
                        </div>
                        <ul className="space-y-2">
                          {dayLogs.map((log) => (
                            <li
                              key={log.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-medium text-indigo-200">
                                  {log.sleep_type}
                                </span>
                                <span className="text-slate-500">
                                  {" "}
                                  · {new Date(log.sleep_start).toLocaleTimeString(undefined, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {log.sleep_end
                                    ? formatSleepDuration(
                                        sleepMinutesBetween(log.sleep_start, log.sleep_end)
                                      )
                                    : "…"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void deleteLog(log.id)}
                                  className="text-rose-400/80 hover:text-rose-300"
                                >
                                  ×
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
