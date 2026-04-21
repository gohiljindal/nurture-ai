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
import { getMilestones } from "../../lib/api";
import type { AgeGroup, DelayStatus, DomainSummary, MilestonesResponse } from "../../lib/types";
import type { HomeStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Milestones">;

// ── Delay status config ────────────────────────────────────────────────────────

const DELAY_CONFIG: Record<DelayStatus, { label: string; bg: string; text: string }> = {
  achieved:  { label: "Achieved",  bg: "#f0fdf4", text: "#14532d" },
  on_track:  { label: "On track",  bg: "#eff6ff", text: "#1e40af" },
  watch:     { label: "Watch",     bg: "#fffbeb", text: "#92400e" },
  delayed:   { label: "Delayed",   bg: "#fef2f2", text: "#b91c1c" },
};

function progressColor(pct: number) {
  if (pct >= 80) return "#16a34a";
  if (pct >= 50) return "#2563eb";
  return "#d97706";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DomainCard({ d }: { d: DomainSummary }) {
  const pct = d.progress;
  return (
    <View style={ds.domainCard}>
      <Text style={ds.domainEmoji}>{d.emoji}</Text>
      <Text style={ds.domainLabel}>{d.label}</Text>
      <View style={ds.domainBarBg}>
        <View
          style={[
            ds.domainBarFill,
            { width: `${pct}%` as `${number}%`, backgroundColor: progressColor(pct) },
          ]}
        />
      </View>
      <Text style={ds.domainStats}>
        {d.achieved}/{d.total}
        {d.delayed > 0 ? ` · ${d.delayed} delayed` : ""}
      </Text>
    </View>
  );
}

function MilestoneRow({ item }: { item: AgeGroup["milestones"][0] }) {
  const cfg = DELAY_CONFIG[item.delay_status];
  return (
    <View style={[ms.row, item.is_relevant_now && ms.rowRelevant]}>
      <View style={ms.rowTop}>
        <Text style={ms.rowTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[ms.chip, { backgroundColor: cfg.bg }]}>
          <Text style={[ms.chipText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>
      {item.red_flag && item.delay_status === "delayed" && (
        <View style={ms.redFlagBadge}>
          <Text style={ms.redFlagText}>🚩 Red flag — speak to your doctor</Text>
        </View>
      )}
      {item.is_relevant_now && (
        <Text style={ms.description}>{item.description}</Text>
      )}
    </View>
  );
}

function AgeGroupSection({ group }: { group: AgeGroup }) {
  const [open, setOpen] = useState(group.age_months <= 24);
  return (
    <View style={ags.container}>
      <Pressable style={ags.header} onPress={() => setOpen((v) => !v)}>
        <View style={ags.headerLeft}>
          <Text style={ags.headerLabel}>{group.label}</Text>
          {group.any_red_flag_delayed && (
            <View style={ags.alertDot} />
          )}
        </View>
        <View style={ags.headerRight}>
          <View style={ags.progressBarBg}>
            <View
              style={[
                ags.progressBarFill,
                {
                  width: `${group.progress}%` as `${number}%`,
                  backgroundColor: progressColor(group.progress),
                },
              ]}
            />
          </View>
          <Text style={ags.progressLabel}>{Math.round(group.progress)}%</Text>
          <Text style={ags.chevron}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>
      {open && (
        <View style={ags.milestoneList}>
          {group.milestones.map((m) => (
            <MilestoneRow key={m.id} item={m} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function MilestonesScreen({ route, navigation }: Props) {
  const { childId, childName } = route.params;
  const [data, setData] = useState<MilestonesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMilestones(childId).then((res) => {
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

        <Text style={styles.kicker}>What's normal now</Text>
        <Text style={styles.heading}>{childName}</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#7c3aed" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <>
            {/* Age label */}
            <Text style={styles.ageLine}>
              {data.child.age_months} month{data.child.age_months !== 1 ? "s" : ""} old
              {data.child.is_premature ? " (corrected age)" : ""}
            </Text>

            {/* Overview stats */}
            {data.overview.needs_attention && (
              <View style={styles.attentionBanner}>
                <Text style={styles.attentionText}>
                  🚩 Some milestones may need attention — review with your doctor.
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{data.overview.achieved}</Text>
                <Text style={styles.statLabel}>Achieved</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{data.overview.on_track}</Text>
                <Text style={styles.statLabel}>On track</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, data.overview.delayed > 0 && { color: "#b91c1c" }]}>
                  {data.overview.delayed}
                </Text>
                <Text style={styles.statLabel}>Delayed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{data.overview.progress_pct}%</Text>
                <Text style={styles.statLabel}>Progress</Text>
              </View>
            </View>

            {/* Domain summaries */}
            <Text style={styles.sectionTitle}>By domain</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.domainRow}
            >
              {data.domain_summaries.map((d) => (
                <DomainCard key={d.domain} d={d} />
              ))}
            </ScrollView>

            {/* Age groups */}
            <Text style={styles.sectionTitle}>Milestone timeline</Text>
            {data.age_groups.map((group) => (
              <AgeGroupSection key={group.label} group={group} />
            ))}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                Milestones are averages — every child develops at their own pace. This is
                for information only. Discuss any concerns with your healthcare provider.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── StyleSheets ───────────────────────────────────────────────────────────────

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
  ageLine: { fontSize: 14, fontFamily: FONTS.regular, color: THEME.textSecondary, marginTop: -8 },
  center: { paddingVertical: 40, alignItems: "center" },
  errorText: { fontSize: 14, color: "#b91c1c", fontFamily: FONTS.regular, textAlign: "center" },
  attentionBanner: {
    backgroundColor: "#fef2f2", borderRadius: 14,
    borderWidth: 1, borderColor: "#fecaca", padding: 12,
  },
  attentionText: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#b91c1c", lineHeight: 20 },
  statsRow: {
    flexDirection: "row", backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, padding: 14,
  },
  statBox: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: THEME.textSecondary },
  sectionTitle: { fontSize: 15, fontFamily: FONTS.bold, color: THEME.textPrimary },
  domainRow: { flexDirection: "row", gap: 10, paddingVertical: 4 },
  disclaimer: {
    backgroundColor: "#fffbeb", borderRadius: 14,
    borderWidth: 1, borderColor: "#fde68a", padding: 12,
  },
  disclaimerText: {
    fontSize: 12, fontFamily: FONTS.regular, color: "#78350f", lineHeight: 18,
  },
});

const ds = StyleSheet.create({
  domainCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: THEME.borderSoft, width: 130, gap: 4,
  },
  domainEmoji: { fontSize: 22 },
  domainLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  domainBarBg: {
    height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden",
    marginTop: 4,
  },
  domainBarFill: { height: 6, borderRadius: 3 },
  domainStats: { fontSize: 11, fontFamily: FONTS.regular, color: THEME.textMuted },
});

const ags = StyleSheet.create({
  container: {
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.borderSoft, overflow: "hidden",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 14, gap: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  alertDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressBarBg: {
    width: 60, height: 5, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden",
  },
  progressBarFill: { height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: THEME.textSecondary },
  chevron: { fontSize: 10, color: THEME.textMuted },
  milestoneList: {
    borderTopWidth: 1, borderTopColor: THEME.borderSoft,
  },
});

const ms = StyleSheet.create({
  row: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.borderSoft, gap: 6,
  },
  rowRelevant: { backgroundColor: "#fafaf9" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary, lineHeight: 20 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  chipText: { fontSize: 11, fontFamily: FONTS.semiBold },
  description: {
    fontSize: 12, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 18,
  },
  redFlagBadge: {
    backgroundColor: "#fef2f2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: "flex-start",
  },
  redFlagText: { fontSize: 11, fontFamily: FONTS.semiBold, color: "#b91c1c" },
});
