import { useState } from "react";
import {
  ActivityIndicator,
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
import { supabase } from "../../lib/supabase";

type Mode = "sign_in" | "sign_up";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const reset = () => {
    setError("");
    setSuccessMsg("");
  };

  const switchMode = (next: Mode) => {
    reset();
    setMode(next);
  };

  const handleSignIn = async () => {
    reset();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    }
    // On success RootNavigator's onAuthStateChange handles navigation automatically
  };

  const handleSignUp = async () => {
    reset();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccessMsg("Account created. Please log in with your email and password.");
    setPassword("");
    setMode("sign_in");
  };

  const isSignIn = mode === "sign_in";

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
          {/* Branding */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>N</Text>
            </View>
            <Text style={styles.appName}>NurtureAI</Text>
            <Text style={styles.tagline}>Calmer decisions for your child's health</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.kicker}>{isSignIn ? "Welcome back" : "Get started"}</Text>
            <Text style={styles.heading}>{isSignIn ? "Log in" : "Create account"}</Text>

            {successMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignIn ? "Your password" : "At least 6 characters"}
                placeholderTextColor={THEME.textMuted}
                secureTextEntry
                textContentType={isSignIn ? "password" : "newPassword"}
                editable={!loading}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              disabled={loading}
              onPress={isSignIn ? handleSignIn : handleSignUp}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {isSignIn ? "Log in" : "Create account"}
                </Text>
              )}
            </PrimaryButton>

            {/* Mode toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.togglePrompt}>
                {isSignIn ? "No account? " : "Already have one? "}
              </Text>
              <Pressable onPress={() => switchMode(isSignIn ? "sign_up" : "sign_in")}>
                <Text style={styles.toggleLink}>
                  {isSignIn ? "Create one" : "Log in"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.page },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: "center",
  },
  brand: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { fontSize: 28, fontFamily: FONTS.extraBold, color: "#7c3aed" },
  appName: { fontSize: 24, fontFamily: FONTS.extraBold, color: THEME.textPrimary, marginBottom: 4 },
  tagline: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    shadowColor: "#1a2744",
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  kicker: { fontSize: 12, fontFamily: FONTS.semiBold, color: "#7c3aed", letterSpacing: 0.8, textTransform: "uppercase" },
  heading: { fontSize: 22, fontFamily: FONTS.extraBold, color: THEME.textPrimary, marginTop: -4 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: THEME.page,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: THEME.textPrimary,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 10,
  },
  errorText: { fontSize: 13, fontFamily: FONTS.regular, color: "#b91c1c" },
  successBox: {
    backgroundColor: "#f5f3ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    padding: 10,
  },
  successText: { fontSize: 13, fontFamily: FONTS.regular, color: "#5b21b6" },
  btnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },
  toggleRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  togglePrompt: { fontSize: 13, fontFamily: FONTS.regular, color: THEME.textSecondary },
  toggleLink: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#7c3aed" },
});
