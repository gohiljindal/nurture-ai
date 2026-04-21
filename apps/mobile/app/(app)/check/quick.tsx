import { router } from "expo-router";
import { Pressable, SafeAreaView, Text, View } from "react-native";

import Button from "@/components/ui/Button";

/**
 * Short path into the standard symptom flow — same safety backend, less copy on the first screen.
 */
export default function QuickCheckIntro() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-5 pt-6 pb-10 gap-6 justify-center">
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>

        <View className="gap-2">
          <Text className="text-[11px] font-bold text-brand-500 tracking-widest uppercase">
            Quick check
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900">
            Fast path for common concerns
          </Text>
          <Text className="text-sm text-slate-600 leading-relaxed">
            You&apos;ll use the same symptom check flow with the same safety rules — we
            skip the long introduction so you can start faster.
          </Text>
        </View>

        <Button
          label="Continue to symptom check"
          onPress={() => router.replace("/(app)/check")}
        />

        <Text className="text-[11px] text-slate-400 text-center leading-relaxed">
          In an emergency, call your local emergency number. In Ontario, Health
          Connect Ontario (811) can help triage non-emergency concerns.
        </Text>
      </View>
    </SafeAreaView>
  );
}
