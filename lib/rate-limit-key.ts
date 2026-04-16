import { headers } from "next/headers";

export async function getRateLimitIdentifier(fallback = "anonymous") {
  const h = await headers();

  const forwardedFor = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return fallback;
}
