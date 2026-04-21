import { useQuery } from "@tanstack/react-query";

import { getVisitPrep } from "@/lib/api";

export function useVisitPrep(childId: string | undefined) {
  return useQuery({
    queryKey: ["visit-prep", childId],
    queryFn: async () => {
      const res = await getVisitPrep(childId!);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 60,
  });
}
