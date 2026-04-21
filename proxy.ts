import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { buildHealthPayload, buildMetaPayload } from "@/lib/status-contract";

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

/**
 * Reflect `Origin` for browser cross-origin API calls (Expo web → Next API).
 * Allows any http(s) localhost / 127.0.0.1 port (Metro picks 8081, 8083, 8084, …).
 * Optional `CORS_ALLOWED_ORIGINS` (comma-separated) for tunnel / staging hosts.
 */
function getCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const extra =
    process.env.CORS_ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (extra.includes(origin)) return origin;

  try {
    const u = new URL(origin);
    if (
      (u.protocol === "http:" || u.protocol === "https:") &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    ) {
      return origin;
    }
  } catch {
    return null;
  }
  return null;
}

/** Runs on every matched request: refreshes Supabase session and adds CORS headers for Expo web dev. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const corsOrigin = getCorsOrigin(request);

  // Handle CORS preflight for API routes
  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (corsOrigin) {
      res.headers.set("Access-Control-Allow-Origin", corsOrigin);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }

  // Liveness + version — skip Supabase session work (fast probes for load balancers / mobile).
  if (request.method === "GET" && pathname === "/api/health") {
    const res = NextResponse.json(buildHealthPayload());
    if (corsOrigin) {
      res.headers.set("Access-Control-Allow-Origin", corsOrigin);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }
  if (request.method === "GET" && pathname === "/api/meta") {
    const res = NextResponse.json(buildMetaPayload());
    if (corsOrigin) {
      res.headers.set("Access-Control-Allow-Origin", corsOrigin);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }

  // Normal request — refresh Supabase session then add CORS headers
  const response = await updateSession(request);

  if (pathname.startsWith("/api/") && corsOrigin) {
    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  }

  return response;
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
