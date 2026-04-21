import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import AppCard from "@/components/ui/AppCard";
import Button from "@/components/ui/Button";
import FeatureTile from "@/components/ui/FeatureTile";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useChildren, useTodayInsight } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { calculateAgeInMonths, formatAgeLabel, formatDateLabel } from "@/lib/child-age";
import type { Child } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function firstNameFromEmail(email: string | null): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// ── Child card ────────────────────────────────────────────────────────────────

function ChildCard({ child }: { child: Child }) {
  const age = calculateAgeInMonths(child.date_of_birth);
  const initial = child.name[0]?.toUpperCase() ?? "?";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(app)/(home)/child/[id]",
          params: { id: child.id },
        })
      }
      className="bg-white border border-border rounded-[26px] px-4 py-4 flex-row items-center gap-4 active:opacity-80 shadow-sm"
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {/* Avatar */}
      <View className="w-14 h-14 rounded-full bg-brand-100 items-center justify-center overflow-hidden shrink-0 border border-brand-200">
        {child.photo_url ? (
          <Image
            source={{ uri: child.photo_url }}
            className="w-full h-full"
          />
        ) : (
          <Text className="text-2xl font-extrabold text-brand-500">
            {initial}
          </Text>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-ink-900">{child.name}</Text>
        <Text className="text-sm text-ink-500">
          {formatAgeLabel(age)} · Born {formatDateLabel(child.date_of_birth)}
        </Text>
        {child.is_premature && (
          <View className="mt-1 self-start bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-amber-700">
              Premature
            </Text>
          </View>
        )}
      </View>

      {/* Chevron */}
      <Text className="text-xl text-ink-300 font-semibold">›</Text>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const { data: children, isLoading, isError, error, refetch } = useChildren();
  const [refreshing, setRefreshing] = useState(false);
  const firstChildId = children?.[0]?.id;
  const {
    data: todayInsight,
    isFetching: insightLoading,
    refetch: refetchInsight,
  } = useTodayInsight(firstChildId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), firstChildId ? refetchInsight() : Promise.resolve()]);
    setRefreshing(false);
  };

  const insightChild = children?.find((c) => c.id === firstChildId);

  const name = firstNameFromEmail(email);
  const initial = name[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-10 gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_PRIMARY_HEX}
          />
        }
      >
        {/* ── Header ── */}
        <View className="bg-white border border-border rounded-[28px] px-4 py-4 shadow-sm">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-full bg-brand-100 border border-brand-200 items-center justify-center">
              <Text className="text-lg font-extrabold text-brand-500">
                {initial}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-ink-500 tracking-wide uppercase">{todayLabel()}</Text>
              <Text className="text-xl font-extrabold text-ink-900">
                {greeting()}{name ? `, ${name}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Today’s insight (first child) */}
        {firstChildId && insightChild && todayInsight && !insightLoading && (
          <AppCard
            onPress={() =>
              router.push({
                pathname: "/(app)/(home)/child/[id]",
                params: { id: firstChildId },
              })
            }
            className="gap-2"
            tone="brand"
          >
            <Text className="text-[11px] font-bold text-brand-500 tracking-widest uppercase">
              Today&apos;s insight · {insightChild.name}
            </Text>
            <Text className="text-base font-extrabold text-ink-900 leading-snug">
              {todayInsight.insight.title}
            </Text>
            <Text className="text-sm text-ink-700 leading-relaxed" numberOfLines={4}>
              {todayInsight.insight.body}
            </Text>
            <Text className="text-sm font-semibold text-brand-600 mt-1">
              Open profile →
            </Text>
          </AppCard>
        )}

        {/* ── Hero card ── */}
        <AppCard className="gap-3" tone="brand">
          <Text className="text-base font-extrabold leading-snug text-ink-900">
            Your parenting hub
          </Text>
          <Text className="text-sm leading-relaxed text-ink-500">
            Age-tailored guidance, safety-first symptom checks, and milestone
            tracking — all in one calm place.
          </Text>
          <Button
            icon="pulse"
            label="Quick symptom check"
            onPress={() => router.push("/(app)/check/quick")}
          />
        </AppCard>

        {/* Pastel activity grid (first child) */}
        {firstChildId ? (
          <View className="gap-3">
            <Text className="text-base font-bold text-ink-900">Activity hub</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <FeatureTile
                title="Sleep"
                icon="moon"
                tileClassName="bg-pastel-peach"
                iconColor="#7c3aed"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(home)/sleep/[childId]",
                    params: { childId: firstChildId },
                  })
                }
              />
              <FeatureTile
                title="Feeding"
                icon="nutrition"
                tileClassName="bg-pastel-butter"
                iconColor="#ea580c"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(home)/feeding/[childId]",
                    params: { childId: firstChildId },
                  })
                }
              />
              <FeatureTile
                title="Growth"
                icon="analytics"
                tileClassName="bg-pastel-mint"
                iconColor="#059669"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(home)/growth/[childId]",
                    params: { childId: firstChildId },
                  })
                }
              />
              <FeatureTile
                title="Vaccines"
                icon="shield-checkmark"
                tileClassName="bg-pastel-lilac"
                iconColor="#6366f1"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/(home)/vaccines/[childId]",
                    params: { childId: firstChildId },
                  })
                }
              />
            </View>
          </View>
        ) : null}

        {/* ── Children section ── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-ink-900">
              Your Children
            </Text>
            <Pressable
              onPress={() => router.push("/(app)/(home)/child/add")}
              className="bg-white border border-border rounded-full px-3.5 py-1.5 active:opacity-60"
            >
              <Text className="text-sm font-semibold text-brand-500">
                + Add
              </Text>
            </Pressable>
          </View>

          {/* Loading */}
          {isLoading && (
            <View className="py-8 items-center">
              <ActivityIndicator color={BRAND_PRIMARY_HEX} />
            </View>
          )}

          {/* Error */}
          {isError && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <Text className="text-sm font-semibold text-red-700">
                Could not load children
              </Text>
              <Text className="text-xs text-red-500 mt-1">
                {(error as Error).message}
              </Text>
            </View>
          )}

          {/* Empty state */}
          {!isLoading && !isError && children?.length === 0 && (
            <View className="bg-white border border-border rounded-[28px] p-6 items-center gap-4 shadow-sm">
              <Text className="text-4xl">👶</Text>
              <View className="items-center gap-1">
                <Text className="text-base font-bold text-slate-900">
                  No children yet
                </Text>
                <Text className="text-sm text-slate-500 text-center leading-relaxed">
                  Add your child so symptom checks and age-based guidance
                  can be personalised.
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(app)/(home)/child/add")}
                className="bg-brand-600 border border-brand-700 rounded-full py-3.5 px-8 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-white">
                  Add your first child
                </Text>
              </Pressable>
            </View>
          )}

          {/* Child list */}
          {!isLoading && !isError && children && children.length > 0 && (
            <View className="gap-3">
              {children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
              <Pressable
                onPress={() => router.push("/(app)/(home)/child/add")}
                className="border border-border bg-white rounded-2xl py-3.5 items-center active:opacity-60 shadow-sm"
              >
                <Text className="text-sm font-semibold text-slate-600">
                  + Add another child
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
