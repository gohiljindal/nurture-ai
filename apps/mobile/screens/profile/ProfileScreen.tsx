import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "../../components/PrimaryButton";
import { FONTS, THEME } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // RootNavigator's onAuthStateChange handles navigation back to LoginScreen
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>Profile</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {email ? email[0].toUpperCase() : "?"}
            </Text>
          </View>
          {email ? (
            <Text style={styles.email}>{email}</Text>
          ) : (
            <ActivityIndicator color="#7c3aed" />
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton disabled={loading} onPress={handleSignOut}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign out</Text>
            )}
          </PrimaryButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  header: { marginBottom: 28 },
  heading: { fontSize: 26, fontFamily: FONTS.extraBold, color: THEME.textPrimary },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    shadowColor: "#1a2744",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 30, fontFamily: FONTS.extraBold, color: "#7c3aed" },
  email: { fontSize: 15, fontFamily: FONTS.medium, color: THEME.textPrimary },
  actions: { gap: 12 },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
});
