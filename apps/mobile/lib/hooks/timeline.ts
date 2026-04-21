import { useQuery } from "@tanstack/react-query";

import { getTimeline } from "@/lib/api";

export function useTimeline(childId: string) {
  return useQuery({
    queryKey: ["timeline", childId],
    queryFn: async () => {
      const res = await getTimeline(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 5,
  });
}
