import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONTS, THEME } from "../../constants/theme";
import { getVaccines } from "../../lib/api";
import type {
  VaccineTimelineItem,
  VaccinesApiResponse,
  VaccinesResponse,
} from "../../lib/types";
import type { HomeStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Vaccines">;

function formatScheduledDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function daysLabel(v: VaccineTimelineItem) {
  if (v.administered) return "Given";
  if (v.isOverdue) return "Overdue";
  if (v.daysUntilDue === 0) return "Due today";
  if (v.daysUntilDue < 0) return "Overdue";
  return `In ${v.daysUntilDue}d`;
}

function VaccineCard({
  v,
  variant,
}: {
  v: VaccineTimelineItem;
  variant: "overdue" | "upcoming" | "done";
}) {
  const bg =
    variant === "overdue"
      ? "#fef2f2"
      : variant === "done"
      ? "#f0fdf4"
      : THEME.card;
  const borderColor =
    variant === "overdue"
      ? "#fecaca"
      : variant === "done"
      ? "#bbf7d0"
      : THEME.borderSoft;
  const labelColor =
    variant === "overdue" ? "#b91c1c" : variant === "done" ? "#14532d" : THEME.textMuted;

  return (
    <View style={[vc.card, { backgroundColor: bg, borderColor }]}>
      <View style={vc.top}>
        <Text style={vc.name} numberOfLines={2}>{v.name}</Text>
        <Text style={[vc.label, { color: labelColor }]}>{daysLabel(v)}</Text>
      </View>
      <Text style={vc.diseases} numberOfLines={1}>
        {v.diseases.slice(0, 3).join(", ")}
        {v.diseases.length > 3 ? "…" : ""}
      </Text>
      <Text style={vc.date}>
        {v.administered && v.administeredDate
          ? `Given ${formatScheduledDate(v.administeredDate)}`
          : `Due ${formatScheduledDate(v.scheduledDate)}`}
      </Text>
      {v.notes ? <Text style={vc.notes}>{v.notes}</Text> : null}
    </View>
  );
}

function isFullResponse(r: VaccinesApiResponse): r is VaccinesResponse {
  return !("requires_province" in r);
}

export default function VaccinesScreen({ route, navigation }: Props) {
  const { childId, childName } = route.params;
  const [data, setData] = useState<VaccinesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getVaccines(childId).then((res) => {
      if (res.ok) {
        setData(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, [childId]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={styles.backRowText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>Vaccine preview</Text>
        <Text style={styles.heading}>{childName}</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#7c3aed" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data && !isFullResponse(data) ? (
          /* Province not set */
          <View style={styles.provinceCard}>
            <Text style={styles.provinceTitle}>Province required</Text>
            <Text style={styles.provinceSub}>
              Vaccine schedules in Canada are province-specific. Set a province on{" "}
              <Text style={{ fontFamily: FONTS.semiBold }}>{childName}</Text>'s profile to
              see their vaccine timeline.
            </Text>
          </View>
        ) : data && isFullResponse(data) ? (
          <>
            {/* Province + health line */}
            <View style={styles.provinceInfo}>
              <Text style={styles.provinceInfoText}>
                📍 {data.child.province_name} schedule
              </Text>
              {data.province_info.health_line ? (
                <Pressable
                  onPress={() => {
                    const tel = `tel:${data.province_info.health_line.replace(/\s/g, "")}`;
                    void Linking.openURL(tel);
                  }}
                >
                  <Text style={styles.healthLine}>
                    📞 {data.province_info.health_line}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Stats card */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBig}>{data.stats.completion_pct}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBig}>{data.stats.administered}</Text>
                <Text style={styles.statLabel}>Given</Text>
              </View>
              <View style={[styles.statBox]}>
                <Text
                  style={[
                    styles.statBig,
                    data.stats.overdue > 0 && { color: "#b91c1c" },
                  ]}
                >
                  {data.stats.overdue}
                </Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBig}>{data.stats.upcoming_90_days}</Text>
                <Text style={styles.statLabel}>Next 90d</Text>
              </View>
            </View>

            {/* Next vaccine */}
            {data.next_vaccine && (
              <>
                <Text style={styles.sectionTitle}>Next vaccine</Text>
                <VaccineCard v={data.next_vaccine} variant={data.next_vaccine.isOverdue ? "overdue" : "upcoming"} />
              </>
            )}

            {/* Overdue */}
            {data.overdue.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  🚨 Overdue ({data.overdue.length})
                </Text>
                {data.overdue.map((v) => (
                  <VaccineCard key={v.code} v={v} variant="overdue" />
                ))}
              </>
            )}

            {/* Upcoming 90 days */}
            {data.upcoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  📅 Upcoming — next 90 days ({data.upcoming.length})
                </Text>
                {data.upcoming.map((v) => (
                  <VaccineCard key={v.code} v={v} variant="upcoming" />
                ))}
              </>
            )}

            {/* Full timeline */}
            <Text style={styles.sectionTitle}>Full timeline</Text>
            {data.timeline.map((v) => (
              <VaccineCard
                key={v.code}
                v={v}
                variant={v.administered ? "done" : v.isOverdue ? "overdue" : "upcoming"}
              />
            ))}

            {/* Schedule link */}
            {data.province_info.schedule_url ? (
              <Pressable
                style={styles.scheduleLink}
                onPress={() => void Linking.openURL(data.province_info.schedule_url)}
              >
                <Text style={styles.scheduleLinkText}>
                  📋 View {data.child.province_name} official schedule ↗
                </Text>
              </Pressable>
            ) : null}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                This is a reference preview only. Schedules may change. Confirm with your
                healthcare provider or local public health unit.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── StyleSheets ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 48, gap: 16 },
  backRow: { marginBottom: 2 },
  backRowText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  kicker: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: "#7c3aed",
    letterSpacing: 0.8, textTransform: "uppercase",
  },
  heading: { fontSize: 24, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  center: { paddingVertical: 40, alignItems: "center" },
  errorText: { fontSize: 14, color: "#b91c1c", fontFamily: FONTS.regular, textAlign: "center" },
  provinceCard: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 18, gap: 8,
  },
  provinceTitle: { fontSize: 16, fontFamily: FONTS.bold, color: THEME.textPrimary },
  provinceSub: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 20 },
  provinceInfo: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: THEME.card, borderRadius: 14,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 12,
  },
  provinceInfoText: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  healthLine: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  statsRow: {
    flexDirection: "row", backgroundColor: THEME.card,
    borderRadius: 18, borderWidth: 1, borderColor: THEME.borderSoft, padding: 14,
  },
  statBox: { flex: 1, alignItems: "center", gap: 2 },
  statBig: { fontSize: 20, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: THEME.textSecondary },
  sectionTitle: { fontSize: 15, fontFamily: FONTS.bold, color: THEME.textPrimary, marginBottom: -4 },
  scheduleLink: {
    backgroundColor: "#ede9fe", borderRadius: 14, padding: 14, alignItems: "center",
  },
  scheduleLinkText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#5b21b6" },
  disclaimer: {
    backgroundColor: "#fffbeb", borderRadius: 14,
    borderWidth: 1, borderColor: "#fde68a", padding: 12,
  },
  disclaimerText: { fontSize: 12, fontFamily: FONTS.regular, color: "#78350f", lineHeight: 18 },
});

const vc = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14, gap: 4,
    shadowColor: "#1a2744", shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  name: { flex: 1, fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary, lineHeight: 20 },
  label: { fontSize: 11, fontFamily: FONTS.bold, flexShrink: 0 },
  diseases: { fontSize: 12, fontFamily: FONTS.regular, color: THEME.textSecondary },
  date: { fontSize: 11, fontFamily: FONTS.regular, color: THEME.textMuted },
  notes: { fontSize: 11, fontFamily: FONTS.regular, color: THEME.textMuted, fontStyle: "italic" },
});
