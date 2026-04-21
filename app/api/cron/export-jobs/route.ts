import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { processExportJob } from "@/lib/services/export-job-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500, headers: correlationHeaders(requestId) }
    );
  }

  const headerSecret =
    request.headers.get("x-cron-secret")?.trim() ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    "";
  if (headerSecret !== secret) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  const pending = await prisma.exportJob.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true, userId: true },
  });

  let processed = 0;
  for (const j of pending) {
    await processExportJob(j.id, j.userId);
    processed += 1;
  }

  return NextResponse.json(
    { ok: true, processed },
    { headers: correlationHeaders(requestId) }
  );
}
