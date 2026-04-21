import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useCreateChild, useUpdateChildPhoto } from "@/lib/hooks";
import { CHILD_PHOTOS_BUCKET, formatChildPhotoUploadErrorMessage } from "@/lib/photo-upload";
import { supabase } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEX_OPTIONS = ["Male", "Female"] as const;
type SexOption = (typeof SEX_OPTIONS)[number] | null;

function formatDOBInput(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function validateDOB(dob: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "Enter date as YYYY-MM-DD";
  const [y, m, d] = dob.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  if (date.getFullYear() !== y || date.getMonth() !== m! - 1 || date.getDate() !== d)
    return "Invalid date — check the month and day";
  if (date > new Date()) return "Date of birth can't be in the future";
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 7);
  if (date < cutoff) return "NurtureAI supports children aged 0 – 6 years";
  return null;
}

async function uploadChildPhoto(
  uri: string,
  childId: string
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const ext =
    uri.split(".").pop()?.split("?")[0]?.toLowerCase().split("#")[0] ?? "jpg";
  const path = `${session.user.id}/${childId}-${Date.now()}.${ext}`;

  const readPhotoMs = 60_000;
  const ac = new AbortController();
  const readTimer = setTimeout(() => ac.abort(), readPhotoMs);
  let response: Response;
  try {
    response = await fetch(uri, { signal: ac.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `Reading the photo timed out after ${readPhotoMs / 1000}s. Try a smaller image or pick again.`
      );
    }
    throw e;
  } finally {
    clearTimeout(readTimer);
  }

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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AddChildScreen() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<SexOption>(null);
  const [premature, setPremature] = useState(false);
  const [gestWeeks, setGestWeeks] = useState("");
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  /** Covers the whole save path (API + local photo read + storage + PATCH), not just each React Query mutation. */
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: createChild } = useCreateChild();
  const { mutateAsync: updatePhoto } = useUpdateChildPhoto();

  const busy = submitting;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Gallery permission required to add a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Child's name is required.");
      return;
    }
    const dobError = validateDOB(dob);
    if (dobError) {
      setError(dobError);
      return;
    }
    if (
      premature &&
      gestWeeks &&
      (Number(gestWeeks) < 20 || Number(gestWeeks) > 36)
    ) {
      setError("Gestational age should be between 20 and 36 weeks.");
      return;
    }

    setSubmitting(true);
    try {
      const { id: childId } = await createChild({
        name: name.trim(),
        photo_url: null,
        date_of_birth: dob,
        sex_at_birth: sex ? sex.toLowerCase() : null,
        is_premature: premature,
        gestational_age_weeks:
          premature && gestWeeks ? Number(gestWeeks) : null,
      });

      if (localPhotoUri) {
        const photoUrl = await uploadChildPhoto(localPhotoUri, childId);
        if (photoUrl) {
          await updatePhoto({ childId, photoUrl });
        }
      }

      // `router.back()` is often a no-op on web or when there is no history — looks like "nothing happened".
      router.replace("/(app)/(home)");
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Something went wrong. Try again.";
      setError(msg || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pt-6 pb-14 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View>
            <Pressable
              onPress={() => {
                if (Platform.OS === "web") {
                  router.replace("/(app)/(home)");
                  return;
                }
                if (router.canGoBack()) router.back();
                else router.replace("/(app)/(home)");
              }}
              className="active:opacity-60 self-start"
            >
              <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
            </Pressable>
            <Text className="text-2xl font-extrabold text-slate-900 mt-3">
              Add child
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Used to tailor symptom checks and age-based guidance.
            </Text>
          </View>

          {/* Photo picker */}
          <Pressable
            onPress={pickPhoto}
            disabled={busy}
            className="items-center gap-2 active:opacity-70"
          >
            <View className="w-24 h-24 rounded-full bg-brand-100 items-center justify-center overflow-hidden border-2 border-brand-200">
              {localPhotoUri ? (
                <Image
                  source={{ uri: localPhotoUri }}
                  className="w-full h-full"
                />
              ) : (
                <Text className="text-4xl">📷</Text>
              )}
            </View>
            <Text className="text-sm font-semibold text-brand-500">
              {localPhotoUri ? "Change photo" : "Add photo (optional)"}
            </Text>
          </Pressable>

          {/* Form card */}
          <View className="bg-white border border-slate-100 rounded-3xl p-5 gap-5 shadow-sm">
            {/* Name */}
            <Input
              label="Child's name"
              value={name}
              onChangeText={setName}
              placeholder="E.g. Emma"
              editable={!busy}
              returnKeyType="next"
            />

            {/* Date of birth */}
            <View className="gap-1.5">
              <Text className="text-sm font-semibold text-slate-700">
                Date of birth
              </Text>
              <Input
                value={dob}
                onChangeText={(t) => setDob(formatDOBInput(t))}
                placeholder="YYYY-MM-DD"
                keyboardType="number-pad"
                maxLength={10}
                editable={!busy}
              />
              <Text className="text-xs text-slate-400">
                Year – month – day, e.g. 2024-03-15
              </Text>
            </View>

            {/* Sex */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">
                Sex{" "}
                <Text className="text-slate-400 font-normal">(optional)</Text>
              </Text>
              <View className="flex-row gap-2">
                {SEX_OPTIONS.map((opt) => {
                  const selected = sex === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSex(selected ? null : opt)}
                      disabled={busy}
                      className={`flex-1 py-2.5 rounded-full border items-center active:opacity-70 ${
                        selected
                          ? "bg-brand-100 border-brand-400"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selected ? "text-brand-700" : "text-slate-500"
                        }`}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Premature */}
            <Pressable
              onPress={() => setPremature((v) => !v)}
              disabled={busy}
              className="flex-row items-center gap-3 active:opacity-70"
            >
              <View
                className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                  premature
                    ? "bg-brand-500 border-brand-500"
                    : "bg-white border-slate-300"
                }`}
              >
                {premature && (
                  <Text className="text-white text-xs font-extrabold">✓</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  Born premature
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  Before 37 weeks gestation
                </Text>
              </View>
            </Pressable>

            {/* Gestational age */}
            {premature && (
              <Input
                label="Gestational age at birth (weeks)"
                value={gestWeeks}
                onChangeText={setGestWeeks}
                placeholder="E.g. 34"
                keyboardType="number-pad"
                maxLength={2}
                editable={!busy}
              />
            )}
          </View>

          {/* Error */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Button
            label={busy ? "Saving…" : "Save child"}
            onPress={handleSubmit}
            loading={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
