import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { getAuthUserFromRequest } from "@/lib/supabase/for-request";
import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

/**
 * POST — family invite / magic link (task 34).
 * GET  — list pending invites created by authenticated user.
 */
export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  let body: { childId?: string; inviteeEmail?: string; role?: string };
  try {
    body = (await request.json()) as { childId?: string; inviteeEmail?: string; role?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const childId = String(body.childId ?? "").trim();
  const inviteeEmail = String(body.inviteeEmail ?? "").trim().toLowerCase();
  const role = String(body.role ?? "caregiver").trim() || "caregiver";
  if (!childId || !inviteeEmail || !inviteeEmail.includes("@")) {
    return NextResponse.json(
      { error: "childId and inviteeEmail are required." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!child) {
    return NextResponse.json(
      { error: "Child not found." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
  const invite = await prisma.$queryRaw<
    Array<{ id: string; token: string; expires_at: Date }>
  >`
    insert into family_invites (inviter_user_id, child_id, invitee_email, token, role, status, expires_at)
    values (${user.id}::uuid, ${child.id}::uuid, ${inviteeEmail}, ${token}, ${role}, 'pending', ${expiresAt})
    returning id::text, token::text, expires_at
  `;

  const origin = new URL(request.url).origin;
  const inviteUrl = `${origin}/api/family/invite/accept?token=${invite[0].token}`;
  return NextResponse.json(
    {
      invite: {
        id: invite[0].id,
        child_id: child.id,
        child_name: child.name,
        invitee_email: inviteeEmail,
        role,
        token: invite[0].token,
        invite_url: inviteUrl,
        expires_at: invite[0].expires_at.toISOString(),
      },
    },
    { status: 201, headers: correlationHeaders(requestId) }
  );
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      child_id: string;
      child_name: string;
      invitee_email: string;
      role: string;
      status: string;
      expires_at: Date;
      created_at: Date;
    }>
  >`
    select fi.id::text, fi.child_id::text, c.name as child_name, fi.invitee_email, fi.role, fi.status, fi.expires_at, fi.created_at
    from family_invites fi
    join children c on c.id = fi.child_id
    where fi.inviter_user_id = ${user.id}::uuid
    order by fi.created_at desc
    limit 100
  `;

  return NextResponse.json(
    {
      invites: rows.map((r) => ({
        id: r.id,
        child_id: r.child_id,
        child_name: r.child_name,
        invitee_email: r.invitee_email,
        role: r.role,
        status: r.status,
        expires_at: r.expires_at.toISOString(),
        created_at: r.created_at.toISOString(),
      })),
    },
    { headers: correlationHeaders(requestId) }
  );
}
