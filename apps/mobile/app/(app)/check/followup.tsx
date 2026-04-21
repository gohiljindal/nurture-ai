import { router } from "expo-router";
import { useState } from "react";
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
import { clearCheckSession, getCheckSession } from "@/lib/check-store";
import { logTriageEvent } from "@/lib/analytics";
import { calculateAgeInMonths } from "@/lib/child-age";
import { useChildren, useSubmitFinal } from "@/lib/hooks";
import { getLifeStageBucket } from "@/lib/stage-engine";
import type { FollowupAnswer } from "@/lib/types";

export default function FollowupScreen() {
  const session = getCheckSession();
  const { data: children } = useChildren();
  const { mutateAsync: submitFinal, isPending } = useSubmitFinal();

  const [answers, setAnswers] = useState<string[]>(() =>
    Array(session?.questions.length ?? 0).fill("")
  );
  const [error, setError] = useState("");

  const setAnswer = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const allAnswered = answers.every((a) => a.trim().length > 0);

  const handleSubmit = async () => {
    if (!session) return;
    setError("");

    const followupAnswers: FollowupAnswer[] = session.questions.map(
      (question, i) => ({
        question,
        answer: answers[i]!.trim(),
      })
    );

    try {
      const result = await submitFinal({
        childId: session.childId,
        symptomText: session.symptomText,
        followupAnswers,
        disclaimerAccepted: true,
      });

      const childRow = children?.find((c) => c.id === session.childId);
      const stage = childRow
        ? getLifeStageBucket(calculateAgeInMonths(childRow.date_of_birth))
        : undefined;
      logTriageEvent("triage_completed", {
        stage,
        urgency: result.urgency,
      });

      clearCheckSession();

      router.replace({
        pathname: "/(app)/check/result/[checkId]",
        params: { checkId: result.checkId },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ── Guard: session expired (app reload mid-flow) ───────────────────────────

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5 gap-4">
        <Text className="text-4xl">⏱</Text>
        <Text className="text-base font-bold text-slate-900 text-center">
          Session expired
        </Text>
        <Text className="text-sm text-slate-500 text-center">
          Please start a new symptom check.
        </Text>
        <View className="w-full mt-2">
          <Button
            label="Start over"
            onPress={() => router.replace("/(app)/check")}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          {/* ── Back ── */}
          <Pressable
            onPress={() => router.back()}
            disabled={isPending}
            className="active:opacity-60 self-start"
          >
            <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
          </Pressable>

          {/* ── Header ── */}
          <View className="gap-1">
            <Text className="text-[11px] font-bold text-brand-500 tracking-widest uppercase">
              Follow-up
            </Text>
            <Text className="text-2xl font-extrabold text-slate-900">
              A few more details
            </Text>
            <Text className="text-sm text-slate-500">
              Your answers help us give you the most accurate guidance possible.
            </Text>
          </View>

          {/* ── Context card ── */}
          <View className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 flex-row gap-3 items-start">
            <Text className="text-xl mt-0.5">💬</Text>
            <View className="flex-1">
              <Text className="text-xs font-bold text-brand-600 mb-1 uppercase tracking-wide">
                What you described
              </Text>
              <Text
                className="text-xs text-slate-600 leading-relaxed"
                numberOfLines={3}
              >
                {session.symptomText}
              </Text>
            </View>
          </View>

          {/* ── Questions ── */}
          {session.questions.map((question, index) => {
            const hasAnswer = (answers[index] ?? "").trim().length > 0;
            return (
              <View
                key={index}
                className="bg-white border border-slate-100 rounded-2xl p-5 gap-4 shadow-sm"
              >
                {/* Number badge + question text */}
                <View className="flex-row gap-3 items-start">
                  <View className="w-7 h-7 rounded-full bg-brand-500 items-center justify-center shrink-0 mt-0.5">
                    <Text className="text-xs font-extrabold text-white">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-slate-900 leading-snug">
                    {question}
                  </Text>
                </View>

                {/* Answer input */}
                <View
                  className={`border rounded-xl px-4 py-3 ${
                    hasAnswer
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <TextInput
                    value={answers[index]}
                    onChangeText={(v) => setAnswer(index, v)}
                    placeholder="Your answer…"
                    placeholderTextColor="#94a3b8"
                    multiline
                    textAlignVertical="top"
                    returnKeyType="default"
                    blurOnSubmit={false}
                    editable={!isPending}
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: "#0f172a",
                      lineHeight: 22,
                      minHeight: 44,
                    }}
                  />
                </View>
              </View>
            );
          })}

          {/* ── Error ── */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 gap-1">
              <Text className="text-sm font-semibold text-red-700">
                Something went wrong
              </Text>
              <Text className="text-xs text-red-600">{error}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <Button
            label={isPending ? "Analysing…" : "Get guidance"}
            onPress={handleSubmit}
            loading={isPending}
            disabled={!allAnswered}
          />

          {!allAnswered && !isPending && (
            <Text className="text-xs text-slate-400 text-center -mt-2">
              Answer all questions to continue
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
