"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { FeedingGuidance, FeedingStage } from "@/lib/feeding-engine";

export type FeedingSummaryWidgetProps = {
  childId: string;
  childName: string;
};

type AllergenStatusRow = {
  allergen: string;
  status: "introduced" | "overdue" | "upcoming" | "too_early";
  recommended_at_months: number;
};

type GuidancePayload = {
  child: { id: string; name: string; age_months: number };
  guidance: FeedingGuidance;
  allergen_status: AllergenStatusRow[];
  current_stage: FeedingStage;
};

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WidgetSkeleton() {
  return (
    <div
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      aria-hidden
    >
      <div className="flex gap-3">
        <div className="size-12 shrink-0 rounded-2xl bg-stone-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-stone-200" />
          <div className="h-4 w-36 rounded bg-stone-200" />
          <div className="h-3 w-full max-w-[200px] rounded bg-stone-200" />
        </div>
      </div>
      <div className="mt-4 h-10 rounded-xl bg-stone-100" />
      <div className="mt-3 h-3 w-44 rounded bg-stone-200" />
    </div>
  );
}

function firstTipOrNormal(g: FeedingGuidance): string {
  if (g.tips.length > 0) return g.tips[0];
  if (g.what_is_normal.length > 0) return g.what_is_normal[0];
  return g.primary_message;
}

function pickyEatingTip(g: FeedingGuidance): string {
  const fromTips = g.tips.find(
    (t) =>
      /picky|neophobia|refus|messy|division of responsibility|exposure/i.test(t)
  );
  if (fromTips) return fromTips;
  return g.tips[0] ?? g.what_is_normal[0] ?? g.primary_message;
}

function shortFrequency(g: FeedingGuidance): string {
  const f = g.frequency.trim();
  if (f.length <= 120) return f;
  const cut = f.slice(0, 117).trim();
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 40 ? cut.slice(0, lastSpace) : cut}…`;
}

function stageShortLabel(stage: FeedingStage): string {
  const s = stage.stage.replace(/^Stage \d+ — /, "").trim();
  return s.length > 48 ? `${s.slice(0, 45)}…` : s;
}

export function FeedingSummaryWidget({ childId, childName }: FeedingSummaryWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<GuidancePayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/feeding/guidance/${childId}`);
        if (!res.ok) {
          if (!cancelled) {
            setPayload(null);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as GuidancePayload & { error?: string };
        if (!cancelled) {
          setPayload({
            child: json.child,
            guidance: json.guidance,
            allergen_status: Array.isArray(json.allergen_status)
              ? json.allergen_status
              : [],
            current_stage: json.current_stage,
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  const introducedCount = useMemo(() => {
    if (!payload) return 0;
    return payload.allergen_status.filter((a) => a.status === "introduced").length;
  }, [payload]);

  if (loading) {
    return <WidgetSkeleton />;
  }

  if (!payload) {
    return null;
  }

  const age = payload.child.age_months;
  const { guidance: g, current_stage } = payload;

  const emoji = age < 6 ? "🤱" : age < 12 ? "🥣" : "🍽️";

  let headline: string;
  let body: ReactNode;

  if (age < 6) {
    headline = "Breastfeeding & formula guidance";
    body = (
      <>
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-stone-700">
          <span className="font-medium text-stone-800">Frequency: </span>
          {shortFrequency(g)}
        </p>
        <p className="mt-2 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 text-sm text-violet-950">
          <span className="font-medium">Tip: </span>
          {firstTipOrNormal(g)}
        </p>
      </>
    );
  } else if (age < 12) {
    headline = "New foods & allergens";
    body = (
      <>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950">
            Starting solids
          </span>
          <span className="text-sm font-medium text-stone-800">
            Allergens {introducedCount}/9 introduced
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-700">
          <span className="font-medium text-stone-900">Stage: </span>
          {stageShortLabel(current_stage)}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-stone-600">{g.tips[0] ?? g.primary_message}</p>
      </>
    );
  } else {
    const complete = introducedCount >= 9;
    headline = stageShortLabel(current_stage);
    body = (
      <>
        <p className="mt-2 text-sm text-stone-700">
          <span className="font-medium text-stone-900">Allergens: </span>
          {complete
            ? "All 9 introduced"
            : `${introducedCount}/9 introduced — ${9 - introducedCount} left to try`}
        </p>
        {age >= 18 ? (
          <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            <span className="font-medium">Picky eating: </span>
            {pickyEatingTip(g)}
          </p>
        ) : (
          <p className="mt-2 line-clamp-2 text-sm text-stone-600">{g.tips[0] ?? g.primary_message}</p>
        )}
      </>
    );
  }

  return (
    <Link
      href={`/feeding/${childId}`}
      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md"
    >
      <div className="flex gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-sky-50 text-2xl shadow-inner"
          aria-hidden
        >
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Feeding</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-stone-900">{childName}</p>
          <p className="mt-1 text-sm font-medium leading-snug text-violet-900">{headline}</p>
        </div>
      </div>

      <div className="mt-3">{body}</div>

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-sm font-medium text-violet-800">
        <span>Tap for full guidance →</span>
        <ChevronRight className="size-5 shrink-0 text-violet-600" />
      </div>
    </Link>
  );
}
