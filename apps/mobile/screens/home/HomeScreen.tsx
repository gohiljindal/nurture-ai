import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "../../components/PrimaryButton";
import { FONTS, THEME } from "../../constants/theme";
import { listChildren } from "../../lib/api";
import { calculateAgeInMonths, formatAgeLabel, formatDateLabel } from "../../lib/child-age";
import { supabase } from "../../lib/supabase";
import type { Child } from "../../lib/types";
import type { HomeStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeScreen">;

function todayLabel(): string {
  return new Date().toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function greetingFromEmail(email: string | null): string {
  if (!email) return "Hello";
  const name = email.split("@")[0] ?? "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function HomeScreen({ navigation }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError("");

    const [sessionRes, childRes] = await Promise.all([
      supabase.auth.getSession(),
      listChildren(),
    ]);

    setEmail(sessionRes.data.session?.user?.email ?? null);

    if (childRes.ok) {
      setChildren(childRes.data.children);
    } else {
      setError(childRes.error);
    }

    if (!isRefresh) setLoading(false);
    else setRefreshing(false);
  }, []);

  // Reload every time screen comes into focus (e.g. after adding a child)
  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadAll(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {email ? email[0].toUpperCase() : "?"}
              </Text>
            </View>
            <View>
              <Text style={styles.dateText}>{todayLabel()}</Text>
              <Text style={styles.nameText}>{greetingFromEmail(email)}</Text>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your Parenting Journey,{"\n"}Step by Step</Text>
          <Text style={styles.heroSub}>
            Age-tailored guidance, safety-first symptom checks, and milestones
            — all in one place.
          </Text>
        </View>

        {/* Children section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Children</Text>
          <Pressable onPress={() => navigation.navigate("AddChild")}>
            <Text style={styles.seeAll}>+ Add</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No children yet</Text>
            <Text style={styles.emptySub}>
              Add your child so symptom checks and age-based guidance can be
              personalised.
            </Text>
            <View style={styles.emptyAction}>
              <PrimaryButton onPress={() => navigation.navigate("AddChild")}>
                <Text style={styles.btnText}>👶 Add child</Text>
              </PrimaryButton>
            </View>
          </View>
        ) : (
          <View style={styles.childList}>
            {children.map((child) => {
              const ageMonths = calculateAgeInMonths(child.date_of_birth);
              return (
                <Pressable
                  key={child.id}
                  style={({ pressed }) => [
                    styles.childRow,
                    pressed && styles.childRowPressed,
                  ]}
                  onPress={() => navigation.navigate("ChildDetail", { child })}
                >
                  <View style={styles.childAvatar}>
                    {child.photo_url ? (
                      <Image
                        source={{ uri: child.photo_url }}
                        style={styles.childAvatarImage}
                      />
                    ) : (
                      <Text style={styles.childAvatarText}>
                        {child.name[0]?.toUpperCase() ?? "?"}
                      </Text>
                    )}
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childMeta}>
                      {formatAgeLabel(ageMonths)} · Born {formatDateLabel(child.date_of_birth)}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
            <View style={{ marginTop: 8 }}>
              <PrimaryButton onPress={() => navigation.navigate("AddChild")}>
                <Text style={styles.btnText}>👶 Add another child</Text>
              </PrimaryButton>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#ede9fe",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: FONTS.bold, color: "#7c3aed" },
  dateText: { fontSize: 12, fontFamily: FONTS.regular, color: THEME.textMuted },
  nameText: { fontSize: 20, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  hero: {
    backgroundColor: "#f5f3ff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  heroTitle: {
    fontSize: 18, fontFamily: FONTS.extraBold, color: THEME.textPrimary,
    marginBottom: 8,
  },
  heroSub: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 20 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.bold, color: THEME.textPrimary },
  seeAll: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#7c3aed" },
  center: { paddingVertical: 40, alignItems: "center" },
  errorBox: {
    backgroundColor: "#fef2f2", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#fecaca",
  },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, color: "#b91c1c" },
  emptyCard: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 22,
    borderWidth: 1, borderColor: THEME.borderSoft, gap: 10,
    shadowColor: "#1a2744", shadowOpacity: 0.05,
    shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.bold, color: THEME.textPrimary },
  emptySub: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, lineHeight: 20 },
  emptyAction: { marginTop: 4 },
  childList: { gap: 10 },
  childRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: THEME.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: THEME.borderSoft,
    shadowColor: "#1a2744", shadowOpacity: 0.05,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  childRowPressed: { opacity: 0.85 },
  childAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#ede9fe",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  childAvatarImage: { width: "100%", height: "100%" },
  childAvatarText: { fontSize: 20, fontFamily: FONTS.bold, color: "#7c3aed" },
  childInfo: { flex: 1, gap: 2 },
  childName: { fontSize: 15, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  childMeta: { fontSize: 12, fontFamily: FONTS.regular, color: THEME.textSecondary },
  chevron: { fontSize: 20, color: THEME.textMuted, fontFamily: FONTS.regular },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
});
