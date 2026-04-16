import { NextResponse } from "next/server";

import { getAuthUserFromRequest } from "@/lib/supabase/for-request";
import { upsertSymptomCheckFeedbackForUser } from "@/lib/services/symptom-check-service";
import { formatZodError, symptomFeedbackBodySchema } from "@/lib/validation/api-schemas";

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = symptomFeedbackBodySchema.safeParse(raw);
  if (!parsed.success) {
    const { message, fields } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, fields }, { status: 400 });
  }

  const { checkId, helpful } = parsed.data;

  const result = await upsertSymptomCheckFeedbackForUser(user.id, checkId, helpful);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true });
}
