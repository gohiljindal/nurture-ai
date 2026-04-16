import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Task 4 — runs on every matched request so Supabase auth cookies stay fresh. */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image optimization.
     * Adjust if you add more root-level public files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
