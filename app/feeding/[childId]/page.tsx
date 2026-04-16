"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import {
  getAllergenProtocols,
  getDailyFeedingSummary,
  getSolidsReadiness,
  type FeedingGuidance,
  type FeedingStage,
  type SolidsReadiness,
} from "@/lib/feeding-engine";
import { formatAgeMonths } from "@/lib/milestone-engine";

type TabId = "guidance" | "allergens" | "log";

type GuidancePayload = {
  child: { id: string; name: string; age_months: number };
  guidance: FeedingGuidance;
  solids_readiness: SolidsReadiness;
  allergen_status: Array<{
    allergen: string;
    status: "introduced" | "overdue" | "upcoming" | "too_early";
    recommended_at_months: number;
  }>;
  current_stage: FeedingStage;
  all_stages: FeedingStage[];
};

type AllergenRow = {
  id: string;
  child_id: string;
  allergen: string;
  introduced_at: string | null;
  reaction_noted: boolean;
  reaction_description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FeedingLogRow = {
  id: string;
  child_id: string;
  logged_at: string;
  feeding_type: string;
  duration_minutes: number | null;
  volume_ml: number | null;
  solid_foods: string | null;
  notes: string | null;
  created_at: string;
};

function stageBannerLabel(ageMonths: number): string {
  const a = Math.max(0, ageMonths);
  if (a < 6) return "milk feeds only";
  if (a < 9) return "starting solids";
  if (a < 12) return "exploring foods";
  if (a < 18) return "family meals";
  return "confident eating";
}

function displayAgeMonths(ageMonths: number): string {
  if (ageMonths < 1) return ageMonths <= 0 ? "newborn" : "under 1 month";
  if (ageMonths < 12) {
    const m = Math.floor(ageMonths);
    return m === 1 ? "1 month" : `${m} months`;
  }
  return formatAgeMonths(Math.floor(ageMonths));
}

function foodEmoji(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    butternut: "🎃",
    squash: "🎃",
    sweet: "🍠",
    potato: "🥔",
    banana: "🍌",
    avocado: "🥑",
    meat: "🥩",
    cereal: "🥣",
    egg: "🥚",
    vegetable: "🥦",
    legume: "🫘",
    pear: "🍐",
    pasta: "🍝",
    tofu: "🧊",
    chicken: "🍗",
    cheese: "🧀",
    fish: "🐟",
    bread: "🍞",
    rice: "🍚",
    yogurt: "🥛",
    apple: "🍎",
    berry: "🫐",
  };
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k)) return v;
  }
  return "🍽️";
}

function cueIcon(kind: "hunger" | "full", i: number): string {
  if (kind === "hunger") {
    return ["👀", "👄", "🤲"][i % 3];
  }
  return ["😌", "🙅", "💤"][i % 3];
}

function feedingTypeLabel(t: string): string {
  const m: Record<string, string> = {
    breast_left: "Breast (L)",
    breast_right: "Breast (R)",
    breast_both: "Breast (both)",
    formula: "Formula",
    pumped: "Pumped milk",
    solids: "Solids",
    water: "Water",
  };
  return m[t] ?? t;
}

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

type ReadinessAnswers = {
  sitsWithSupport: boolean | null;
  showsInterest: boolean | null;
  lostTongueThrust: boolean | null;
};

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

export default function FeedingPage() {
  const params = useParams();
  const childId = typeof params.childId === "string" ? params.childId : "";

  const [tab, setTab] = useState<TabId>("guidance");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<GuidancePayload | null>(null);

  const [allergenRows, setAllergenRows] = useState<AllergenRow[]>([]);
  const [logs, setLogs] = useState<FeedingLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [readinessAnswers, setReadinessAnswers] = useState<ReadinessAnswers>({
    sitsWithSupport: null,
    showsInterest: null,
    lostTongueThrust: null,
  });

  const [leapOpen, setLeapOpen] = useState(false);
  const [expandedAllergen, setExpandedAllergen] = useState<string | null>(null);
  const [allergenBusy, setAllergenBusy] = useState<string | null>(null);

  const [detailModal, setDetailModal] = useState<{
    feeding_type: string;
    label: string;
  } | null>(null);
  const [detailDuration, setDetailDuration] = useState("");
  const [detailVolume, setDetailVolume] = useState("");
  const quickPressRef = useRef<{
    feeding_type: string;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ feeding_type: "", timer: null });

  const protocols = useMemo(() => getAllergenProtocols(), []);

  const fetchGuidance = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/feeding/guidance/${childId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Could not load guidance.");
      setLoading(false);
      return;
    }
    setGuidance(json as GuidancePayload);
    setLoading(false);
  }, [childId]);

  const fetchAllergens = useCallback(async () => {
    if (!childId) return;
    const res = await fetch(`/api/feeding/allergens/${childId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const rows = json.allergen_introductions;
    if (Array.isArray(rows)) setAllergenRows(rows as AllergenRow[]);
  }, [childId]);

  const fetchLogs = useCallback(async () => {
    if (!childId) return;
    setLogsLoading(true);
    const res = await fetch(`/api/feeding/log/${childId}`);
    const json = await res.json().catch(() => ({}));
    setLogsLoading(false);
    if (!res.ok) return;
    const list = json.logs;
    if (Array.isArray(list)) setLogs(list as FeedingLogRow[]);
  }, [childId]);

  useEffect(() => {
    void fetchGuidance();
  }, [fetchGuidance]);

  useEffect(() => {
    setReadinessAnswers({
      sitsWithSupport: null,
      showsInterest: null,
      lostTongueThrust: null,
    });
  }, [childId]);

  useEffect(() => {
    void fetchAllergens();
    void fetchLogs();
  }, [fetchAllergens, fetchLogs]);

  const readinessResult = useMemo(() => {
    if (!guidance) return null;
    return getSolidsReadiness(guidance.child.age_months, readinessAnswers);
  }, [guidance, readinessAnswers]);

  const toggleReadiness = (key: keyof ReadinessAnswers) => {
    setReadinessAnswers((prev) => {
      const cur = prev[key];
      const next =
        cur === null ? true : cur === true ? false : null;
      return { ...prev, [key]: next };
    });
  };

  const todaySummary = useMemo(() => {
    const today = todayLocalDateStr();
    return getDailyFeedingSummary(
      logs.map((l) => ({
        logged_at: l.logged_at,
        feeding_type: l.feeding_type,
        volume_ml: l.volume_ml ?? undefined,
        duration_minutes: l.duration_minutes ?? undefined,
      })),
      today
    );
  }, [logs]);

  const logsByDay = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    );
    const map = new Map<string, FeedingLogRow[]>();
    for (const log of sorted) {
      const k = logDateKey(log.logged_at);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(log);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [logs]);

  const markAllergenIntroduced = async (
    allergen: string,
    reaction?: boolean
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    setAllergenBusy(allergen);
    const res = await fetch(`/api/feeding/allergens/${childId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allergen,
        introduced_at: today,
        reaction_noted: reaction ?? false,
      }),
    });
    setAllergenBusy(null);
    if (res.ok) {
      await fetchAllergens();
      await fetchGuidance();
    }
  };

  const toggleReactionNoted = async (row: AllergenRow) => {
    setAllergenBusy(row.allergen);
    const res = await fetch(`/api/feeding/allergens/${childId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allergen: row.allergen,
        reaction_noted: !row.reaction_noted,
      }),
    });
    setAllergenBusy(null);
    if (res.ok) await fetchAllergens();
  };

  const postQuickLog = async (
    feeding_type: string,
    extra?: { duration_minutes?: number; volume_ml?: number }
  ) => {
    const res = await fetch(`/api/feeding/log/${childId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeding_type,
        ...extra,
      }),
    });
    if (res.ok) await fetchLogs();
  };

  const clearQuickPress = () => {
    const t = quickPressRef.current.timer;
    if (t) clearTimeout(t);
    quickPressRef.current = { feeding_type: "", timer: null };
  };

  const onQuickLogDown = (feeding_type: string, label: string) => {
    clearQuickPress();
    const timer = setTimeout(() => {
      quickPressRef.current.timer = null;
      setDetailModal({ feeding_type, label });
      setDetailDuration("");
      setDetailVolume("");
    }, 500);
    quickPressRef.current = { feeding_type, timer };
  };

  const onQuickLogUp = () => {
    const { timer, feeding_type } = quickPressRef.current;
    if (timer) {
      clearTimeout(timer);
      void postQuickLog(feeding_type);
    }
    quickPressRef.current = { feeding_type: "", timer: null };
  };

  const submitDetailModal = async () => {
    if (!detailModal) return;
    const d = detailDuration.trim() ? Number.parseInt(detailDuration, 10) : undefined;
    const v = detailVolume.trim() ? Number.parseInt(detailVolume, 10) : undefined;
    await postQuickLog(detailModal.feeding_type, {
      duration_minutes: Number.isFinite(d) ? d : undefined,
      volume_ml: Number.isFinite(v) ? v : undefined,
    });
    setDetailModal(null);
  };

  const deleteLog = async (id: string) => {
    const res = await fetch(`/api/feeding/log/${childId}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) await fetchLogs();
  };

  const statusBadge = (
    status: GuidancePayload["allergen_status"][number]["status"]
  ) => {
    if (status === "introduced") {
      return (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
          Introduced ✓
        </span>
      );
    }
    if (status === "overdue") {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">
          Overdue
        </span>
      );
    }
    if (status === "upcoming") {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
          Due soon
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
        Coming up
      </span>
    );
  };

  if (!childId) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 text-slate-800">
        <p>Missing child id.</p>
      </div>
    );
  }

  if (loading && !guidance) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] text-violet-900">
        <Spinner className="h-8 w-8 animate-spin text-violet-700" />
        <p className="mt-4 text-sm text-slate-600">Loading feeding guidance…</p>
      </div>
    );
  }

  if (error || !guidance) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 text-slate-800">
        <p className="text-red-700">{error ?? "Something went wrong."}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-violet-800 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const { child, guidance: g, current_stage: stage } = guidance;
  const ageMonths = child.age_months;
  const showReadiness =
    ageMonths >= 5 && ageMonths < 8 && readinessResult !== null;

  const reactionsNoted = allergenRows.filter((r) => r.reaction_noted);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f8fafc]/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-violet-900/80 hover:text-violet-950"
          >
            ← Back
          </Link>
          <h1 className="text-center text-lg font-semibold text-violet-950">
            Feeding
          </h1>
          <span className="w-12" aria-hidden />
        </div>
        <nav
          className="mx-auto flex max-w-lg gap-1 px-2 pb-2"
          aria-label="Feeding sections"
        >
          {(
            [
              ["guidance", "Guidance"],
              ["allergens", "Allergens"],
              ["log", "Food Log"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-violet-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="nurture-page mx-auto max-w-lg pt-2">
        {tab === "guidance" && (
          <div className="space-y-5">
            <section
              className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/60 px-4 py-4 shadow-sm"
              aria-label="Age and stage"
            >
              <p className="text-center text-base font-medium text-slate-900">
                <span className="font-semibold text-violet-950">{child.name}</span>{" "}
                is{" "}
                <span className="font-semibold">{displayAgeMonths(ageMonths)}</span>
                {" — "}
                <span className="text-violet-900">{stageBannerLabel(ageMonths)}</span>
              </p>
            </section>

            <section
              className="overflow-hidden rounded-3xl border border-violet-200/60 bg-gradient-to-b from-violet-50/90 to-[#f5f0e8] shadow-md"
              aria-label="Primary guidance"
            >
              <div className="px-5 pt-6 pb-2 text-center">
                <span className="text-4xl" aria-hidden>
                  🍼
                </span>
                <h2 className="mt-2 text-xl font-semibold text-violet-950">
                  Breastfeeding focus
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-800">
                  {g.primary_message}
                </p>
              </div>
              <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-violet-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80">
                    Frequency
                  </p>
                  <p className="mt-1 text-sm leading-snug text-slate-800">
                    {g.frequency}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-violet-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80">
                    Volume / duration
                  </p>
                  <p className="mt-1 text-sm leading-snug text-slate-800">
                    {g.volume_or_duration}
                  </p>
                </div>
              </div>
              <div className="border-t border-violet-100/80 bg-white/50 px-5 py-4">
                <h3 className="text-sm font-semibold text-violet-900">
                  What&apos;s normal right now
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-800">
                  {g.what_is_normal.slice(0, 4).map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden>✨</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {showReadiness && readinessResult && (
              <section
                className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm"
                aria-label="Solids readiness"
              >
                <h3 className="text-sm font-semibold text-amber-950">
                  Starting solids — readiness
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Tap each sign when you&apos;ve seen it — this is a gentle checklist, not a
                  test.
                </p>
                <ul className="mt-3 space-y-2">
                  {readinessResult.checklist.map((item, idx) => {
                    const keys: (keyof ReadinessAnswers)[] = [
                      "sitsWithSupport",
                      "showsInterest",
                      "lostTongueThrust",
                    ];
                    const met = readinessAnswers[keys[idx]];
                    return (
                      <li key={item.sign}>
                        <button
                          type="button"
                          onClick={() => toggleReadiness(keys[idx])}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                            met === true
                              ? "border-violet-400 bg-violet-50 text-violet-950"
                              : met === false
                                ? "border-slate-200 bg-white text-slate-500"
                                : "border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <span className="text-lg">
                            {met === true ? "✅" : met === false ? "○" : "☐"}
                          </span>
                          <span>{item.sign}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div
                  className={`mt-4 rounded-xl px-3 py-2 text-sm font-medium ${
                    readinessResult.ready
                      ? "bg-violet-100 text-violet-950"
                      : "bg-amber-100/80 text-amber-950"
                  }`}
                >
                  {readinessResult.ready
                    ? "Ready to start!"
                    : `Almost there — ${readinessResult.message}`}
                </div>
              </section>
            )}

            <section aria-label="Hunger and fullness cues">
              <h3 className="text-center text-lg font-semibold text-violet-950">
                Learning {child.name}&apos;s cues
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-violet-100 bg-white/90 p-3 shadow-sm">
                  <p className="text-center text-xs font-semibold uppercase text-violet-800">
                    Hunger cues
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.hunger_cues.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-950 ring-1 ring-violet-100"
                      >
                        <span>{cueIcon("hunger", i)}</span>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-white/90 p-3 shadow-sm">
                  <p className="text-center text-xs font-semibold uppercase text-violet-800">
                    Fullness cues
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.fullness_cues.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-200/80"
                      >
                        <span>{cueIcon("full", i)}</span>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section
              className="rounded-2xl border border-violet-200/60 bg-white p-4 shadow-sm"
              aria-label="Current feeding stage"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                Current stage
              </p>
              <h3 className="mt-1 text-lg font-semibold text-violet-950">{stage.stage}</h3>
              <p className="text-sm text-violet-800/90">{stage.age_range}</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{stage.texture}</p>
              <p className="mt-1 text-sm text-slate-600">{stage.description}</p>
              <p className="mt-3 text-xs font-semibold text-slate-600">Example foods</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {stage.example_foods.map((food, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-950 ring-1 ring-violet-100"
                  >
                    <span>{foodEmoji(food)}</span>
                    {food}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold text-red-800/90">Foods to avoid</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {stage.foods_to_avoid.map((food, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-900 ring-1 ring-red-100"
                  >
                    <span aria-hidden>⛔</span>
                    {food}
                  </span>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-violet-50/80 px-3 py-2 text-sm text-violet-950 ring-1 ring-violet-100">
                <span className="font-semibold">Self-feeding: </span>
                {stage.self_feeding_notes}
              </p>
            </section>

            <section
              className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-sm"
              aria-label="Watch for"
            >
              <h3 className="text-sm font-semibold text-amber-950">
                Worth mentioning at your next visit
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                These aren&apos;t emergencies — just flags to chat with your care team if
                they apply.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {g.watch_for.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-600" aria-hidden>
                      ◆
                    </span>
                    {w}
                  </li>
                ))}
              </ul>
            </section>

            {g.health_canada_note && (
              <section
                className="rounded-2xl border border-violet-300/50 bg-gradient-to-r from-violet-50 to-sky-50/50 p-4 shadow-sm"
                aria-label="Health Canada tip"
              >
                <p className="text-sm font-medium text-violet-950">{g.health_canada_note}</p>
                <p className="mt-2 text-xs text-violet-800/80">
                  Source: Health Canada — nutrition guidance for infants and young children
                  (see current Canada.ca resources).
                </p>
              </section>
            )}
          </div>
        )}

        {tab === "allergens" && (
          <div className="space-y-4 pb-8">
            <div>
              <h2 className="text-xl font-semibold text-violet-950">
                Introduce all 9 allergens by 12 months
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Early introduction reduces allergy risk — this is the current Health Canada
                guidance
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLeapOpen(!leapOpen)}
              className="flex w-full items-center justify-between rounded-2xl border border-violet-200 bg-white px-4 py-3 text-left shadow-sm"
            >
              <span className="text-sm font-medium text-violet-950">
                Why did this change? (LEAP study)
              </span>
              <span className="text-violet-700">{leapOpen ? "▲" : "▼"}</span>
            </button>
            {leapOpen && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-sm leading-relaxed text-slate-800">
                <p>
                  The Learning Early About Peanut (LEAP) trial and follow-up studies showed
                  that introducing peanut early in high-risk infants—under medical guidance—
                  lowered peanut allergy rates compared with avoidance. Canadian guidance
                  now favours introducing common allergens in the first year when baby is
                  eating solids, rather than waiting.
                </p>
                <p className="mt-2">
                  This shifted around 2015–2019 and many families still hear older advice
                  to wait—your care team can personalize if your baby has eczema or other
                  food allergies.
                </p>
              </div>
            )}

            {reactionsNoted.length > 0 && (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 shadow-sm"
                role="alert"
              >
                <p className="font-semibold">Possible reaction noted</p>
                <p className="mt-2">
                  You noted a possible reaction to{" "}
                  <strong>
                    {reactionsNoted.map((r) => r.allergen).join(", ")}
                  </strong>{" "}
                  — discuss with your pediatrician before offering this food again.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {protocols.map((p) => {
                const row = allergenRows.find((r) => r.allergen === p.allergen);
                const st = guidance.allergen_status.find((s) => s.allergen === p.allergen);
                const expanded = expandedAllergen === p.allergen;
                const busy = allergenBusy === p.allergen;

                return (
                  <div
                    key={p.allergen}
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAllergen(expanded ? null : p.allergen)
                      }
                      className="text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-2xl">{p.emoji}</span>
                          <p className="mt-1 font-semibold text-slate-900">
                            {p.display_name}
                          </p>
                        </div>
                      </div>
                      </button>
                  {st && (
                    <div className="mt-2">{statusBadge(st.status)}</div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Recommended {p.recommended_age_months}+ mo
                  </p>
                  {expanded && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-700">
                      <p>
                        <strong className="text-slate-900">Why early?</strong> {p.why_early}
                      </p>
                      <p>
                        <strong className="text-slate-900">How to introduce:</strong>{" "}
                        {p.how_to_introduce}
                      </p>
                      <p>
                        <strong className="text-slate-900">Watch for:</strong>{" "}
                        {p.what_to_watch}
                      </p>
                      {p.leap_study_note && (
                        <p className="rounded-lg bg-amber-50/80 p-2 text-amber-950">
                          <strong>LEAP / note:</strong> {p.leap_study_note}
                        </p>
                      )}
                      <p className="text-slate-600">
                        Reactions: {p.reaction_signs.join(", ")}.
                      </p>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !!row?.introduced_at}
                      onClick={() => void markAllergenIntroduced(p.allergen)}
                      className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {row?.introduced_at ? "Marked ✓" : "Mark introduced"}
                    </button>
                    {row?.introduced_at && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => row && void toggleReactionNoted(row)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                          row.reaction_noted
                            ? "bg-amber-200 text-amber-950"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Reaction {row.reaction_noted ? "✓" : "?"}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "log" && (
          <div className="space-y-5 pb-8">
            <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-center text-sm text-amber-950 ring-1 ring-amber-100">
              📝 Food log is optional — it&apos;s a tool for you, not a requirement.
            </p>

            <section className="rounded-2xl border border-violet-200/60 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-violet-950">Today</h3>
              {logsLoading ? (
                <Spinner className="mt-2 h-6 w-6 animate-spin text-violet-600" />
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-violet-50/80 px-3 py-2">
                    <p className="text-xs text-violet-800">Feeds logged</p>
                    <p className="text-lg font-semibold text-violet-950">
                      {todaySummary.total_feeds}
                    </p>
                  </div>
                  <div className="rounded-xl bg-violet-50/80 px-3 py-2">
                    <p className="text-xs text-violet-800">Last feed</p>
                    <p className="text-lg font-semibold text-violet-950">
                      {todaySummary.last_feed
                        ? formatTime(todaySummary.last_feed)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-600">Breast sessions</p>
                    <p className="font-semibold">{todaySummary.breast_sessions}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-600">Formula (ml)</p>
                    <p className="font-semibold">
                      {todaySummary.formula_ml > 0 ? todaySummary.formula_ml : "—"}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-600">Solid meals (today)</p>
                    <p className="font-semibold">{todaySummary.solid_meals}</p>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-violet-950">Quick log</h3>
              <p className="mb-2 text-xs text-slate-500">
                Tap to log now · hold for duration / volume
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["breast_left", "Breast L", "🤱"],
                    ["breast_right", "Breast R", "🤱"],
                    ["formula", "Formula", "🍼"],
                    ["solids", "Solids", "🥣"],
                    ["pumped", "Pumped", "💧"],
                  ] as const
                ).map(([type, label, emoji]) => (
                  <button
                    key={type}
                    type="button"
                    onPointerDown={() => onQuickLogDown(type, label)}
                    onPointerUp={() => onQuickLogUp()}
                    onPointerLeave={() => clearQuickPress()}
                    onPointerCancel={() => clearQuickPress()}
                    className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white px-3 py-4 text-center shadow-sm active:scale-[0.98]"
                  >
                    <span className="text-2xl">{emoji}</span>
                    <p className="mt-1 text-sm font-medium text-violet-950">{label}</p>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-violet-950">Last 7 days</h3>
              {logsLoading ? (
                <Spinner className="h-6 w-6 animate-spin text-violet-600" />
              ) : logsByDay.length === 0 ? (
                <p className="text-sm text-slate-500">No logs yet.</p>
              ) : (
                <div className="space-y-4">
                  {logsByDay.map(([dayKey, dayLogs]) => (
                    <div key={dayKey}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatDayHeading(dayKey)}
                      </p>
                      <ul className="space-y-2">
                        {dayLogs.map((log) => (
                          <SwipeLogRow
                            key={log.id}
                            log={log}
                            onDelete={() => void deleteLog(log.id)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#f8fafc] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-violet-950">
              Details — {detailModal.label}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Optional — leave blank to log without extras
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">Duration (minutes)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={detailDuration}
                  onChange={(e) => setDetailDuration(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Volume (ml)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={detailVolume}
                  onChange={(e) => setDetailVolume(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDetailModal()}
                className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-medium text-white"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeLogRow({
  log,
  onDelete,
}: {
  log: FeedingLogRow;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -88));
  };
  const onTouchEnd = () => {
    if (offset < -48) setOffset(-88);
    else setOffset(0);
    startX.current = null;
  };

  return (
    <li className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500"
        aria-hidden
      >
        <button
          type="button"
          onClick={onDelete}
          className="text-xs font-semibold text-white"
        >
          Delete
        </button>
      </div>
      <div
        className="relative flex items-center justify-between gap-2 bg-white px-3 py-2.5 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div>
          <p className="text-sm font-medium text-slate-900">
            {feedingTypeLabel(log.feeding_type)} 🍽️
          </p>
          <p className="text-xs text-slate-500">{formatTime(log.logged_at)}</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          {log.duration_minutes != null && <p>{log.duration_minutes} min</p>}
          {log.volume_ml != null && <p>{log.volume_ml} ml</p>}
        </div>
      </div>
    </li>
  );
}
