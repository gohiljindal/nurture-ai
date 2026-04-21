import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
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
import { listChildren, startSymptomFollowup } from "../../lib/api";
import type { Child } from "../../lib/types";
import type { CheckStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CheckStackParamList, "SymptomInput">;

export default function SymptomInputScreen({ route, navigation }: Props) {
  const preselectedChildId = route.params?.childId;

  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(preselectedChildId ?? "");
  const [symptomText, setSymptomText] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = useCallback(() => {
    setSymptomText("");
    setDisclaimerAccepted(false);
    setError("");
  }, []);

  // Reset form every time screen comes into focus (e.g. after "Start another check")
  useFocusEffect(resetForm);

  // Load children once on first focus
  useFocusEffect(
    useCallback(() => {
      setLoadingChildren(true);
      listChildren().then((res) => {
        if (res.ok) {
          const list = res.data.children;
          setChildren(list);
          // Pre-select: use route param, or first child
          if (!selectedChildId && list.length > 0) {
            setSelectedChildId(list[0]?.id ?? "");
          }
        }
        setLoadingChildren(false);
      });
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSubmit = async () => {
    setError("");
    if (!selectedChildId) { setError("Please select a child."); return; }
    if (!disclaimerAccepted) { setError("Please accept the disclaimer before continuing."); return; }
    if (symptomText.trim().length < 5) { setError("Please describe what you are seeing in a bit more detail."); return; }

    setLoading(true);
    const result = await startSymptomFollowup({
      childId: selectedChildId,
      symptomText: symptomText.trim(),
      disclaimerAccepted,
    });
    setLoading(false);

    if (!result.ok) { setError(result.error); return; }

    if (result.data.type === "immediate") {
      // Safety rule fired — go straight to result
      navigation.navigate("Result", {
        checkId: result.data.checkId,
        triage: result.data.triage,
      });
    } else {
      navigation.navigate("Followup", {
        childId: selectedChildId,
        symptomText: symptomText.trim(),
        questions: result.data.questions,
      });
    }
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
          <Text style={styles.kicker}>Symptom check</Text>
          <Text style={styles.heading}>What are you seeing?</Text>
          <Text style={styles.subheading}>
            General guidance only — not a diagnosis. If you believe it is an
            emergency, call emergency services now.
          </Text>

          {loadingChildren ? (
            <View style={styles.center}>
              <ActivityIndicator color="#7c3aed" />
            </View>
          ) : children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Add a child first</Text>
              <Text style={styles.emptySub}>
                Go to the Home tab and add a child profile before running a
                symptom check.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {/* Child selector */}
              <View style={styles.field}>
                <Text style={styles.label}>Which child is this about?</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={styles.chipRow}
                >
                  {children.map((child) => (
                    <Pressable
                      key={child.id}
                      style={[
                        styles.chip,
                        selectedChildId === child.id && styles.chipActive,
                      ]}
                      onPress={() => setSelectedChildId(child.id)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedChildId === child.id && styles.chipTextActive,
                        ]}
                      >
                        {child.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Symptom text */}
              <View style={styles.field}>
                <Text style={styles.label}>What is going on?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={symptomText}
                  onChangeText={setSymptomText}
                  placeholder={
                    "Example: 6-month-old, fever 38.7°C since this evening, mild cough. Drinking OK."
                  }
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  textAlignVertical="top"
                  editable={!loading}
                />
                <Text style={styles.hint}>
                  A few sentences help. You can edit before you continue.
                </Text>
              </View>

              {/* Disclaimer */}
              <Pressable
                style={styles.disclaimerRow}
                onPress={() => setDisclaimerAccepted((v) => !v)}
                disabled={loading}
              >
                <View
                  style={[
                    styles.checkbox,
                    disclaimerAccepted && styles.checkboxActive,
                  ]}
                >
                  {disclaimerAccepted && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.disclaimerText}>
                  I understand this tool gives general guidance only. It does
                  not replace a doctor, emergency services, or in-person care.
                </Text>
              </Pressable>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <PrimaryButton disabled={loading} onPress={handleSubmit}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>➡️ Continue</Text>
                )}
              </PrimaryButton>
            </View>
          )}
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
  center: { paddingVertical: 40, alignItems: "center" },
  emptyCard: {
    backgroundColor: THEME.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: THEME.borderSoft, gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.bold, color: THEME.textPrimary },
  emptySub: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 20 },
  card: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 18, gap: 16,
    borderWidth: 1, borderColor: THEME.borderSoft,
    shadowColor: "#1a2744", shadowOpacity: 0.06,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  chipScroll: { flexGrow: 0 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, backgroundColor: THEME.page,
  },
  chipActive: { backgroundColor: "#ede9fe", borderColor: "#a78bfa" },
  chipText: { fontSize: 13, fontFamily: FONTS.medium, color: THEME.textSecondary },
  chipTextActive: { color: "#5b21b6", fontFamily: FONTS.semiBold },
  input: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: THEME.page, fontFamily: FONTS.regular,
    fontSize: 14, color: THEME.textPrimary,
  },
  textArea: { minHeight: 140 },
  hint: { fontSize: 11, fontFamily: FONTS.regular, color: THEME.textMuted },
  disclaimerRow: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    backgroundColor: "#f8fafc", borderRadius: 14,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 12,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1, borderColor: THEME.borderSoft,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },
  checkboxActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  checkmark: { color: "#fff", fontSize: 12, fontFamily: FONTS.bold },
  disclaimerText: {
    flex: 1, fontSize: 13, fontFamily: FONTS.regular,
    color: THEME.textSecondary, lineHeight: 20,
  },
  errorBox: {
    backgroundColor: "#fef2f2", borderRadius: 12,
    borderWidth: 1, borderColor: "#fecaca", padding: 10,
  },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, color: "#b91c1c" },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
});
