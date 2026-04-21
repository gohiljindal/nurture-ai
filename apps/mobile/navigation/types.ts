import type { Child, SymptomTriageResult } from "../lib/types";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  AddChild: undefined;
  ChildDetail: { child: Child };
  Milestones: { childId: string; childName: string };
  Vaccines: { childId: string; childName: string };
};

export type CheckStackParamList = {
  SymptomInput: { childId?: string } | undefined;
  Followup: { childId: string; symptomText: string; questions: string[] };
  Result: { checkId: string; triage: SymptomTriageResult };
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  HistoryDetail: { checkId: string };
};
