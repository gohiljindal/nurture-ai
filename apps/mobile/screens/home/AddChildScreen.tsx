import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PrimaryButton from "../../components/PrimaryButton";
import { FONTS, THEME } from "../../constants/theme";
import { createChild } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import type { HomeStackParamList } from "../../navigation/types";
import {
  CHILD_PHOTOS_BUCKET,
  formatChildPhotoUploadErrorMessage,
} from "../../lib/photo-upload";

type Props = NativeStackScreenProps<HomeStackParamList, "AddChild">;

const SEX_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "prefer not to say" },
];

export default function AddChildScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState(""); // local preview URI
  const [photoUrl, setPhotoUrl] = useState(""); // uploaded Supabase URL
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [sex, setSex] = useState("");
  const [isPremature, setIsPremature] = useState(false);
  const [gestWeeks, setGestWeeks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Gallery permission is required to upload a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;

    setUploading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("You must be logged in to upload a photo.");
        return;
      }

      const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const path = `${session.user.id}/child-${Date.now()}.${safeExt}`;

      const blob = await fetch(uri).then((r) => r.blob());
      const { error: uploadErr } = await supabase.storage
        .from(CHILD_PHOTOS_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadErr) {
        setError(formatChildPhotoUploadErrorMessage(uploadErr.message));
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(CHILD_PHOTOS_BUCKET).getPublicUrl(path);

      setPhotoUri(uri);
      setPhotoUrl(publicUrl);
    } catch (e) {
      setError("Photo upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => {
    setPhotoUri("");
    setPhotoUrl("");
  };

  const handleSave = async () => {
    setError("");
    if (!name.trim()) {
      setError("Child name is required.");
      return;
    }
    if (!dob.trim()) {
      setError("Date of birth is required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setError("Date of birth must be in YYYY-MM-DD format.");
      return;
    }
    if (isPremature && gestWeeks && (Number(gestWeeks) < 20 || Number(gestWeeks) > 42)) {
      setError("Gestational age must be between 20 and 42 weeks.");
      return;
    }

    setSaving(true);
    const result = await createChild({
      name: name.trim(),
      photo_url: photoUrl || null,
      date_of_birth: dob.trim(),
      sex_at_birth: sex === "prefer not to say" ? null : sex || null,
      is_premature: isPremature,
      gestational_age_weeks:
        isPremature && gestWeeks ? Number(gestWeeks) : null,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigation.goBack();
  };

  const busy = saving || uploading;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backLink}>‹ Back</Text>
            </Pressable>
          </View>

          <Text style={styles.heading}>Add child</Text>
          <Text style={styles.subheading}>
            Age is used to tailor symptom checks, milestones, and guidance.
          </Text>

          <View style={styles.card}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Child name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Sofia"
                placeholderTextColor={THEME.textMuted}
                editable={!busy}
              />
            </View>

            {/* Photo */}
            <View style={styles.field}>
              <Text style={styles.label}>Photo (optional)</Text>
              {photoUri ? (
                <View style={styles.photoRow}>
                  <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                  <Pressable style={styles.removePill} onPress={clearPhoto}>
                    <Text style={styles.removePillText}>🗑 Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.photoBtn, busy && { opacity: 0.55 }]}
                  onPress={pickPhoto}
                  disabled={busy}
                >
                  {uploading ? (
                    <ActivityIndicator color="#7c3aed" />
                  ) : (
                    <Text style={styles.photoBtnText}>📷 Upload from gallery</Text>
                  )}
                </Pressable>
              )}
            </View>

            {/* DOB */}
            <View style={styles.field}>
              <Text style={styles.label}>Date of birth * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={setDob}
                placeholder="2024-03-15"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                editable={!busy}
              />
            </View>

            {/* Sex */}
            <View style={styles.field}>
              <Text style={styles.label}>Sex at birth</Text>
              <View style={styles.chipRow}>
                {SEX_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, sex === opt.value && styles.chipActive]}
                    onPress={() => setSex(sex === opt.value ? "" : opt.value)}
                    disabled={busy}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        sex === opt.value && styles.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Premature */}
            <Pressable
              style={styles.toggleRow}
              onPress={() => setIsPremature((v) => !v)}
              disabled={busy}
            >
              <View style={[styles.checkbox, isPremature && styles.checkboxActive]}>
                {isPremature && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>🍼 Baby was premature</Text>
            </Pressable>

            {isPremature && (
              <View style={styles.field}>
                <Text style={styles.label}>Gestational age at birth (weeks, 20–42)</Text>
                <TextInput
                  style={styles.input}
                  value={gestWeeks}
                  onChangeText={setGestWeeks}
                  placeholder="e.g. 32"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="number-pad"
                  editable={!busy}
                />
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton disabled={busy} onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>💾 Save child</Text>
              )}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 },
  topRow: { marginBottom: 16 },
  backLink: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  heading: {
    fontSize: 24, fontFamily: FONTS.extraBold,
    color: THEME.textPrimary, marginBottom: 6,
  },
  subheading: {
    fontSize: 13, fontFamily: FONTS.regular,
    color: THEME.textSecondary, lineHeight: 20, marginBottom: 20,
  },
  card: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 18, gap: 16,
    borderWidth: 1, borderColor: THEME.borderSoft,
    shadowColor: "#1a2744", shadowOpacity: 0.06,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  input: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: THEME.page, fontFamily: FONTS.regular,
    fontSize: 14, color: THEME.textPrimary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: THEME.page,
  },
  chipActive: { backgroundColor: "#ede9fe", borderColor: "#a78bfa" },
  chipText: { fontSize: 13, fontFamily: FONTS.medium, color: THEME.textSecondary },
  chipTextActive: { color: "#5b21b6", fontFamily: FONTS.semiBold },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  photoThumb: { width: 72, height: 72, borderRadius: 16, backgroundColor: THEME.blueMuted },
  removePill: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: THEME.page,
  },
  removePillText: { fontSize: 12, fontFamily: FONTS.medium, color: THEME.textSecondary },
  photoBtn: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 14,
    paddingVertical: 13, alignItems: "center", backgroundColor: THEME.page,
  },
  photoBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1, borderColor: THEME.borderSoft,
    backgroundColor: THEME.page, alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  checkmark: { color: "#fff", fontSize: 12, fontFamily: FONTS.bold },
  toggleLabel: { fontSize: 14, fontFamily: FONTS.medium, color: THEME.textPrimary },
  errorBox: {
    backgroundColor: "#fef2f2", borderRadius: 12,
    borderWidth: 1, borderColor: "#fecaca", padding: 10,
  },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, color: "#b91c1c" },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
});
