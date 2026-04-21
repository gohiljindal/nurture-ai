import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useTimeline } from "@/lib/hooks";

export default function TimelineScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch } = useTimeline(childId ?? "");

  if (!childId) return <SafeAreaView className="flex-1 items-center justify-center"><Text>Missing child.</Text></SafeAreaView>;
  if (isLoading) return <SafeAreaView className="flex-1 items-center justify-center"><ActivityIndicator color={BRAND_PRIMARY_HEX} /></SafeAreaView>;
  if (error || !data) return <SafeAreaView className="flex-1 px-5 pt-6 gap-3"><Pressable onPress={() => router.back()}><Text className="text-brand-500">‹ Back</Text></Pressable><Text>{(error as Error)?.message ?? "Could not load timeline."}</Text><Pressable onPress={() => refetch()}><Text className="text-brand-600">Try again</Text></Pressable></SafeAreaView>;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-12 gap-4">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-2xl font-extrabold text-slate-900">Timeline</Text>
        <Text className="text-sm text-slate-500">{data.child.name}</Text>

        {data.events.map((e) => (
          <View key={e.id} className="bg-white border border-slate-100 rounded-2xl p-4 gap-1">
            <Text className="text-[11px] text-slate-400 uppercase">{e.kind}</Text>
            <Text className="text-sm font-semibold text-slate-900">{e.title}</Text>
            <Text className="text-xs text-slate-500">{new Date(e.date).toLocaleString("en-CA")}</Text>
            {e.detail ? <Text className="text-sm text-slate-700">{e.detail}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
