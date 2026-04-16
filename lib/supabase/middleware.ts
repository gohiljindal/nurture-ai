import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "./env";

/**
 * Task 4 — Auth middleware: refresh Supabase session cookies and gate protected routes.
 * Paths that require a logged-in user — add new private pages here.
 */
function isProtectedPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/add-child") return true;
  if (pathname === "/check-symptom") return true;
  if (pathname === "/history") return true;
  if (pathname.startsWith("/check/")) return true;
  if (pathname.startsWith("/child/")) return true;
  if (pathname.startsWith("/feeding/")) return true;
  if (pathname.startsWith("/growth/")) return true;
  if (pathname.startsWith("/sleep/")) return true;
  if (pathname.startsWith("/vaccines/")) return true;
  if (pathname.startsWith("/milestones/")) return true;
  return false;
}

function isAuthPage(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

/**
 * Refreshes the Supabase session (cookies) and redirects unauthenticated users
 * away from protected pages.
 */
export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API routes: refresh session cookies only; do not HTML-redirect
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
