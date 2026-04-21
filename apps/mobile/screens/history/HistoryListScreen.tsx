import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONTS, THEME } from "../../constants/theme";
import { listSymptomHistory } from "../../lib/api";
import type { HistoryCheck, TriageUrgency } from "../../lib/types";
import type { HistoryStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HistoryStackParamList, "HistoryList">;

const URGENCY_CONFIG: Record<TriageUrgency, { label: string; bg: string; text: string }> = {
  emergency:     { label: "Emergency",        bg: "#fef2f2", text: "#b91c1c" },
  urgent_doctor: { label: "See doctor today", bg: "#fffbeb", text: "#92400e" },
  monitor_home:  { label: "Monitor at home",  bg: "#f0fdf4", text: "#14532d" },
};

function UrgencyBadge({ urgency }: { urgency: TriageUrgency }) {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryListScreen({ navigation }: Props) {
  const [checks, setChecks] = useState<HistoryCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError("");
      listSymptomHistory().then((res) => {
        if (res.ok) {
          setChecks(res.data.checks);
        } else {
          setError(res.error);
        }
        setLoading(false);
      });
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Your records</Text>
        <Text style={styles.heading}>Symptom history</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7c3aed" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : checks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No checks yet</Text>
          <Text style={styles.emptySub}>
            Run a symptom check and it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={checks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("HistoryDetail", { checkId: item.id })}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardMeta}>
                  <Text style={styles.childName}>{item.childName}</Text>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>
                <UrgencyBadge urgency={item.urgency} />
              </View>
              <Text style={styles.inputSnippet} numberOfLines={2}>
                {item.input_text}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  kicker: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: "#7c3aed",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  heading: { fontSize: 24, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText: { fontSize: 14, fontFamily: FONTS.regular, color: "#b91c1c", textAlign: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.bold, color: THEME.textPrimary },
  emptySub: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, textAlign: "center", lineHeight: 20 },
  list: { padding: 18, gap: 12 },
  card: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 14, gap: 8,
    shadowColor: "#1a2744", shadowOpacity: 0.05,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardMeta: { flex: 1 },
  childName: { fontSize: 14, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  dateText: { fontSize: 12, fontFamily: FONTS.regular, color: THEME.textMuted, marginTop: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  badgeText: { fontSize: 11, fontFamily: FONTS.semiBold },
  inputSnippet: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 19 },
});
