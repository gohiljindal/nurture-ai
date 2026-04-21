import { useQuery } from "@tanstack/react-query";

import { getFeedingGuidance } from "@/lib/api";

export const feedingKey = (childId: string) => ["feeding", childId] as const;

export function useFeedingGuidance(childId: string) {
  return useQuery({
    queryKey: feedingKey(childId),
    queryFn: async () => {
      const res = await getFeedingGuidance(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 10,
  });
}
