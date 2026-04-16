import { randomUUID } from "node:crypto";

const HEADER_IN = "x-request-id";
const HEADER_OUT = "x-request-id";

/** Read or create a correlation id for logs (Task 8). */
export function getOrCreateRequestId(request: Request): string {
  const fromClient = request.headers.get(HEADER_IN)?.trim();
  if (fromClient && fromClient.length <= 128) return fromClient;
  return randomUUID();
}

export function correlationHeaders(requestId: string): Record<string, string> {
  return { [HEADER_OUT]: requestId };
}
