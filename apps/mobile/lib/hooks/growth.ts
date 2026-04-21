import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addGrowthMeasurement,
  getGrowth,
} from "@/lib/api";

export const growthKey = (childId: string) => ["growth", childId] as const;

export function useGrowth(childId: string) {
  return useQuery({
    queryKey: growthKey(childId),
    queryFn: async () => {
      const res = await getGrowth(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
  });
}

export function useAddGrowthMeasurement(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Parameters<typeof addGrowthMeasurement>[1]
    ) => addGrowthMeasurement(childId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: growthKey(childId) }),
  });
}
