"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function childIdFromPath(pathname: string): string | null {
  const childMatch = pathname.match(/^\/child\/([^/]+)/);
  if (childMatch) return childMatch[1];
  const featureMatch = pathname.match(
    /^\/(milestones|growth|vaccines|feeding|sleep)\/([^/]+)/
  );
  if (featureMatch) return featureMatch[2];
  return null;
}

const LINKS: { href: (id: string) => string; label: string }[] = [
  { href: (id) => `/milestones/${id}`, label: "Milestones" },
  { href: (id) => `/growth/${id}`, label: "Growth" },
  { href: (id) => `/vaccines/${id}`, label: "Vaccines" },
  { href: (id) => `/feeding/${id}`, label: "Feeding" },
  { href: (id) => `/sleep/${id}`, label: "Sleep" },
];

export function CoreFeatureNav() {
  const pathname = usePathname();
  const childId = childIdFromPath(pathname);

  if (!childId) {
    return null;
  }

  return (
    <nav
      className="border-b border-slate-200/80 bg-gradient-to-r from-violet-50/50 via-[#f8fafc] to-sky-50/50 backdrop-blur-sm"
      aria-label="Child tracking"
    >
      <div className="mx-auto flex max-w-5xl flex-nowrap items-center justify-start gap-1.5 overflow-x-auto overscroll-x-contain px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-start sm:gap-2 [&::-webkit-scrollbar]:hidden">
        {LINKS.map(({ href, label }) => {
          const to = href(childId);
          const active = pathname === to;
          return (
            <Link
              key={label}
              href={to}
              className={`shrink-0 rounded-2xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
                active
                  ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-[0_6px_18px_rgba(91,33,182,0.22)] ring-1 ring-violet-500/25"
                  : "text-slate-700 hover:bg-white/90"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
