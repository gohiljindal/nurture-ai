import { Ionicons } from "@/lib/ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isSignIn = mode === "signin";

  const validate = () => {
    if (!email.trim()) { setError("Email is required."); return false; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return false; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    setSuccessMsg("");
    if (!validate()) return;

    setLoading(true);

    if (isSignIn) {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      // onAuthStateChange in (app)/_layout.tsx handles the redirect + syncAppUser
      router.replace("/(app)/(home)");
    } else {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSuccessMsg(
        "Account created — check your email to confirm, then sign in."
      );
      setMode("signin");
      setPassword("");
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setMode(isSignIn ? "signup" : "signin");
    setError("");
    setSuccessMsg("");
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View className="mb-10 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl border border-brand-200 bg-brand-50 shadow-sm">
              <Ionicons name="heart" size={32} color={BRAND_PRIMARY_HEX} />
            </View>
            <Text className="text-2xl font-extrabold tracking-tight text-ink-900">
              NurtureAI
            </Text>
            <Text className="mt-1 text-sm text-ink-500">
              Warm, calm guidance for your little one
            </Text>
          </View>

          {/* Form card */}
          <View className="gap-5 rounded-[28px] border border-brand-100 bg-white p-6 shadow-sm">
            <View>
              <Text className="text-xl font-bold text-slate-900">
                {isSignIn ? "Welcome back" : "Create your account"}
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                {isSignIn
                  ? "Sign in to continue."
                  : "Get started — it takes 30 seconds."}
              </Text>
            </View>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              returnKeyType="next"
              editable={!loading}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder={isSignIn ? "Your password" : "At least 6 characters"}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />

            {/* Error */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            {/* Success */}
            {successMsg ? (
              <View className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <Text className="text-sm text-green-700">{successMsg}</Text>
              </View>
            ) : null}

            <Button
              label={isSignIn ? "Sign in" : "Create account"}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>

          {/* Mode toggle */}
          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-sm text-ink-500">
              {isSignIn ? "New here?" : "Already have an account?"}
            </Text>
            <Pressable onPress={toggleMode} disabled={loading}>
              <Text className="text-sm font-bold text-brand-600">
                {isSignIn ? "Create account" : "Sign in"}
              </Text>
            </Pressable>
          </View>

          {/* Legal */}
          <Text className="text-xs text-center text-slate-400 mt-8 px-4 leading-relaxed">
            This app provides general guidance only. It does not replace a
            doctor, emergency services, or in-person care.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
