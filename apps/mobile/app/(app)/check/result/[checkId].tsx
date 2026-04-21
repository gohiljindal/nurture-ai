import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";

import Button from "@/components/ui/Button";
import CheckResultContent from "@/components/CheckResultContent";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useCheckDetail } from "@/lib/hooks";

export default function TriageResultScreen() {
  const { checkId } = useLocalSearchParams<{ checkId: string }>();
  const { data: check, isLoading, error } = useCheckDetail(checkId ?? "");

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-3">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading result…</Text>
      </SafeAreaView>
    );
  }

  if (error || !check) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5 gap-4">
        <Text className="text-4xl">⚠️</Text>
        <Text className="text-base font-bold text-slate-900 text-center">
          Could not load result
        </Text>
        <Text className="text-sm text-slate-500 text-center">
          {(error as Error)?.message ?? "Unknown error"}
        </Text>
        <View className="w-full mt-2">
          <Button
            label="Start new check"
            onPress={() => router.replace("/(app)/check")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <CheckResultContent
        check={check}
        onBack={() => router.back()}
        footer={
          <View className="gap-3">
            <Button
              label="Start another check"
              onPress={() => router.replace("/(app)/check")}
            />
            <Button
              label="Back to home"
              variant="secondary"
              onPress={() => router.replace("/(app)/(home)")}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}
