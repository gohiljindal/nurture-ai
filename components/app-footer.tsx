"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { showMvpNav } from "@/lib/mvp-nav-routes";
import { cn } from "@/lib/utils";

export function AppFooter() {
  const pathname = usePathname();
  const mvp = showMvpNav(pathname);

  return (
    <footer
      className={cn(
        "border-t border-slate-200/80 bg-[#f8fafc] text-center text-sm text-slate-600",
        mvp
          ? "px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6"
          : "py-6"
      )}
    >
      <Link href="/feedback" className="nurture-text-link font-medium">
        Send feedback
      </Link>
      <span className="mx-2 text-slate-300">·</span>
      <Link href="/" className="nurture-text-link font-medium">
        Home
      </Link>
    </footer>
  );
}
