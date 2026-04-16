"use client";

import { usePathname } from "next/navigation";
import { showMvpNav } from "@/lib/mvp-nav-routes";
import { cn } from "@/lib/utils";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const needsMobileNavPad = showMvpNav(pathname);

  return (
    <div
      className={cn(
        "flex-1",
        needsMobileNavPad &&
          "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0"
      )}
    >
      {children}
    </div>
  );
}
