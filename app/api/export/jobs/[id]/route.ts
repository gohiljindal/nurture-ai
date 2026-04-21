import { NextResponse } from "next/server";

import { getServerUserIdFromRequest } from "@/lib/auth/server-user";
import { prisma } from "@/lib/prisma";
import { correlationHeaders, getOrCreateRequestId } from "@/lib/request-correlation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET — export job status + storage URL when ready (task 35). */
export async function GET(request: Request, context: RouteContext) {
  const requestId = getOrCreateRequestId(request);
  const userId = await getServerUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: correlationHeaders(requestId) }
    );
  }

  const { id } = await context.params;
  const job = await prisma.exportJob.findFirst({
    where: { id, userId },
    select: {
      id: true,
      kind: true,
      status: true,
      storageUrl: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Job not found." },
      { status: 404, headers: correlationHeaders(requestId) }
    );
  }

  return NextResponse.json(
    {
      job: {
        id: job.id,
        kind: job.kind,
        status: job.status,
        storage_url: job.storageUrl,
        error_message: job.errorMessage,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
      },
    },
    { headers: correlationHeaders(requestId) }
  );
}
