import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PrimaryButton from "../../components/PrimaryButton";
import { FONTS, THEME } from "../../constants/theme";
import { submitSymptomFinal } from "../../lib/api";
import type { CheckStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CheckStackParamList, "Followup">;

export default function FollowupScreen({ route, navigation }: Props) {
  const { childId, symptomText, questions } = route.params;

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    questions.forEach((q) => { init[q] = ""; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    const unanswered = questions.filter((q) => !answers[q]?.trim());
    if (unanswered.length > 0) {
      setError("Please answer all questions before continuing.");
      return;
    }

    setLoading(true);
    const result = await submitSymptomFinal({
      childId,
      symptomText,
      followupAnswers: questions.map((q) => ({
        question: q,
        answer: answers[q] ?? "",
      })),
      disclaimerAccepted: true,
    });
    setLoading(false);

    if (!result.ok) { setError(result.error); return; }

    const { checkId, ...triage } = result.data;
    navigation.navigate("Result", { checkId, triage });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.kicker}>Follow-up</Text>
          <Text style={styles.heading}>A few quick questions</Text>
          <Text style={styles.subheading}>
            Short answers help suggest safer next steps. Still not a diagnosis.
          </Text>

          <View style={styles.card}>
            {questions.map((question, idx) => (
              <View key={question} style={styles.field}>
                <Text style={styles.label}>
                  {idx + 1}. {question}
                </Text>
                <TextInput
                  style={styles.input}
                  value={answers[question] ?? ""}
                  onChangeText={(text) =>
                    setAnswers((prev) => ({ ...prev, [question]: text }))
                  }
                  placeholder="Your answer…"
                  placeholderTextColor={THEME.textMuted}
                  editable={!loading}
                />
              </View>
            ))}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.backBtn, loading && { opacity: 0.5 }]}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text style={styles.backBtnText}>‹ Back</Text>
              </Pressable>

              <View style={styles.primaryWrap}>
                <PrimaryButton disabled={loading} onPress={handleSubmit}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>✅ Get guidance</Text>
                  )}
                </PrimaryButton>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 },
  kicker: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: "#7c3aed",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6,
  },
  heading: {
    fontSize: 24, fontFamily: FONTS.extraBold,
    color: THEME.textPrimary, marginBottom: 8,
  },
  subheading: {
    fontSize: 13, fontFamily: FONTS.regular,
    color: THEME.textSecondary, lineHeight: 20, marginBottom: 20,
  },
  card: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 18, gap: 16,
    borderWidth: 1, borderColor: THEME.borderSoft,
    shadowColor: "#1a2744", shadowOpacity: 0.06,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: THEME.page, fontFamily: FONTS.regular,
    fontSize: 14, color: THEME.textPrimary,
  },
  errorBox: {
    backgroundColor: "#fef2f2", borderRadius: 12,
    borderWidth: 1, borderColor: "#fecaca", padding: 10,
  },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, color: "#b91c1c" },
  buttonRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: THEME.page,
  },
  backBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  primaryWrap: { flex: 1 },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
});
