import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useMilestones } from "@/lib/hooks";
import type { DelayStatus, MilestoneItem } from "@/lib/types";

function delayBadgeStyle(s: DelayStatus): string {
  switch (s) {
    case "achieved":
      return "bg-green-100 text-green-800 border-green-200";
    case "on_track":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "watch":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "delayed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function delayLabel(s: DelayStatus): string {
  switch (s) {
    case "achieved":
      return "Achieved";
    case "on_track":
      return "On track";
    case "watch":
      return "Watch";
    case "delayed":
      return "Delayed";
  }
}

function MilestoneCard({ m }: { m: MilestoneItem }) {
  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-2 shadow-sm">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-sm font-bold text-slate-900 leading-snug">
          {m.title}
        </Text>
        <View
          className={`rounded-full px-2 py-0.5 border ${delayBadgeStyle(m.delay_status)}`}
        >
          <Text className="text-[10px] font-bold uppercase tracking-wide">
            {delayLabel(m.delay_status)}
          </Text>
        </View>
      </View>

      {m.red_flag && (
        <View className="bg-red-50 border border-red-100 rounded-lg px-2 py-1 self-start">
          <Text className="text-[10px] font-bold text-red-700">Red flag</Text>
        </View>
      )}

      <Text className="text-xs text-slate-600 leading-relaxed">{m.description}</Text>

      {m.is_relevant_now && (
        <View className="bg-brand-50 border border-brand-100 rounded-lg px-2 py-1 self-start mt-1">
          <Text className="text-[10px] font-semibold text-brand-700">
            Relevant at this age
          </Text>
        </View>
      )}

      {m.premature_notes ? (
        <Text className="text-[11px] text-slate-500 italic border-l-2 border-brand-200 pl-2">
          {m.premature_notes}
        </Text>
      ) : null}
    </View>
  );
}

export default function MilestonesScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch, isFetching } = useMilestones(
    childId ?? ""
  );

  if (!childId) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5">
        <Text className="text-sm text-slate-500">Missing child ID.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-3">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading milestones…</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">Could not load</Text>
        <Text className="text-sm text-slate-500">{(error as Error).message}</Text>
        <Button label="Try again" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  const { child, overview, age_groups, domain_summaries, delay_guidance } = data;

  const relevantNow: MilestoneItem[] = [];
  for (const g of age_groups) {
    for (const m of g.milestones) {
      if (m.is_relevant_now) relevantNow.push(m);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-14 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={BRAND_PRIMARY_HEX}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-[11px] font-bold text-brand-500 tracking-widest uppercase">
            What's normal now
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900">{child.name}</Text>
          <Text className="text-sm text-slate-500">
            {child.age_months} months corrected age
            {child.is_premature ? " · Premature birth" : ""}
          </Text>
        </View>

        {delay_guidance ? (
          <View className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3 gap-2">
            <Text className="text-sm font-bold text-sky-900">Development snapshot</Text>
            <Text className="text-xs text-sky-800 leading-relaxed">{delay_guidance.summary}</Text>
            {delay_guidance.bullets.map((line) => (
              <View key={line} className="flex-row gap-2 items-start">
                <Text className="text-sky-600 font-bold">•</Text>
                <Text className="flex-1 text-xs text-sky-900 leading-relaxed">{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {overview.needs_attention && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <Text className="text-sm font-bold text-amber-800">
              Some milestones may need attention
            </Text>
            <Text className="text-xs text-amber-700 mt-1 leading-relaxed">
              This is guidance, not a diagnosis. Talk to your doctor if you're
              worried about development.
            </Text>
          </View>
        )}

        <View className="flex-row gap-2">
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
            <Text className="text-2xl font-extrabold text-brand-600">
              {overview.progress_pct}%
            </Text>
            <Text className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
              Progress
            </Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
            <Text className="text-2xl font-extrabold text-green-600">
              {overview.achieved}
            </Text>
            <Text className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
              Achieved
            </Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
            <Text className="text-2xl font-extrabold text-amber-600">
              {overview.delayed}
            </Text>
            <Text className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
              Watch list
            </Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-bold text-slate-900">By area</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {domain_summaries.map((d) => (
              <View
                key={d.domain}
                className="bg-white border border-slate-100 rounded-2xl px-4 py-3 min-w-[120]"
              >
                <Text className="text-lg">{d.emoji}</Text>
                <Text className="text-xs font-bold text-slate-800 mt-1">{d.label}</Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  {d.achieved}/{d.total} done
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {relevantNow.length > 0 && (
          <View className="gap-3">
            <Text className="text-sm font-bold text-slate-900">Right now</Text>
            {relevantNow.map((m) => (
              <MilestoneCard key={m.id} m={m} />
            ))}
          </View>
        )}

        <View className="gap-3">
          <Text className="text-sm font-bold text-slate-900">By age</Text>
          {age_groups.map((g) => (
            <View key={g.label} className="gap-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {g.label} · {g.age_months} mo
              </Text>
              {g.milestones.map((m) => (
                <MilestoneCard key={m.id} m={m} />
              ))}
            </View>
          ))}
        </View>

        <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mt-2">
          <Text className="text-[11px] text-slate-500 leading-relaxed text-center">
            Milestones vary widely. If something worries you, your pediatrician
            or family doctor is the right place to start.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
