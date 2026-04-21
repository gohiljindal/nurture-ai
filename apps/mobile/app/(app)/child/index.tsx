import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useChildren, useDeleteChild } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";

export default function ChildTabScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: children, isLoading } = useChildren();
  const { mutateAsync: deleteChild, isPending: deletingChild } = useDeleteChild();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const handleRemoveChild = (id: string, name: string) => {
    const message =
      "This permanently deletes their profile, checks, and history. This cannot be undone.";

    if (Platform.OS === "web") {
      const ok = globalThis.confirm?.(`Remove ${name}?\n\n${message}`) ?? false;
      if (!ok) return;
      void (async () => {
        try {
          await deleteChild(id);
        } catch (e) {
          globalThis.alert?.(`Could not remove: ${(e as Error).message}`);
        }
      })();
      return;
    }

    Alert.alert(`Remove ${name}?`, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteChild(id);
          } catch (e) {
            Alert.alert("Could not remove", (e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        contentContainerClassName="px-5 pt-8 pb-14 gap-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="text-[11px] font-semibold text-brand-500 tracking-widest uppercase">
            Family
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900 mt-1">Child</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Profiles, growth, and account — one place.
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 gap-3">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Your children
          </Text>
          {isLoading ? (
            <ActivityIndicator color={BRAND_PRIMARY_HEX} />
          ) : (children?.length ?? 0) === 0 ? (
            <Text className="text-sm text-slate-500">No children yet — add one from Home.</Text>
          ) : (
            <View className="gap-2">
              {children!.map((c) => (
                <View
                  key={c.id}
                  className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/(home)/child/[id]",
                        params: { id: c.id },
                      })
                    }
                    className="flex-1 pr-2 active:opacity-70"
                  >
                    <Text className="text-sm font-semibold text-slate-900">{c.name}</Text>
                  </Pressable>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => handleRemoveChild(c.id, c.name)}
                      disabled={deletingChild}
                      className="active:opacity-70"
                    >
                      <Text className="text-xs font-semibold text-red-600">Remove</Text>
                    </Pressable>
                    <Text className="text-slate-300">›</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          <Pressable
            onPress={() => router.push("/(app)/(home)")}
            className="mt-1 active:opacity-70"
          >
            <Text className="text-sm font-bold text-brand-600">Open home dashboard →</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/child/settings")}
          className="bg-white rounded-2xl border border-slate-100 p-4 flex-row justify-between items-center active:opacity-80"
        >
          <Text className="text-sm font-semibold text-slate-900">Settings & future features</Text>
          <Text className="text-slate-300">›</Text>
        </Pressable>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 gap-3">
          <View className="w-14 h-14 rounded-full bg-brand-100 items-center justify-center">
            <Text className="text-2xl font-extrabold text-brand-500">
              {email?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-semibold text-slate-900">{email ?? "—"}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Signed in</Text>
          </View>
        </View>

        <View>
          {loading ? (
            <ActivityIndicator color={BRAND_PRIMARY_HEX} />
          ) : (
            <Button
              label="Sign out"
              onPress={handleSignOut}
              variant="secondary"
            />
          )}
        </View>

        <Text className="text-xs text-center text-slate-400 px-4 leading-relaxed">
          Nurture AI gives general guidance only. It does not replace emergency
          services or your clinician.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
