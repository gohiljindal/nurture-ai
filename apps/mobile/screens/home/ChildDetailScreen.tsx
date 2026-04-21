import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "../../components/PrimaryButton";
import { FONTS, THEME } from "../../constants/theme";
import { deleteChild, updateChildPhoto } from "../../lib/api";
import { calculateAgeInMonths, formatAgeLabel, formatDateLabel } from "../../lib/child-age";
import { supabase } from "../../lib/supabase";
import type { Child } from "../../lib/types";
import type { HomeStackParamList } from "../../navigation/types";
import {
  CHILD_PHOTOS_BUCKET,
  formatChildPhotoUploadErrorMessage,
} from "../../lib/photo-upload";

type Props = NativeStackScreenProps<HomeStackParamList, "ChildDetail">;

export default function ChildDetailScreen({ route, navigation }: Props) {
  const [child, setChild] = useState<Child>(route.params.child);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ageMonths = calculateAgeInMonths(child.date_of_birth);

  // ── Photo ──────────────────────────────────────────────────────────────────

  const pickAndUploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Gallery permission required.");
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
      if (!session) { setError("Not authenticated."); return; }

      const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const path = `${session.user.id}/child-${Date.now()}.${safeExt}`;

      const blob = await fetch(uri).then((r) => r.blob());
      const { error: uploadErr } = await supabase.storage
        .from(CHILD_PHOTOS_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadErr) { setError(formatChildPhotoUploadErrorMessage(uploadErr.message)); return; }

      const { data: { publicUrl } } = supabase.storage.from(CHILD_PHOTOS_BUCKET).getPublicUrl(path);

      const patchRes = await updateChildPhoto(child.id, publicUrl);
      if (!patchRes.ok) { setError(patchRes.error); return; }

      setChild((c) => ({ ...c, photo_url: publicUrl }));
    } catch {
      setError("Photo upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setBusy(true);
    setError("");
    const res = await updateChildPhoto(child.id, null);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setChild((c) => ({ ...c, photo_url: null }));
  };

  // ── Delete child ───────────────────────────────────────────────────────────

  const handleDelete = () => {
    Alert.alert(
      "Remove child",
      `Remove ${child.name}? This will also delete all symptom checks and records for this child.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const res = await deleteChild(child.id);
            setBusy(false);
            if (!res.ok) { setError(res.error); return; }
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ── Navigate to Check tab ──────────────────────────────────────────────────

  const goToSymptomCheck = () => {
    // Navigate from inside HomeStack → parent tab navigator → Check tab
    navigation
      .getParent()
      ?.navigate("Check", {
        screen: "SymptomInput",
        params: { childId: child.id },
      } as never);
  };

  const goToHistory = () => {
    navigation.getParent()?.navigate("History" as never);
  };

  const isBusy = busy || uploading;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>‹ Back</Text>
          </Pressable>
        </View>

        {/* Photo + name */}
        <View style={styles.profileCard}>
          <Pressable
            style={[styles.photoWrap, isBusy && { opacity: 0.6 }]}
            onPress={pickAndUploadPhoto}
            disabled={isBusy}
          >
            {uploading ? (
              <ActivityIndicator color="#7c3aed" />
            ) : child.photo_url ? (
              <Image source={{ uri: child.photo_url }} style={styles.photo} />
            ) : (
              <Text style={styles.photoInitial}>
                {child.name[0]?.toUpperCase() ?? "?"}
              </Text>
            )}
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>📷</Text>
            </View>
          </Pressable>

          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.ageLabel}>{formatAgeLabel(ageMonths)}</Text>

          {child.photo_url ? (
            <Pressable
              style={styles.removePhotoPill}
              onPress={handleRemovePhoto}
              disabled={isBusy}
            >
              <Text style={styles.removePhotoText}>Remove photo</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <InfoRow label="Date of birth" value={formatDateLabel(child.date_of_birth)} />
          <InfoRow label="Age" value={formatAgeLabel(ageMonths)} />
          {child.sex_at_birth ? (
            <InfoRow
              label="Sex at birth"
              value={
                child.sex_at_birth === "male"
                  ? "Male"
                  : child.sex_at_birth === "female"
                  ? "Female"
                  : "Prefer not to say"
              }
            />
          ) : null}
          <InfoRow label="Premature" value={child.is_premature ? "Yes" : "No"} />
          {child.is_premature && child.gestational_age_weeks != null ? (
            <InfoRow
              label="Gestational age"
              value={`${child.gestational_age_weeks} weeks`}
            />
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton disabled={isBusy} onPress={goToSymptomCheck}>
            <Text style={styles.btnText}>🔍 Check symptoms for {child.name}</Text>
          </PrimaryButton>

          <Pressable
            style={[styles.secondaryBtn, isBusy && { opacity: 0.55 }]}
            onPress={goToHistory}
            disabled={isBusy}
          >
            <Text style={styles.secondaryBtnText}>📋 View history</Text>
          </Pressable>

          <View style={styles.rowBtns}>
            <Pressable
              style={[styles.halfBtn, isBusy && { opacity: 0.55 }]}
              onPress={() =>
                navigation.navigate("Milestones", {
                  childId: child.id,
                  childName: child.name,
                })
              }
              disabled={isBusy}
            >
              <Text style={styles.halfBtnText}>🧠 What's normal</Text>
            </Pressable>
            <Pressable
              style={[styles.halfBtn, isBusy && { opacity: 0.55 }]}
              onPress={() =>
                navigation.navigate("Vaccines", {
                  childId: child.id,
                  childName: child.name,
                })
              }
              disabled={isBusy}
            >
              <Text style={styles.halfBtnText}>💉 Vaccines</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <Pressable
            style={[styles.deleteBtn, isBusy && { opacity: 0.55 }]}
            onPress={handleDelete}
            disabled={isBusy}
          >
            {busy ? (
              <ActivityIndicator color="#b91c1c" />
            ) : (
              <Text style={styles.deleteBtnText}>🗑 Remove {child.name}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: THEME.borderSoft,
  },
  label: { fontSize: 13, fontFamily: FONTS.medium, color: THEME.textSecondary },
  value: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 },
  topRow: { marginBottom: 16 },
  backLink: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  profileCard: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 22,
    alignItems: "center", gap: 8, marginBottom: 16,
    borderWidth: 1, borderColor: THEME.borderSoft,
    shadowColor: "#1a2744", shadowOpacity: 0.06,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  photoWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#ede9fe", alignItems: "center",
    justifyContent: "center", overflow: "hidden", marginBottom: 4,
  },
  photo: { width: "100%", height: "100%" },
  photoInitial: { fontSize: 36, fontFamily: FONTS.extraBold, color: "#7c3aed" },
  photoBadge: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: THEME.card, borderRadius: 12,
    width: 24, height: 24, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  photoBadgeText: { fontSize: 12 },
  childName: { fontSize: 22, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  ageLabel: { fontSize: 14, fontFamily: FONTS.regular, color: THEME.textSecondary },
  removePhotoPill: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  removePhotoText: { fontSize: 12, fontFamily: FONTS.medium, color: THEME.textSecondary },
  infoCard: {
    backgroundColor: THEME.card, borderRadius: 18, paddingHorizontal: 16,
    marginBottom: 16, borderWidth: 1, borderColor: THEME.borderSoft,
  },
  actions: { gap: 10, marginBottom: 16 },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
  secondaryBtn: {
    borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 999,
    paddingVertical: 14, alignItems: "center", backgroundColor: THEME.card,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  rowBtns: { flexDirection: "row", gap: 10 },
  halfBtn: {
    flex: 1, borderWidth: 1, borderColor: THEME.borderSoft, borderRadius: 14,
    paddingVertical: 13, alignItems: "center", backgroundColor: THEME.card,
  },
  halfBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  errorBox: {
    backgroundColor: "#fef2f2", borderRadius: 12, borderWidth: 1,
    borderColor: "#fecaca", padding: 10, marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, color: "#b91c1c" },
  dangerZone: { marginTop: 8 },
  deleteBtn: {
    borderWidth: 1, borderColor: "#fecaca", borderRadius: 14,
    paddingVertical: 13, alignItems: "center", backgroundColor: "#fef2f2",
  },
  deleteBtnText: { fontSize: 13, fontFamily: FONTS.medium, color: "#b91c1c" },
});
