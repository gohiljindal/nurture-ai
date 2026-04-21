import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONTS, THEME } from "../../constants/theme";
import { getSymptomCheck, submitSymptomFeedback } from "../../lib/api";
import type { CheckDetail, TriageUrgency } from "../../lib/types";
import type { HistoryStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HistoryStackParamList, "HistoryDetail">;

const URGENCY_CONFIG: Record<
  TriageUrgency,
  { label: string; badgeBg: string; badgeText: string; heroBg: string; heroBorder: string; heroText: string }
> = {
  emergency: {
    label: "Emergency",
    badgeBg: "#dc2626", badgeText: "#fff",
    heroBg: "#fef2f2", heroBorder: "#fecaca", heroText: "#b91c1c",
  },
  urgent_doctor: {
    label: "See a doctor today",
    badgeBg: "#d97706", badgeText: "#fff",
    heroBg: "#fffbeb", heroBorder: "#fde68a", heroText: "#92400e",
  },
  monitor_home: {
    label: "Monitor at home",
    badgeBg: "#16a34a", badgeText: "#fff",
    heroBg: "#f0fdf4", heroBorder: "#bbf7d0", heroText: "#14532d",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function HistoryDetailScreen({ route, navigation }: Props) {
  const { checkId } = route.params;

  const [check, setCheck] = useState<CheckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    getSymptomCheck(checkId).then((res) => {
      if (res.ok) {
        const c = res.data.check;
        setCheck(c);
        if (c.feedback !== null) {
          setFeedback(c.feedback.helpful ? "helpful" : "not_helpful");
        }
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, [checkId]);

  const handleFeedback = async (helpful: boolean) => {
    if (feedback !== null) return;
    setSubmittingFeedback(true);
    await submitSymptomFeedback({ checkId, helpful });
    setSubmittingFeedback(false);
    setFeedback(helpful ? "helpful" : "not_helpful");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !check) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || "Could not load check."}</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = URGENCY_CONFIG[check.urgency];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + header */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={styles.backRowText}>‹ History</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Saved check · {formatDate(check.created_at)}</Text>
            <Text style={styles.heading}>Guidance summary</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
            <Text style={[styles.badgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Input text */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionKicker}>What you described</Text>
          <Text style={styles.bodyText}>{check.input_text}</Text>
        </View>

        {/* Urgency hero */}
        <View style={[styles.heroCard, { backgroundColor: cfg.heroBg, borderColor: cfg.heroBorder }]}>
          <Text style={[styles.heroText, { color: cfg.heroText }]}>
            {check.urgency === "emergency"
              ? "Emergency — call emergency services or go to the nearest ED."
              : check.urgency === "urgent_doctor"
              ? "Urgent — in-person medical care was recommended that day."
              : "Monitor at home — guidance was to watch and wait."}
          </Text>
        </View>

        {/* Safety rule */}
        {check.triage.decision_source === "safety_rule" && (
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>Safety check applied</Text>
            <Text style={styles.safetyBody}>
              Result was escalated by a built-in safety rule, not AI.
            </Text>
          </View>
        )}

        {/* Recommended action */}
        <View style={styles.actionCard}>
          <Text style={styles.sectionKicker}>Recommended next step</Text>
          <Text style={styles.actionText}>{check.triage.recommended_action}</Text>
        </View>

        {/* Summary */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionKicker}>Summary</Text>
          <Text style={styles.bodyText}>{check.triage.summary}</Text>
        </View>

        {/* Red flags */}
        {check.triage.red_flags.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionKicker}>Watch for</Text>
            {check.triage.red_flags.map((flag, i) => (
              <View key={i} style={styles.flagRow}>
                <Text style={styles.flagBullet}>•</Text>
                <Text style={[styles.bodyText, { flex: 1 }]}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI reasoning */}
        {check.triage.decision_source === "ai" && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionKicker}>
              AI reasoning · confidence: {check.triage.confidence}
            </Text>
            <Text style={[styles.bodyText, { color: THEME.textMuted }]}>
              {check.triage.reasoning}
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          <Text style={styles.disclaimerBody}>{check.triage.disclaimer}</Text>
          <Text style={styles.disclaimerFooter}>
            When in doubt, contact your clinician or seek urgent or emergency care.
          </Text>
        </View>

        {/* Feedback */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackQuestion}>Was this guidance helpful?</Text>
          {feedback ? (
            <Text style={styles.feedbackThanks}>
              {feedback === "helpful" ? "👍 Thanks for your feedback!" : "👎 Thanks — noted."}
            </Text>
          ) : (
            <View style={styles.feedbackRow}>
              <Pressable
                style={[styles.feedbackBtn, submittingFeedback && { opacity: 0.55 }]}
                onPress={() => void handleFeedback(true)}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#7c3aed" />
                ) : (
                  <Text style={styles.feedbackBtnText}>👍 Yes</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.feedbackBtn, submittingFeedback && { opacity: 0.55 }]}
                onPress={() => void handleFeedback(false)}
                disabled={submittingFeedback}
              >
                <Text style={styles.feedbackBtnText}>👎 No</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 48, gap: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 32 },
  errorText: { fontSize: 14, fontFamily: FONTS.regular, color: "#b91c1c", textAlign: "center" },
  backRow: { marginBottom: 4 },
  backRowText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  kicker: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: THEME.textMuted,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  heading: { fontSize: 22, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 1 },
  badgeText: { fontSize: 12, fontFamily: FONTS.bold },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  heroText: { fontSize: 14, fontFamily: FONTS.semiBold, lineHeight: 22 },
  safetyBox: {
    backgroundColor: "#eff6ff", borderRadius: 14,
    borderWidth: 1, borderColor: "#bfdbfe", padding: 14, gap: 4,
  },
  safetyTitle: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#1e40af" },
  safetyBody: { fontSize: 13, fontFamily: FONTS.regular, color: "#1e3a8a", lineHeight: 20 },
  actionCard: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 2, borderColor: "#7c3aed", padding: 16, gap: 8,
  },
  sectionKicker: {
    fontSize: 10, fontFamily: FONTS.semiBold, color: THEME.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  actionText: { fontSize: 15, fontFamily: FONTS.semiBold, color: THEME.textPrimary, lineHeight: 22 },
  infoCard: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 16, gap: 8,
  },
  bodyText: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 20 },
  flagRow: { flexDirection: "row", gap: 8 },
  flagBullet: { fontSize: 16, color: "#b91c1c", lineHeight: 20 },
  disclaimerCard: {
    backgroundColor: "#fffbeb", borderRadius: 18,
    borderWidth: 1, borderColor: "#fde68a", padding: 16, gap: 6,
  },
  disclaimerTitle: { fontSize: 13, fontFamily: FONTS.bold, color: "#92400e" },
  disclaimerBody: { fontSize: 13, fontFamily: FONTS.regular, color: "#78350f", lineHeight: 20 },
  disclaimerFooter: { fontSize: 12, fontFamily: FONTS.medium, color: "#92400e", marginTop: 2 },
  feedbackCard: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 16, gap: 10,
  },
  feedbackQuestion: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  feedbackRow: { flexDirection: "row", gap: 10 },
  feedbackBtn: {
    flex: 1, borderWidth: 1, borderColor: THEME.borderSoft,
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
    backgroundColor: THEME.page,
  },
  feedbackBtnText: { fontSize: 14, fontFamily: FONTS.medium, color: THEME.textPrimary },
  feedbackThanks: { fontSize: 13, fontFamily: FONTS.medium, color: "#7c3aed" },
  backBtn: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 10, alignSelf: "center",
  },
  backBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
});
