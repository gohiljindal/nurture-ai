import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
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
import { submitSymptomFeedback } from "../../lib/api";
import type { TriageUrgency } from "../../lib/types";
import type { CheckStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CheckStackParamList, "Result">;

// ── Urgency config ─────────────────────────────────────────────────────────────

type UrgencyConfig = {
  label: string;
  badgeBg: string;
  badgeText: string;
  heroBg: string;
  heroBorder: string;
  heroText: string;
  heroIcon: string;
};

const URGENCY: Record<TriageUrgency, UrgencyConfig> = {
  emergency: {
    label: "Emergency",
    badgeBg: "#dc2626", badgeText: "#fff",
    heroBg: "#fef2f2", heroBorder: "#fecaca", heroText: "#b91c1c",
    heroIcon: "🚨",
  },
  urgent_doctor: {
    label: "See a doctor today",
    badgeBg: "#d97706", badgeText: "#fff",
    heroBg: "#fffbeb", heroBorder: "#fde68a", heroText: "#92400e",
    heroIcon: "⚠️",
  },
  monitor_home: {
    label: "Monitor at home",
    badgeBg: "#16a34a", badgeText: "#fff",
    heroBg: "#f0fdf4", heroBorder: "#bbf7d0", heroText: "#14532d",
    heroIcon: "🏠",
  },
};

export default function ResultScreen({ route, navigation }: Props) {
  const { checkId, triage } = route.params;
  const cfg = URGENCY[triage.urgency];

  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleFeedback = async (helpful: boolean) => {
    if (feedback !== null) return;
    setSubmittingFeedback(true);
    await submitSymptomFeedback({ checkId, helpful });
    setSubmittingFeedback(false);
    setFeedback(helpful ? "helpful" : "not_helpful");
  };

  const startAnother = () => {
    navigation.popToTop();
  };

  const goToHistory = () => {
    navigation.getParent()?.navigate("History" as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Guidance summary</Text>
            <Text style={styles.heading}>Your result</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
            <Text style={[styles.badgeText, { color: cfg.badgeText }]}>
              {cfg.heroIcon} {cfg.label}
            </Text>
          </View>
        </View>

        {/* Urgency hero */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: cfg.heroBg, borderColor: cfg.heroBorder },
          ]}
        >
          <Text style={[styles.heroText, { color: cfg.heroText }]}>
            {triage.urgency === "emergency"
              ? "Call emergency services now or go to your nearest emergency department."
              : triage.urgency === "urgent_doctor"
              ? "Seek in-person medical care today — same day or urgent care."
              : "You can monitor your child at home for now. Follow the guidance below."}
          </Text>
        </View>

        {/* Safety rule notice */}
        {triage.decision_source === "safety_rule" && (
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>Safety check applied</Text>
            <Text style={styles.safetyBody}>
              This result was escalated by a built-in safety rule, not AI. If
              unsure, seek in-person care.
            </Text>
          </View>
        )}

        {/* Recommended action */}
        <View style={styles.actionCard}>
          <Text style={styles.sectionKicker}>Recommended next step</Text>
          <Text style={styles.actionText}>{triage.recommended_action}</Text>
        </View>

        {/* Summary */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionKicker}>Summary</Text>
          <Text style={styles.bodyText}>{triage.summary}</Text>
        </View>

        {/* Red flags */}
        {triage.red_flags.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionKicker}>Watch for</Text>
            <View style={styles.flagList}>
              {triage.red_flags.map((flag, i) => (
                <View key={i} style={styles.flagRow}>
                  <Text style={styles.flagBullet}>•</Text>
                  <Text style={styles.bodyText}>{flag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI reasoning */}
        {triage.decision_source === "ai" && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionKicker}>
              AI reasoning · confidence: {triage.confidence}
            </Text>
            <Text style={[styles.bodyText, styles.mutedText]}>
              {triage.reasoning}
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          <Text style={styles.disclaimerBody}>{triage.disclaimer}</Text>
          <Text style={styles.disclaimerFooter}>
            When in doubt, contact your clinician or seek urgent or emergency
            care.
          </Text>
        </View>

        {/* Feedback */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackQuestion}>Was this guidance helpful?</Text>
          {feedback ? (
            <Text style={styles.feedbackThanks}>
              {feedback === "helpful" ? "👍 Thanks for your feedback!" : "👎 Thanks — we'll use that to improve."}
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

        {/* Navigation */}
        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={startAnother}>
            <Text style={styles.navBtnText}>🔄 Start another check</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={goToHistory}>
            <Text style={styles.navBtnText}>📋 View history</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 48, gap: 14 },

  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", gap: 10,
  },
  kicker: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: "#7c3aed",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  heading: { fontSize: 22, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  badge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    flexShrink: 1, alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontFamily: FONTS.bold },

  heroCard: {
    borderRadius: 18, borderWidth: 1, padding: 16,
  },
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
    fontSize: 10, fontFamily: FONTS.semiBold,
    color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.8,
  },
  actionText: { fontSize: 15, fontFamily: FONTS.semiBold, color: THEME.textPrimary, lineHeight: 22 },

  infoCard: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 16, gap: 8,
  },
  bodyText: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 20, flex: 1 },
  mutedText: { color: THEME.textMuted },

  flagList: { gap: 6 },
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

  navRow: { flexDirection: "row", gap: 10 },
  navBtn: {
    flex: 1, borderWidth: 1, borderColor: THEME.borderSoft,
    borderRadius: 14, paddingVertical: 13, alignItems: "center",
    backgroundColor: THEME.card,
  },
  navBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
});
