import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useToddlerBehavior } from "@/lib/hooks";
import type { ParentingHubResponse } from "@/lib/types";

export default function ToddlerBehaviorScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch } = useToddlerBehavior(childId ?? "");

  if (!childId) return <SafeAreaView className="flex-1 bg-page items-center justify-center"><Text>Missing child.</Text></SafeAreaView>;
  if (isLoading) return <SafeAreaView className="flex-1 bg-page items-center justify-center"><ActivityIndicator color={BRAND_PRIMARY_HEX} /></SafeAreaView>;
  if (error || !data) return <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-3"><Pressable onPress={() => router.back()}><Text className="text-sm font-semibold text-brand-500">‹ Back</Text></Pressable><Text>{(error as Error)?.message ?? "Could not load."}</Text><Pressable onPress={() => refetch()}><Text className="text-brand-600">Try again</Text></Pressable></SafeAreaView>;

  const payload = data as ParentingHubResponse;
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-12 gap-4">
        <Pressable onPress={() => router.back()}><Text className="text-sm font-semibold text-brand-500">‹ Back</Text></Pressable>
        <View className="gap-1">
          <Text className="text-[11px] font-bold text-brand-500 tracking-widest uppercase">Toddler</Text>
          <Text className="text-2xl font-extrabold text-slate-900">{payload.title}</Text>
          <Text className="text-sm text-slate-500">{payload.child.name} · {payload.child.age_months} months</Text>
        </View>
        <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-2">
          <Text className="text-sm text-slate-700 leading-relaxed">{payload.summary}</Text>
          {payload.bullets.map((line) => (
            <View key={line} className="flex-row gap-2 items-start">
              <Text className="text-brand-500">•</Text>
              <Text className="flex-1 text-sm text-slate-700">{line}</Text>
            </View>
          ))}
        </View>
        <Text className="text-[11px] text-slate-400">{payload.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
