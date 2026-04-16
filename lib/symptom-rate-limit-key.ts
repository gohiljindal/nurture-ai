import { getRateLimitIdentifier } from "@/lib/rate-limit-key";

/**
 * Prefer per-user + IP so authenticated traffic is bucketed fairly (Task 7).
 */
export async function getSymptomRateLimitKey(userId: string): Promise<string> {
  const ip = await getRateLimitIdentifier();
  return `symptom:${userId}:${ip}`;
}
