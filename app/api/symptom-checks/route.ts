import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { apiJsonError } from "@/lib/api-errors";
import { symptomHistoryRateLimit } from "@/lib/ratelimit";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { listSymptomChecksForHistory } from "@/lib/services/symptom-check-service";
import { getSymptomRateLimitKey } from "@/lib/symptom-rate-limit-key";

/**
 * GET — list symptom checks history for the authenticated user.
 * Auth comes from Supabase session (cookie or Bearer). Data comes from Prisma.
 */
export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const headers = correlationHeaders(requestId);

  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return apiJsonError(
      401,
      { error: "Unauthorized.", code: "unauthorized" },
      headers
    );
  }

  const rateKey = await getSymptomRateLimitKey(userId);
  const { success, limit, remaining, reset } = await symptomHistoryRateLimit.limit(
    `history:${rateKey}`
  );
  if (!success) {
    return apiJsonError(
      429,
      {
        error: "Too many requests. Please wait a moment.",
        code: "rate_limited",
        limit,
        remaining,
        reset,
      },
      headers
    );
  }

  const { rows, error } = await listSymptomChecksForHistory(userId, 50);
  if (error) {
    return apiJsonError(
      503,
      { error, code: "service_unavailable" },
      headers
    );
  }

  return NextResponse.json({ checks: rows }, { headers });
}
