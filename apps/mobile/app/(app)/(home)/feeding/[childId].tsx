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

import { FeedingGuidanceContent } from "@/components/health/FeedingGuidanceContent";
import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useFeedingGuidance } from "@/lib/hooks";

export default function FeedingScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch, isFetching } = useFeedingGuidance(
    childId ?? ""
  );

  if (!childId) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5">
        <Text className="text-sm text-slate-500">Missing child.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-3">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading feeding guidance…</Text>
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
        <Text className="text-sm text-slate-500">
          {(error as Error)?.message ?? "Something went wrong."}
        </Text>
        <Button label="Try again" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  const name =
    (data.child as { name?: string } | undefined)?.name ?? "Child";
  const ageMonths = (data.child as { age_months?: number } | undefined)?.age_months;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-14 gap-4"
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
            Feeding
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900">{name}</Text>
          <Text className="text-sm text-slate-500">
            {typeof ageMonths === "number"
              ? `About ${ageMonths} months (corrected where applicable) · Canada-aligned tips`
              : "Age-based guidance"}
          </Text>
        </View>

        <FeedingGuidanceContent data={data as Record<string, unknown>} />

        <Text className="text-[11px] text-slate-400 leading-relaxed">
          For feeding emergencies or severe allergic reactions, seek urgent in-person care.
          This screen summarizes education content for your child&apos;s age — not personal
          medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
