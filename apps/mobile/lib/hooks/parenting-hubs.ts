import { useQuery } from "@tanstack/react-query";

import {
  getGradeReadiness,
  getIepAwareness,
  getPottyReadiness,
  getPreschoolSocial,
  getScreenTimeGuidance,
  getToddlerBehavior,
} from "@/lib/api";

function useHubQuery(
  childId: string,
  key: string,
  fn: (childId: string) => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>
) {
  return useQuery({
    queryKey: [key, childId],
    queryFn: async () => {
      const res = await fn(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!childId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useToddlerBehavior(childId: string) {
  return useHubQuery(childId, "toddler-behavior", getToddlerBehavior);
}

export function usePottyReadiness(childId: string) {
  return useHubQuery(childId, "potty-readiness", getPottyReadiness);
}

export function useScreenTimeGuidance(childId: string) {
  return useHubQuery(childId, "screen-time", getScreenTimeGuidance);
}

export function usePreschoolSocial(childId: string) {
  return useHubQuery(childId, "preschool-social", getPreschoolSocial);
}

export function useGradeReadiness(childId: string) {
  return useHubQuery(childId, "grade-readiness", getGradeReadiness);
}

export function useIepAwareness(childId: string) {
  return useHubQuery(childId, "iep-awareness", getIepAwareness);
}
