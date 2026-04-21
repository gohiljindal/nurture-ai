import { useQuery } from "@tanstack/react-query";
import { getMilestones } from "@/lib/api";

export function useMilestones(childId: string) {
  return useQuery({
    queryKey: ["milestones", childId],
    queryFn: async () => {
      const res = await getMilestones(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 10, // milestones rarely change — cache 10 min
  });
}
