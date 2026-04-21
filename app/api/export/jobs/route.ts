import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";
import { processExportJob } from "@/lib/services/export-job-service";

export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set(["pdf_growth", "pdf_timeline"]);

/**
 * POST — enqueue PDF export (task 35). Starts processing immediately.
 */
export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  if (!isFeatureEnabled("export_jobs")) {
    return NextResponse.json(
      {
        error: "Export jobs are temporarily disabled.",
        code: "feature_disabled",
      },
      { status: 503, headers: correlationHeaders(requestId) }
    );
  }

  let body: { kind?: string };
  try {
    body = (await request.json()) as { kind?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { error: "Invalid kind.", code: "validation_failed" },
      { status: 400, headers: correlationHeaders(requestId) }
    );
  }

  const job = await prisma.exportJob.create({
    data: {
      userId,
      kind,
      status: "pending",
    },
    select: { id: true, status: true, createdAt: true },
  });

  // Best effort immediate processing; cron endpoint can retry pending jobs.
  await processExportJob(job.id, userId);

  return NextResponse.json(
    {
      job: {
        id: job.id,
        status: job.status,
        created_at: job.createdAt.toISOString(),
      },
    },
    { status: 202, headers: correlationHeaders(requestId) }
  );
}
