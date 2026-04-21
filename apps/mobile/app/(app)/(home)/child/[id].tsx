import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@/lib/ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";

import Button from "@/components/ui/Button";
import QuickActionTile from "@/components/ui/QuickActionTile";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import {
  useChildren,
  useDeleteChild,
  useTodayInsight,
  useUpdateChildPhoto,
  useUpdateChildProvince,
} from "@/lib/hooks";
import { CA_PROVINCES } from "@/lib/provinces";
import { calculateAgeInMonths, formatAgeLabel, formatDateLabel } from "@/lib/child-age";
import { CHILD_PHOTOS_BUCKET, formatChildPhotoUploadErrorMessage } from "@/lib/photo-upload";
import { supabase } from "@/lib/supabase";
import type { Child } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadChildPhoto(uri: string, childId: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const ext =
    uri.split(".").pop()?.split("?")[0]?.toLowerCase().split("#")[0] ?? "jpg";
  const path = `${session.user.id}/${childId}-${Date.now()}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(CHILD_PHOTOS_BUCKET)
    .upload(path, blob, { upsert: true });

  if (error) throw new Error(formatChildPhotoUploadErrorMessage(error.message));

  const { data: urlData } = supabase.storage
    .from(CHILD_PHOTOS_BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

function sexLabel(sex: string | null): string {
  if (!sex) return "—";
  const s = sex.trim().toLowerCase();
  if (s === "male") return "Male";
  if (s === "female") return "Female";
  return "—";
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Continue", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center border-b border-brand-100 py-3 last:border-0">
      <Text className="text-sm text-ink-500">{label}</Text>
      <Text className="text-sm font-semibold text-ink-900">{value}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChildDetailScreen() {
  const { width: winW } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: children, isLoading } = useChildren();
  const { data: todayInsight } = useTodayInsight(id);
  const { mutateAsync: deleteChild, isPending: deleting } = useDeleteChild();
  const { mutateAsync: updatePhoto, isPending: updatingPhoto } =
    useUpdateChildPhoto();
  const { mutateAsync: saveProvince, isPending: savingProvince } =
    useUpdateChildProvince();
  const [photoError, setPhotoError] = useState("");
  const [provinceOpen, setProvinceOpen] = useState(false);
  /** Measured width of the quick-actions row (matches ScrollView content, fixes tile math vs px-5) */
  const [quickGridWidth, setQuickGridWidth] = useState(0);

  const child: Child | undefined = children?.find((c) => c.id === id);
  const busy = deleting || updatingPhoto || savingProvince;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChangePhoto = async () => {
    setPhotoError("");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPhotoError("Gallery permission required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !id) return;

    try {
      const photoUrl = await uploadChildPhoto(result.assets[0].uri, id);
      await updatePhoto({ childId: id, photoUrl });
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  };

  const handleRemovePhoto = () => {
    void (async () => {
      const ok = await confirmAction("Remove photo?", "The profile photo will be removed.");
      if (!ok || !id) return;
      try {
        await updatePhoto({ childId: id, photoUrl: null });
      } catch (e) {
        showMessage("Could not remove photo", (e as Error).message);
      }
    })();
  };

  const handleDelete = () => {
    if (!child) return;
    void (async () => {
      const ok = await confirmAction(
      `Remove ${child.name}?`,
      "This permanently deletes their profile, checks, and history. This cannot be undone."
      );
      if (!ok) return;
      try {
        await deleteChild(child.id);
        if (router.canGoBack()) router.back();
        else router.replace("/(app)/(home)");
      } catch (e) {
        showMessage("Error", (e as Error).message);
      }
    })();
  };

  const openQuickAction = (target: Parameters<typeof router.push>[0]) => {
    try {
      router.push(target);
    } catch (e) {
      showMessage("Navigation error", (e as Error).message || "Could not open this feature.");
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="h-8 w-20 bg-slate-200 rounded-full" />
          <View className="bg-white border border-border rounded-3xl p-6 items-center gap-4 shadow-sm">
            <View className="w-24 h-24 rounded-full bg-slate-200" />
            <View className="h-6 w-40 bg-slate-200 rounded-lg" />
            <View className="h-4 w-28 bg-slate-100 rounded-lg" />
          </View>
          <View className="bg-white border border-border rounded-3xl p-5 gap-3">
            <View className="h-4 w-24 bg-slate-100 rounded-lg" />
            <View className="h-4 w-full bg-slate-100 rounded-lg" />
            <View className="h-4 w-5/6 bg-slate-100 rounded-lg" />
          </View>
          <View className="items-center pt-2">
            <ActivityIndicator color={BRAND_PRIMARY_HEX} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center px-5 gap-4">
        <Text className="text-base font-bold text-slate-900">Child not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const ageMonths = calculateAgeInMonths(child.date_of_birth);
  const initial = child.name[0]?.toUpperCase() ?? "?";

  const gridGap = 8;
  const gridCols = winW < 400 ? 2 : 3;
  const quickGridInnerW =
    quickGridWidth > 0 ? quickGridWidth : Math.max(0, winW - 40);
  const quickTileW = (quickGridInnerW - (gridCols - 1) * gridGap) / gridCols;

  const onQuickGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 0) return;
    setQuickGridWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  };

  const vaccinePreviewSub = child.province
    ? `${CA_PROVINCES.find((p) => p.code === child.province)?.label ?? child.province} schedule`
    : "Set province for local schedule";

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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Back */}
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(app)/(home)");
          }}
          className="active:opacity-60 self-start"
        >
          <Text className="text-sm font-semibold text-brand-500">‹ Home</Text>
        </Pressable>

        {/* Profile card */}
        <View className="items-center gap-3 rounded-[28px] border border-brand-100 bg-white p-6 shadow-sm">
          {/* Avatar */}
          <Pressable
            onPress={handleChangePhoto}
            disabled={busy}
            className="active:opacity-70"
          >
            <View className="w-24 h-24 rounded-full bg-brand-100 items-center justify-center overflow-hidden border-2 border-brand-200">
              {updatingPhoto ? (
                <ActivityIndicator color={BRAND_PRIMARY_HEX} />
              ) : child.photo_url ? (
                <Image
                  source={{ uri: child.photo_url }}
                  className="w-full h-full"
                />
              ) : (
                <Text className="text-4xl font-extrabold text-brand-500">
                  {initial}
                </Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-500">
              <Ionicons name="camera" size={14} color="#ffffff" />
            </View>
          </Pressable>

          {/* Remove photo link */}
          {child.photo_url && (
            <Pressable onPress={handleRemovePhoto} disabled={busy}>
              <Text className="text-xs text-slate-400">Remove photo</Text>
            </Pressable>
          )}

          {photoError ? (
            <Text className="text-xs text-red-500 text-center">{photoError}</Text>
          ) : null}

          {/* Name + age */}
          <View className="items-center gap-1">
            <Text className="text-2xl font-extrabold text-ink-900">
              {child.name}
            </Text>
            <Text className="text-sm text-ink-500">
              {formatAgeLabel(ageMonths)} old
            </Text>
            {child.is_premature && (
              <View className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mt-1">
                <Text className="text-xs font-semibold text-amber-700">
                  Premature
                </Text>
              </View>
            )}
          </View>
        </View>

        {todayInsight ? (
          <View className="gap-2 rounded-[28px] border border-brand-200 bg-brand-50 p-5 shadow-sm">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-brand-600">
              Today&apos;s insight
            </Text>
            <Text className="text-base font-extrabold text-ink-900">
              {todayInsight.insight.title}
            </Text>
            <Text className="text-sm text-ink-700 leading-relaxed">
              {todayInsight.insight.body}
            </Text>
            <Text className="text-[11px] text-ink-500">{todayInsight.insight.stage_label}</Text>
          </View>
        ) : null}

        {/* Info card */}
        <View className="rounded-[28px] border border-border bg-white px-4 shadow-sm">
          <InfoRow label="Date of birth" value={formatDateLabel(child.date_of_birth)} />
          <InfoRow label="Age" value={formatAgeLabel(ageMonths)} />
          <InfoRow label="Sex" value={sexLabel(child.sex_at_birth)} />
          {child.is_premature && (
            <InfoRow
              label="Gestational age"
              value={
                child.gestational_age_weeks
                  ? `${child.gestational_age_weeks} weeks`
                  : "Premature (weeks not set)"
              }
            />
          )}
          <Pressable
            onPress={() => setProvinceOpen(true)}
            className="flex-row justify-between items-center py-3 border-b border-border"
          >
            <Text className="text-sm text-ink-500">Province (immunizations)</Text>
            <Text className="text-sm font-semibold text-brand-600">
              {child.province ?? "Tap to set"} ›
            </Text>
          </Pressable>
        </View>

        {/* Actions — table-style grid: 2 cols (narrow) or 3 cols */}
        <View className="gap-2">
          <Text className="text-sm font-bold text-ink-900 mb-1">Quick actions</Text>

          <View
            className="w-full flex-row flex-wrap"
            onLayout={onQuickGridLayout}
            style={{
              gap: gridGap,
              rowGap: gridGap,
              alignItems: "stretch",
            }}
          >
            <QuickActionTile
              width={quickTileW}
              ionicon="medical"
              iconBgClass="bg-pastel-peach"
              iconColor="#ea580c"
              label="Check symptoms"
              sub="Get guidance on what you're seeing"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/check",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="time-outline"
              iconBgClass="bg-pastel-sky"
              iconColor="#2563eb"
              label="View history"
              sub="Past symptom checks"
              onPress={() => openQuickAction("/(app)/history")}
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="trending-up"
              iconBgClass="bg-pastel-mint"
              iconColor="#059669"
              label="What's normal now"
              sub={`Milestones at ${formatAgeLabel(ageMonths)}`}
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/milestones/[childId]",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="fitness"
              iconBgClass="bg-pastel-rose"
              iconColor="#db2777"
              label="Vaccine preview"
              sub={vaccinePreviewSub}
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/vaccines/[childId]",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="analytics"
              iconBgClass="bg-pastel-butter"
              iconColor="#ca8a04"
              label="Growth"
              sub="Weight, height, percentiles"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/growth/[childId]",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="nutrition"
              iconBgClass="bg-pastel-peach"
              iconColor="#ea580c"
              label="Feeding"
              sub="Solids, allergens, stage guidance"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/feeding/[childId]",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="moon"
              iconBgClass="bg-pastel-lilac"
              iconColor="#7c3aed"
              label="Sleep"
              sub="Expectations & safe sleep"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/sleep/[childId]",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="calendar"
              iconBgClass="bg-pastel-sky"
              iconColor="#2563eb"
              label="Visit prep"
              sub="Questions for the pediatrician"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/visit-prep/[childId]",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="happy"
              iconBgClass="bg-pastel-butter"
              iconColor="#ca8a04"
              label="Toddler behavior hub"
              sub="Tantrums, language, routines"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/toddler/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="water"
              iconBgClass="bg-pastel-sky"
              iconColor="#0891b2"
              label="Potty readiness"
              sub="Signs and starter checklist"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/potty/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="phone-portrait-outline"
              iconBgClass="bg-pastel-lilac"
              iconColor="#7c3aed"
              label="Screen time guidance"
              sub="AAP-aligned family plan"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/screen-time/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="people"
              iconBgClass="bg-pastel-mint"
              iconColor="#059669"
              label="Preschool social checklist"
              sub="Turn-taking and peer skills"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/preschool-social/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="ear"
              iconBgClass="bg-pastel-rose"
              iconColor="#db2777"
              label="Dental / hearing / vision"
              sub="Track follow-up flags"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/checks/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="school"
              iconBgClass="bg-pastel-butter"
              iconColor="#ca8a04"
              label="Grade 1 readiness"
              sub="Educational readiness snapshot"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/grade-readiness/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="book"
              iconBgClass="bg-pastel-lilac"
              iconColor="#7c3aed"
              label="IEP awareness"
              sub="Canada / US school support primer"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/iep-awareness/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
            <QuickActionTile
              width={quickTileW}
              ionicon="git-branch-outline"
              iconBgClass="bg-pastel-sky"
              iconColor="#2563eb"
              label="Timeline"
              sub="Cross-feature event history"
              onPress={() =>
                openQuickAction({
                  pathname: "/(app)/(home)/timeline/[childId]/index",
                  params: { childId: child.id },
                })
              }
            />
          </View>
        </View>

        {/* Delete */}
        <View className="mt-2">
          <Button
            label={deleting ? "Removing…" : `Remove ${child.name}`}
            onPress={handleDelete}
            loading={deleting}
            variant="secondary"
          />
        </View>
      </ScrollView>

      <Modal
        visible={provinceOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setProvinceOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setProvinceOpen(false)}
        >
          <Pressable
            className="bg-white rounded-t-3xl p-5 max-h-[70%]"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-slate-900 mb-3">
              Province / territory
            </Text>
            <FlatList
              data={[...CA_PROVINCES]}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  className="py-3 border-b border-slate-100 active:bg-slate-50"
                  onPress={async () => {
                    try {
                      await saveProvince({
                        childId: child.id,
                        province: item.code,
                      });
                      setProvinceOpen(false);
                    } catch (e) {
                      showMessage("Could not save", (e as Error).message);
                    }
                  }}
                >
                  <Text className="text-base text-slate-900">
                    {item.label} ({item.code})
                  </Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setProvinceOpen(false)} className="py-3 mt-2">
              <Text className="text-center text-brand-600 font-semibold">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
