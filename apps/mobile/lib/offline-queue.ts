import * as Network from "expo-network";

import { syncAppUser } from "@/lib/api";

const queue: Array<() => Promise<void>> = [];

/**
 * Run when back online — non-critical retries (task 17).
 * Today: best-effort `syncAppUser` after connectivity loss.
 */
export function enqueueWhenOnline(task: () => Promise<void>): void {
  queue.push(task);
}

export async function flushOfflineQueue(): Promise<void> {
  const s = await Network.getNetworkStateAsync();
  if (!s.isConnected) return;
  while (queue.length > 0) {
    const fn = queue.shift();
    if (fn) {
      try {
        await fn();
      } catch {
        /* ignore */
      }
    }
  }
}

/** Call when network becomes available (e.g. from listener). */
export async function recoverAfterReconnect(): Promise<void> {
  await syncAppUser().catch(() => {});
  await flushOfflineQueue();
}
