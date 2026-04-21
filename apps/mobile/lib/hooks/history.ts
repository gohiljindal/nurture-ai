import { useQuery } from "@tanstack/react-query";
import { getSymptomCheck, listSymptomHistory } from "@/lib/api";

export const HISTORY_KEY = ["history"] as const;

// ── List ──────────────────────────────────────────────────────────────────────

export function useHistory() {
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: async () => {
      const res = await listSymptomHistory();
      if (!res.ok) throw new Error(res.error);
      return res.data.checks;
    },
  });
}

// ── Single check detail ───────────────────────────────────────────────────────

export function useCheckDetail(checkId: string) {
  return useQuery({
    queryKey: ["check", checkId],
    queryFn: async () => {
      const res = await getSymptomCheck(checkId);
      if (!res.ok) throw new Error(res.error);
      return res.data.check;
    },
    enabled: !!checkId,
  });
}
