import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getChildChecks, updateChildChecks } from "@/lib/api";

const checksKey = (childId: string) => ["child-checks", childId] as const;

export function useChildChecks(childId: string) {
  return useQuery({
    queryKey: checksKey(childId),
    queryFn: async () => {
      const res = await getChildChecks(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
  });
}

export function useUpdateChildChecks(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      dental_due?: boolean;
      hearing_concern?: boolean;
      vision_concern?: boolean;
      notes?: string | null;
    }) => updateChildChecks(childId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: checksKey(childId) }),
  });
}
