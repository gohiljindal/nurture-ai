import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-14 gap-5">
        <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-2xl font-extrabold text-slate-900">Settings</Text>
        <Text className="text-sm text-slate-500 leading-relaxed">
          Account-level options for NurtureAI on this device. Child-specific details stay on
          each child&apos;s profile.
        </Text>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-2">
          <Text className="text-sm font-bold text-slate-900">Health record export</Text>
          <Text className="text-sm text-slate-500 leading-relaxed">
            Planned: a printable PDF of growth, vaccines, and recent checks to share with
            your clinic. Not available yet.
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-2">
          <Text className="text-sm font-bold text-slate-900">Family mode</Text>
          <Text className="text-sm text-slate-500 leading-relaxed">
            Shared access for a partner or caregiver is planned. For now, each login is a
            single household account.
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 gap-2">
          <Text className="text-sm font-bold text-slate-900">Reminders</Text>
          <Text className="text-sm text-slate-500 leading-relaxed">
            Push reminders for vaccines and well-child visits will appear here once
            notifications are enabled for this app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
