import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { getAuthUserFromRequest } from "@/lib/supabase/for-request";

type InviteRow = {
  id: string;
  child_id: string;
  invitee_email: string;
  role: string;
  status: string;
  expires_at: Date;
};

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json(
      { error: "Missing token." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const row = await prisma.$queryRaw<InviteRow[]>`
    select id::text, child_id::text, invitee_email, role, status, expires_at
    from family_invites
    where token = ${token}
    limit 1
  `;
  if (!row[0]) {
    return NextResponse.json(
      { error: "Invite not found." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }
  return NextResponse.json(
    {
      invite: {
        id: row[0].id,
        child_id: row[0].child_id,
        invitee_email: row[0].invitee_email,
        role: row[0].role,
        status: row[0].status,
        expires_at: row[0].expires_at.toISOString(),
      },
    },
    { headers: correlationHeaders(requestId) }
  );
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Missing token." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const row = await prisma.$queryRaw<InviteRow[]>`
    select id::text, child_id::text, invitee_email, role, status, expires_at
    from family_invites
    where token = ${token}
    limit 1
  `;
  if (!row[0]) {
    return NextResponse.json(
      { error: "Invite not found." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }
  const invite = row[0];
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "Invite is no longer pending." },
      { status: 409, headers: correlationHeaders(requestId) }
    );
  }
  if (invite.expires_at.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Invite has expired." },
      { status: 410, headers: correlationHeaders(requestId) }
    );
  }
  if ((user.email ?? "").toLowerCase() !== invite.invitee_email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite is for a different email." },
      { status: 403, headers: correlationHeaders(requestId) }
    );
  }

  await prisma.$executeRaw`
    insert into child_accesses (child_id, user_id, role)
    values (${invite.child_id}::uuid, ${user.id}::uuid, ${invite.role})
    on conflict (child_id, user_id)
    do update set role = excluded.role
  `;
  await prisma.$executeRaw`
    update family_invites
    set status = 'accepted', accepted_at = now()
    where id = ${invite.id}::uuid
  `;

  return NextResponse.json(
    { ok: true, child_id: invite.child_id, role: invite.role },
    { headers: correlationHeaders(requestId) }
  );
}
