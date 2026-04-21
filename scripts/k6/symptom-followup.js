/**
 * Task 37 — k6 load script for POST /api/symptom-followup (pre-launch).
 *
 * Usage (k6 must be installed: https://k6.io/docs/get-started/installation/):
 *   k6 run scripts/k6/symptom-followup.js
 *
 * Env:
 *   K6_BASE_URL      — default http://127.0.0.1:3000
 *   K6_BEARER_TOKEN  — required: Supabase JWT for a test user
 *   K6_CHILD_ID      — required: UUID of a child owned by that user
 *   K6_VUS           — default 5
 *   K6_DURATION      — default 30s
 */
import http from "k6/http";
import { check, sleep } from "k6";

const base = __ENV.K6_BASE_URL || "http://127.0.0.1:3000";
const token = __ENV.K6_BEARER_TOKEN || "";
const childId = __ENV.K6_CHILD_ID || "";

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<15000"],
  },
};

export default function () {
  if (!token || !childId) {
    console.error("Set K6_BEARER_TOKEN and K6_CHILD_ID");
    return;
  }
  const res = http.post(
    `${base.replace(/\/$/, "")}/api/symptom-followup`,
    JSON.stringify({
      childId,
      symptomText: "k6 load test — mild cough",
      disclaimerAccepted: true,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: "60s",
    }
  );
  check(res, {
    "2xx or 4xx/429 (rate limit)": (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 429 || r.status === 400,
  });
  sleep(1);
}
