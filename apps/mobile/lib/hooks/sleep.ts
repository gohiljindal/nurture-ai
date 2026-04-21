import { useQuery } from "@tanstack/react-query";

import { getSleepGuidance } from "@/lib/api";

export const sleepKey = (childId: string) => ["sleep", childId] as const;

export function useSleepGuidance(childId: string) {
  return useQuery({
    queryKey: sleepKey(childId),
    queryFn: async () => {
      const res = await getSleepGuidance(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 10,
  });
}
