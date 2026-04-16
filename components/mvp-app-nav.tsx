"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, LayoutDashboard, Stethoscope, UserPlus } from "lucide-react";
import { Logo } from "@/components/logo";
import { showMvpNav } from "@/lib/mvp-nav-routes";
import { cn } from "@/lib/utils";

const ITEMS: {
  href: string;
  label: string;
  shortLabel: string;
  match: (p: string) => boolean;
  Icon: typeof LayoutDashboard;
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    match: (p) => p === "/dashboard",
    Icon: LayoutDashboard,
  },
  {
    href: "/history",
    label: "History",
    shortLabel: "History",
    match: (p) => p === "/history" || p.startsWith("/check/"),
    Icon: History,
  },
  {
    href: "/check-symptom",
    label: "Symptom check",
    shortLabel: "Check",
    match: (p) => p === "/check-symptom",
    Icon: Stethoscope,
  },
  {
    href: "/add-child",
    label: "Add child",
    shortLabel: "Add",
    match: (p) => p === "/add-child",
    Icon: UserPlus,
  },
];

function navLinkClass(active: boolean) {
  return cn(
    "rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
    active
      ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-[0_6px_20px_rgba(91,33,182,0.25)] ring-1 ring-violet-500/25"
      : "text-slate-600 hover:bg-slate-100"
  );
}

function bottomTabClass(active: boolean) {
  return cn(
    "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-center transition active:scale-[0.98]",
    active
      ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(91,33,182,0.28)]"
      : "text-slate-600 hover:bg-slate-100"
  );
}

/**
 * Desktop: horizontal nav. Mobile: compact header + fixed bottom tab bar (app-style).
 */
export default function MvpAppNav() {
  const pathname = usePathname();

  if (!showMvpNav(pathname)) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-2.5">
          {/* Brand column — does not flex with nav; divider keeps it visually separate */}
          <Link
            href="/dashboard"
            className="shrink-0 rounded-xl py-1 pr-4 hover:bg-violet-50/90 sm:pr-5 md:border-r md:border-slate-200/80 md:px-1 md:pr-6"
          >
            <Logo size={32} showWordmark className="min-w-0 gap-2 sm:gap-3" />
          </Link>

          {/* Mobile: push Home away from logo */}
          <div className="min-w-0 flex-1 md:hidden" aria-hidden />

          {/* Desktop: nav cluster aligned to the right of the bar, away from logo */}
          <nav
            className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 md:flex md:pl-6"
            aria-label="App"
          >
            {ITEMS.map(({ href, label, match }) => {
              const active = match(pathname);
              return (
                <Link key={href} href={href} className={navLinkClass(active)}>
                  {label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="rounded-2xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              title="Marketing site"
            >
              Home
            </Link>
          </nav>

          <div className="shrink-0 border-l border-slate-200/80 pl-3 md:hidden">
            <Link
              href="/"
              className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-3 text-slate-600 shadow-sm hover:bg-slate-50"
              title="Marketing site"
            >
              <Home className="size-5" aria-hidden />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="App tabs"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1 pt-1">
          {ITEMS.map(({ href, shortLabel, match, Icon }) => {
            const active = match(pathname);
            return (
              <Link key={href} href={href} className={bottomTabClass(active)}>
                <Icon
                  className={cn("size-5 shrink-0", active ? "text-white" : "text-slate-500")}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                  {shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
