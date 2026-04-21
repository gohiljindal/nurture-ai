import { useQuery } from "@tanstack/react-query";
import { getVaccines } from "@/lib/api";

export function useVaccines(childId: string) {
  return useQuery({
    queryKey: ["vaccines", childId],
    queryFn: async () => {
      const res = await getVaccines(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 10,
  });
}
