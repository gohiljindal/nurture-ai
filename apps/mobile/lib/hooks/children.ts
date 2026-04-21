import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChild,
  deleteChild,
  listChildren,
  updateChildPhoto,
  updateChildProvince,
} from "@/lib/api";
import type { CreateChildInput } from "@/lib/types";

export const CHILDREN_KEY = ["children"] as const;

// ── Query ─────────────────────────────────────────────────────────────────────

export function useChildren() {
  return useQuery({
    queryKey: CHILDREN_KEY,
    queryFn: async () => {
      const res = await listChildren();
      if (!res.ok) throw new Error(res.error);
      return res.data.children;
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChildInput) => {
      const res = await createChild(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_KEY }),
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (childId: string) => {
      const res = await deleteChild(childId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_KEY }),
  });
}

export function useUpdateChildPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      photoUrl,
    }: {
      childId: string;
      photoUrl: string | null;
    }) => {
      const res = await updateChildPhoto(childId, photoUrl);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHILDREN_KEY }),
  });
}

export function useUpdateChildProvince() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      province,
    }: {
      childId: string;
      province: string;
    }) => {
      const res = await updateChildProvince(childId, province);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: CHILDREN_KEY });
      qc.invalidateQueries({ queryKey: ["vaccines", vars.childId] });
    },
  });
}
