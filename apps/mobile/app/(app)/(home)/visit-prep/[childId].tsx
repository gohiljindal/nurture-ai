import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { formatAgeLabel } from "@/lib/child-age";
import { useChildren, useVisitPrep } from "@/lib/hooks";

export default function VisitPrepScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data: children, isLoading: loadingChildren, error, refetch } = useChildren();
  const {
    data: prep,
    isLoading: loadingPrep,
    error: prepError,
    refetch: refetchPrep,
  } = useVisitPrep(childId);

  if (!childId) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5">
        <Text className="text-sm text-slate-500">Missing child.</Text>
      </SafeAreaView>
    );
  }

  if (loadingChildren) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-3">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-3">
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">Could not load profile</Text>
        <Text className="text-sm text-slate-500">{(error as Error).message}</Text>
        <Pressable onPress={() => refetch()} className="self-start mt-2">
          <Text className="text-sm font-semibold text-brand-600">Tap to retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const child = children?.find((c) => c.id === childId);

  if (!child) {
    return (
      <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">Child not found</Text>
        <Text className="text-sm text-slate-500">
          This profile may have been removed. Go back and open the child again.
        </Text>
      </SafeAreaView>
    );
  }

  if (loadingPrep || !prep) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-3">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading visit prep…</Text>
      </SafeAreaView>
    );
  }

  if (prepError) {
    return (
      <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">Could not load visit prep</Text>
        <Text className="text-sm text-slate-500">{(prepError as Error).message}</Text>
        <Pressable onPress={() => refetchPrep()}>
          <Text className="text-sm font-semibold text-brand-600">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { before, during, focus_topics } = prep;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-14 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>

        <View className="gap-1">
          <Text className="text-[11px] font-bold text-brand-500 tracking-widest uppercase">
            Visit prep
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900">{child.name}</Text>
          <Text className="text-sm text-slate-500">
            {formatAgeLabel(prep.child.age_months)} · Questions to consider for your next
            check-up
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-3">
          <Text className="text-xs font-bold text-slate-400 uppercase">Focus topics</Text>
          {focus_topics.map((line) => (
            <View key={line} className="flex-row gap-2 items-start">
              <Text className="text-brand-500 font-bold">•</Text>
              <Text className="flex-1 text-sm text-slate-800 leading-relaxed">{line}</Text>
            </View>
          ))}
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-3">
          <Text className="text-xs font-bold text-slate-400 uppercase">Before you go</Text>
          {before.map((line) => (
            <View key={line} className="flex-row gap-2 items-start">
              <Text className="text-brand-500 font-bold">•</Text>
              <Text className="flex-1 text-sm text-slate-800 leading-relaxed">{line}</Text>
            </View>
          ))}
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-3">
          <Text className="text-xs font-bold text-slate-400 uppercase">During the visit</Text>
          {during.map((line) => (
            <View key={line} className="flex-row gap-2 items-start">
              <Text className="text-brand-500 font-bold">•</Text>
              <Text className="flex-1 text-sm text-slate-800 leading-relaxed">{line}</Text>
            </View>
          ))}
        </View>

        <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <Text className="text-[11px] text-slate-500 leading-relaxed text-center">
            Add your own questions in your notes app. This list supports conversation — it
            does not replace your clinician&apos;s exam or advice.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
