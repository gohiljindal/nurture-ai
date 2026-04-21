import { NextResponse } from "next/server";

/**
 * Standard JSON error body for all `/api/*` routes (ARCHITECTURE_MASTER task 8).
 * Clients may rely on `error` (string); `code` is stable for programmatic handling.
 */
export type ApiErrorBody = {
  error: string;
  code?: string;
  fields?: Record<string, string>;
  limit?: number;
  remaining?: number;
  reset?: number;
};

export function apiJsonError(
  status: number,
  body: ApiErrorBody,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(body, { status, headers });
}
