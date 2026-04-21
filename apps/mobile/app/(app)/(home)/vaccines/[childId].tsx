import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useVaccines } from "@/lib/hooks";
import type { VaccineTimelineItem, VaccinesResponse } from "@/lib/types";

function VaccineRow({ v, emphasis }: { v: VaccineTimelineItem; emphasis?: boolean }) {
  return (
    <View
      className={`rounded-2xl border p-4 gap-2 ${
        emphasis
          ? "bg-brand-50 border-brand-200"
          : "bg-white border-slate-100"
      }`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-sm font-bold text-slate-900">{v.shortName}</Text>
        {v.isOverdue && (
          <View className="bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-bold text-red-700">Overdue</Text>
          </View>
        )}
        {!v.isOverdue && v.administered && (
          <View className="bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-bold text-green-700">Done</Text>
          </View>
        )}
      </View>
      <Text className="text-xs text-slate-500">{v.name}</Text>
      {v.diseases.length > 0 && (
        <Text className="text-[11px] text-slate-400" numberOfLines={2}>
          Protects against: {v.diseases.join(", ")}
        </Text>
      )}
      <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-1">
        <Text className="text-[11px] text-slate-500">
          Due: {new Date(v.scheduledDate + "T12:00:00").toLocaleDateString("en-CA")}
        </Text>
        {v.administeredDate && (
          <Text className="text-[11px] text-green-700 font-semibold">
            Given: {v.administeredDate}
          </Text>
        )}
      </View>
      {v.notes ? (
        <Text className="text-[11px] text-slate-500 italic">{v.notes}</Text>
      ) : null}
    </View>
  );
}

export default function VaccinesScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch, isFetching } = useVaccines(childId ?? "");

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
        <Text className="text-sm text-slate-500">Loading schedule…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
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

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5 gap-2">
        <Text className="text-sm text-slate-500">No data returned.</Text>
        <Pressable onPress={() => refetch()}>
          <Text className="text-sm font-semibold text-brand-600">Refresh</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if ("requires_province" in data && data.requires_province) {
    return (
      <SafeAreaView
        className="flex-1 bg-page"
        style={
          Platform.OS === "web"
            ? ({ height: "100vh", overflowY: "auto" } as never)
            : undefined
        }
      >
        <ScrollView
          className="flex-1"
          style={Platform.OS === "web" ? ({ height: "100%", scrollBehavior: "smooth" } as never) : undefined}
          contentContainerClassName="px-5 pt-6 pb-14 gap-4"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Pressable onPress={() => router.back()} className="active:opacity-60 self-start">
            <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
          </Pressable>
          <Text className="text-2xl font-extrabold text-slate-900">Vaccine preview</Text>
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-5 gap-3">
            <Text className="text-sm font-bold text-amber-900">
              Province required
            </Text>
            <Text className="text-sm text-amber-800 leading-relaxed">
              The immunization schedule depends on where you live. Open{" "}
              {data.child.name}&apos;s profile (Home → child card), tap
              Province under their details, choose your province, then return here.
            </Text>
          </View>
          <Button label="Go back" variant="secondary" onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const v = data as VaccinesResponse;

  return (
    <SafeAreaView
      className="flex-1 bg-page"
      style={
        Platform.OS === "web"
          ? ({ height: "100vh", overflowY: "auto" } as never)
          : undefined
      }
    >
      <ScrollView
        className="flex-1"
        style={Platform.OS === "web" ? ({ height: "100%", scrollBehavior: "smooth" } as never) : undefined}
        contentContainerClassName="px-5 pt-6 pb-14 gap-5"
        contentContainerStyle={{ flexGrow: 1 }}
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
            Vaccines
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900">{v.child.name}</Text>
          <Text className="text-sm text-slate-500">
            {v.child.province_name} schedule · DOB{" "}
            {new Date(v.child.dob + "T12:00:00").toLocaleDateString("en-CA")}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
            <Text className="text-xl font-extrabold text-green-600">
              {v.stats.completion_pct}%
            </Text>
            <Text className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
              On track
            </Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
            <Text className="text-xl font-extrabold text-red-600">{v.stats.overdue}</Text>
            <Text className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
              Overdue
            </Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 items-center">
            <Text className="text-xl font-extrabold text-brand-600">
              {v.stats.upcoming_90_days}
            </Text>
            <Text className="text-[10px] text-slate-500 font-semibold uppercase mt-1">
              Next 90d
            </Text>
          </View>
        </View>

        {v.next_vaccine && !v.next_vaccine.administered && (
          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-900">Next due</Text>
            <VaccineRow v={v.next_vaccine} emphasis />
          </View>
        )}

        {v.overdue.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-bold text-red-800">Overdue</Text>
            {v.overdue.map((item) => (
              <VaccineRow key={item.code + item.scheduledDate} v={item} />
            ))}
          </View>
        )}

        {v.upcoming.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-900">Coming up (90 days)</Text>
            {v.upcoming.map((item) => (
              <VaccineRow key={item.code + item.scheduledDate} v={item} />
            ))}
          </View>
        )}

        <View className="gap-2">
          <Text className="text-sm font-bold text-slate-900">Full timeline</Text>
          {v.timeline.map((item) => (
            <VaccineRow key={item.code + item.scheduledDate} v={item} />
          ))}
        </View>

        <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 gap-3">
          <Text className="text-xs text-slate-600 leading-relaxed text-center">
            This is a planning view based on the public schedule. Confirm dates
            and vaccines with your doctor or public health.
          </Text>
          {v.province_info.schedule_url ? (
            <Pressable
              onPress={() => Linking.openURL(v.province_info.schedule_url)}
              className="active:opacity-70"
            >
              <Text className="text-sm font-bold text-brand-600 text-center">
                Official schedule →
              </Text>
            </Pressable>
          ) : null}
          {v.province_info.health_line ? (
            <Text className="text-[11px] text-slate-500 text-center">
              Health line: {v.province_info.health_line}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
