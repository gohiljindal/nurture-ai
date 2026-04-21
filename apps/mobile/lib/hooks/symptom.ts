import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startSymptomFollowup,
  submitSymptomFeedback,
  submitSymptomFinal,
} from "@/lib/api";
import type { FollowupAnswer } from "@/lib/types";
import { HISTORY_KEY } from "./history";

// ── Step 1: get follow-up questions (or immediate result) ─────────────────────

export function useStartFollowup() {
  return useMutation({
    mutationFn: async (params: {
      childId: string;
      symptomText: string;
      disclaimerAccepted: boolean;
    }) => {
      const res = await startSymptomFollowup(params);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

// ── Step 2: submit answers → final triage result ──────────────────────────────

export function useSubmitFinal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      childId: string;
      symptomText: string;
      followupAnswers: FollowupAnswer[];
      disclaimerAccepted: boolean;
    }) => {
      const res = await submitSymptomFinal(params);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    // New check saved — keep history list fresh
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export function useFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { checkId: string; helpful: boolean }) => {
      const res = await submitSymptomFeedback(params);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, { checkId }) => {
      // Invalidate the specific check so feedback state refreshes
      qc.invalidateQueries({ queryKey: ["check", checkId] });
    },
  });
}
