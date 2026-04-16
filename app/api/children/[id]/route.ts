import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { deleteChildForUser, updateChildPhotoForUser } from "@/lib/services/child-service";
import { formatZodError, updateChildPhotoBodySchema } from "@/lib/validation/api-schemas";

/**
 * DELETE — remove a child profile owned by the authenticated user.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await deleteChildForUser(userId, id);

  if (!result.ok) {
    const status = result.error === "Child not found." ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}

/**
 * PATCH — update child photo for a profile owned by authenticated user.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = updateChildPhotoBodySchema.safeParse(raw);
  if (!parsed.success) {
    const { message, fields } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, fields }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateChildPhotoForUser(userId, id, parsed.data.photo_url ?? null);

  if (!result.ok) {
    const status = result.error === "Child not found." ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
