import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useHistory } from "@/lib/hooks";
import { URGENCY_CONFIG, formatCheckDate } from "@/lib/triage-config";
import type { HistoryCheck } from "@/lib/types";

// ── Check card ────────────────────────────────────────────────────────────────

function CheckCard({
  check,
  onPress,
}: {
  check: HistoryCheck;
  onPress: () => void;
}) {
  const u = URGENCY_CONFIG[check.urgency];

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-4 gap-3 active:opacity-70 shadow-sm"
    >
      {/* Top row: urgency chip + date */}
      <View className="flex-row items-center justify-between">
        <View
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 border ${u.chipBg} ${u.chipBorder}`}
        >
          <Text className="text-xs">{u.icon}</Text>
          <Text className={`text-xs font-bold ${u.chipText}`}>{u.label}</Text>
        </View>
        <Text className="text-xs text-slate-400">
          {formatCheckDate(check.created_at)}
        </Text>
      </View>

      {/* Child name */}
      <Text className="text-xs font-semibold text-brand-600 -mb-1">
        {check.childName}
      </Text>

      {/* Symptom preview */}
      <Text
        className="text-sm text-slate-700 leading-snug"
        numberOfLines={2}
      >
        {check.input_text}
      </Text>

      {/* Chevron */}
      <View className="flex-row justify-end">
        <Text className="text-slate-300 text-xl leading-none">›</Text>
      </View>
    </Pressable>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-4 py-20">
      <Text className="text-5xl">📋</Text>
      <Text className="text-base font-bold text-slate-900 text-center">
        No checks yet
      </Text>
      <Text className="text-sm text-slate-500 text-center leading-relaxed">
        When you check symptoms, the results will appear here so you can look
        back at them anytime.
      </Text>
      <View className="w-full mt-2">
        <Button
          label="Start a check"
          onPress={() => router.push("/(app)/check")}
        />
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { data: checks, isLoading, error, refetch, isFetching } = useHistory();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-3">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading history…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5 gap-4">
        <Text className="text-4xl">⚠️</Text>
        <Text className="text-base font-bold text-slate-900 text-center">
          Could not load history
        </Text>
        <Text className="text-sm text-slate-500 text-center">
          {(error as Error).message}
        </Text>
        <View className="w-full mt-2">
          <Button label="Try again" onPress={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <FlatList
        data={checks ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName={
          checks?.length ? "px-5 pt-6 pb-14 gap-3" : "flex-1"
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={BRAND_PRIMARY_HEX}
          />
        }
        ListHeaderComponent={
          checks?.length ? (
            <View className="mb-2">
              <Text className="text-2xl font-extrabold text-slate-900">
                History
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                {checks.length} symptom check
                {checks.length !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <CheckCard
            check={item}
            onPress={() =>
              router.push({
                pathname: "/(app)/history/[checkId]",
                params: { checkId: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
