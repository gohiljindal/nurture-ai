import { NextResponse } from "next/server";

/**
 * Legacy single-shot endpoint — not used by the app UI.
 * Task 6: fail closed so old clients cannot hit an unauthenticated, weak path.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is disabled. Use the in-app symptom check (follow-up flow) from your dashboard.",
    },
    { status: 410 }
  );
}
