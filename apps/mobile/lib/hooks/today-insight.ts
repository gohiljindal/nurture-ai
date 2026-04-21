import { useQuery } from "@tanstack/react-query";

import { getTodayInsight } from "@/lib/api";

export function useTodayInsight(childId: string | undefined) {
  return useQuery({
    queryKey: ["today-insight", childId],
    queryFn: async () => {
      const res = await getTodayInsight(childId!);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 30,
  });
}
