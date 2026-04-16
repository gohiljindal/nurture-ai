import { supabase } from "./supabase";

function getApiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:3000";
  return base.replace(/\/$/, "");
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fullPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${getApiBaseUrl()}${fullPath}`, {
    ...init,
    headers,
  });
}
