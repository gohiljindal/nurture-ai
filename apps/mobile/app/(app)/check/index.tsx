import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import { calculateAgeInMonths, formatAgeLabel } from "@/lib/child-age";
import { setCheckSession } from "@/lib/check-store";
import { logTriageEvent } from "@/lib/analytics";
import { useChildren, useStartFollowup } from "@/lib/hooks";
import { getLifeStageBucket } from "@/lib/stage-engine";
import {
  MAX_SYMPTOM_TEXT_CHARS,
  MIN_SYMPTOM_TEXT_CHARS,
} from "@/lib/symptom-input-limits";

// ── Constants ──────────────────────────────────────────────────────────────────

const MIN_LENGTH = MIN_SYMPTOM_TEXT_CHARS;
const MAX_LENGTH = MAX_SYMPTOM_TEXT_CHARS;

const DISCLAIMER =
  "I understand this app provides general guidance only and is not a substitute for professional medical advice. In an emergency, always call 911.";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SymptomInputScreen() {
  const { childId: paramChildId } = useLocalSearchParams<{
    childId?: string;
  }>();

  const { data: children, isLoading: loadingChildren } = useChildren();
  const { mutateAsync: startFollowup, isPending } = useStartFollowup();

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [symptomText, setSymptomText] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [error, setError] = useState("");

  // Auto-select child from param or if only one child exists
  useEffect(() => {
    if (!children?.length) return;
    if (paramChildId && children.some((c) => c.id === paramChildId)) {
      setSelectedChildId(paramChildId);
    } else if (children.length === 1 && !selectedChildId) {
      setSelectedChildId(children[0]!.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramChildId, children]);

  const trimmed = symptomText.trim();
  const canSubmit =
    !!selectedChildId && trimmed.length >= MIN_LENGTH && disclaimerAccepted;

  const handleSubmit = async () => {
    setError("");
    if (!selectedChildId) return;

    try {
      const childRow = children?.find((c) => c.id === selectedChildId);
      const stage = childRow
        ? getLifeStageBucket(calculateAgeInMonths(childRow.date_of_birth))
        : undefined;
      logTriageEvent("triage_started", { stage });

      const result = await startFollowup({
        childId: selectedChildId,
        symptomText: trimmed,
        disclaimerAccepted: true,
      });

      if (result.type === "immediate") {
        logTriageEvent("triage_completed", {
          stage,
          urgency: result.triage.urgency,
        });
        // Safety rule triggered — skip questions, go straight to result
        router.push({
          pathname: "/(app)/check/result/[checkId]",
          params: { checkId: result.checkId },
        });
      } else {
        // Store session then navigate to follow-up questions
        setCheckSession({
          childId: selectedChildId,
          symptomText: trimmed,
          questions: result.questions,
        });
        router.push("/(app)/check/followup");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pt-6 pb-14 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View className="gap-1">
            <Text className="text-2xl font-extrabold text-slate-900">
              Check symptoms
            </Text>
            <Text className="text-sm text-slate-500">
              Describe what you're seeing. We'll ask a few follow-up questions
              and give you clear guidance.
            </Text>
          </View>

          {/* ── Child picker ── */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-700">
              Who is this check for?
            </Text>

            {loadingChildren ? (
              <Text className="text-sm text-slate-400">Loading…</Text>
            ) : !children?.length ? (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 gap-3">
                <Text className="text-sm font-semibold text-amber-800">
                  No children added yet
                </Text>
                <Text className="text-xs text-amber-700">
                  Add a child profile first so we can tailor the guidance to
                  their age.
                </Text>
                <Pressable
                  onPress={() => router.push("/(app)/(home)/child/add")}
                  className="active:opacity-70"
                >
                  <Text className="text-sm font-bold text-brand-600">
                    + Add a child →
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pr-4"
              >
                {children.map((child) => {
                  const selected = selectedChildId === child.id;
                  const ageMonths = calculateAgeInMonths(child.date_of_birth);
                  const ageStr = formatAgeLabel(ageMonths);
                  const initial = child.name[0]?.toUpperCase() ?? "?";

                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => setSelectedChildId(child.id)}
                      className={`flex-row items-center gap-2.5 px-4 py-3 rounded-2xl border active:opacity-70 ${
                        selected
                          ? "bg-brand-500 border-brand-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Avatar circle */}
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center ${
                          selected ? "bg-brand-400" : "bg-brand-100"
                        }`}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            selected ? "text-white" : "text-brand-600"
                          }`}
                        >
                          {initial}
                        </Text>
                      </View>

                      {/* Name + age */}
                      <View>
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {child.name}
                        </Text>
                        <Text
                          className={`text-xs ${
                            selected ? "text-brand-100" : "text-slate-400"
                          }`}
                        >
                          {ageStr}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Symptom textarea ── */}
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-slate-700">
              What are you seeing?
            </Text>

            <View className="bg-white border border-slate-200 rounded-2xl px-4 pt-3 pb-2">
              <TextInput
                multiline
                value={symptomText}
                onChangeText={setSymptomText}
                placeholder={
                  "E.g. My 4-month-old has had a fever of 38.5°C for the past 6 hours, is fussier than usual, and isn't feeding as well as normal…"
                }
                placeholderTextColor="#94a3b8"
                maxLength={MAX_LENGTH}
                textAlignVertical="top"
                returnKeyType="default"
                blurOnSubmit={false}
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "#0f172a",
                  lineHeight: 22,
                  minHeight: 120,
                }}
              />

              {/* Character count */}
              <Text
                className={`text-xs text-right mt-2 ${
                  symptomText.length >= MAX_LENGTH
                    ? "text-red-500 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {symptomText.length} / {MAX_LENGTH}
              </Text>
            </View>

            {/* Minimum length hint */}
            {symptomText.length > 0 && trimmed.length < MIN_LENGTH && (
              <Text className="text-xs text-slate-400">
                Add a bit more detail to get useful guidance.
              </Text>
            )}
          </View>

          {/* ── Disclaimer ── */}
          <Pressable
            onPress={() => setDisclaimerAccepted((v) => !v)}
            className="flex-row items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 active:opacity-70"
          >
            {/* Checkbox */}
            <View
              className={`w-5 h-5 rounded border-2 items-center justify-center shrink-0 mt-0.5 ${
                disclaimerAccepted
                  ? "bg-brand-500 border-brand-500"
                  : "bg-white border-slate-300"
              }`}
            >
              {disclaimerAccepted && (
                <Text className="text-white text-[10px] font-extrabold leading-none">
                  ✓
                </Text>
              )}
            </View>

            <Text className="flex-1 text-xs text-slate-600 leading-relaxed">
              {DISCLAIMER}
            </Text>
          </Pressable>

          {/* ── Error ── */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <Text className="text-sm font-semibold text-red-700">
                Something went wrong
              </Text>
              <Text className="text-xs text-red-600 mt-1">{error}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <Button
            label={isPending ? "Analysing…" : "Continue"}
            onPress={handleSubmit}
            loading={isPending}
            disabled={!canSubmit}
          />

          {!canSubmit && !isPending && (
            <Text className="text-xs text-slate-400 text-center -mt-2">
              {!selectedChildId
                ? "Select a child to continue"
                : trimmed.length < MIN_LENGTH
                ? "Add more detail to continue"
                : "Check the box to continue"}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
