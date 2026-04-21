import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useChildChecks, useUpdateChildChecks } from "@/lib/hooks";

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center justify-between py-3 border-b border-slate-100">
      <Text className="text-sm text-slate-800">{label}</Text>
      <View className={`w-12 h-7 rounded-full px-1 justify-center ${value ? "bg-brand-500" : "bg-slate-300"}`}>
        <View className={`w-5 h-5 rounded-full bg-white ${value ? "self-end" : "self-start"}`} />
      </View>
    </Pressable>
  );
}

export default function ChildChecksScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch } = useChildChecks(childId ?? "");
  const { mutateAsync: saveChecks, isPending } = useUpdateChildChecks(childId ?? "");
  const [notes, setNotes] = useState("");

  if (!childId) return <SafeAreaView className="flex-1 bg-page items-center justify-center"><Text>Missing child.</Text></SafeAreaView>;
  if (isLoading) return <SafeAreaView className="flex-1 bg-page items-center justify-center"><ActivityIndicator color={BRAND_PRIMARY_HEX} /></SafeAreaView>;
  if (error || !data) return <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-3"><Pressable onPress={() => router.back()}><Text className="text-sm font-semibold text-brand-500">‹ Back</Text></Pressable><Text>{(error as Error)?.message ?? "Could not load."}</Text><Pressable onPress={() => refetch()}><Text className="text-brand-600">Try again</Text></Pressable></SafeAreaView>;

  const flags = data.flags;

  const toggle = async (k: "dental_due" | "hearing_concern" | "vision_concern", v: boolean) => {
    await saveChecks({ [k]: v });
  };

  const saveNotes = async () => {
    await saveChecks({ notes });
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-12 gap-4">
        <Pressable onPress={() => router.back()}><Text className="text-sm font-semibold text-brand-500">‹ Back</Text></Pressable>
        <Text className="text-2xl font-extrabold text-slate-900">Dental / hearing / vision checks</Text>
        <Text className="text-sm text-slate-500">{data.child.name}</Text>
        <View className="bg-white border border-slate-100 rounded-2xl px-4">
          <ToggleRow label="Dental follow-up due" value={flags.dental_due} onToggle={() => toggle("dental_due", !flags.dental_due)} />
          <ToggleRow label="Hearing concern to review" value={flags.hearing_concern} onToggle={() => toggle("hearing_concern", !flags.hearing_concern)} />
          <ToggleRow label="Vision concern to review" value={flags.vision_concern} onToggle={() => toggle("vision_concern", !flags.vision_concern)} />
        </View>
        <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-2">
          <Text className="text-xs font-bold text-slate-400 uppercase">Notes for next visit</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={flags.notes ?? "Optional notes"}
            placeholderTextColor="#94a3b8"
            multiline
            className="min-h-24 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
          />
          <Pressable onPress={saveNotes} disabled={isPending} className="bg-brand-500 rounded-xl py-2.5 active:opacity-80">
            <Text className="text-white font-semibold text-center">{isPending ? "Saving..." : "Save notes"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
