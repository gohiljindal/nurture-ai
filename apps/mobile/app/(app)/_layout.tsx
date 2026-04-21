import { Ionicons } from "@/lib/ionicons";
import { router, Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import OfflineBanner from "@/components/OfflineBanner";
import { syncAppUser } from "@/lib/api";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { supabase } from "@/lib/supabase";

const TAB_ICONS: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  "(home)": "home",
  check: "search",
  history: "time",
  child: "person",
};

const TAB_A11Y: Record<string, string> = {
  "(home)": "Home tab",
  check: "Symptom check tab",
  history: "History tab",
  child: "Child profile tab",
};

export default function AppLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/(auth)/login");
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/(auth)/login");
      if (event === "SIGNED_IN") void syncAppUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} />
      </View>
    );
  }

  return (
    <>
      <OfflineBanner />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle:
            Platform.OS === "web"
              ? ({ height: "100%", overflowY: "auto" } as never)
              : undefined,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopColor: "#e9e4f5",
            paddingBottom: 10,
            paddingTop: 8,
            height: 72,
            elevation: 12,
            shadowColor: "#4338ca",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
          },
          tabBarActiveTintColor: BRAND_PRIMARY_HEX,
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
          tabBarIcon: ({ color, focused }) => {
            const bg = focused ? "#ede9fe" : "#f4f4f5";
            const name = TAB_ICONS[route.name] ?? "ellipse";
            return (
              <View
                accessibilityLabel={TAB_A11Y[route.name] ?? "Tab"}
                accessibilityRole="image"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={name} size={18} color={color} />
              </View>
            );
          },
        })}
      >
        <Tabs.Screen name="(home)" options={{ title: "Home" }} />
        <Tabs.Screen name="check" options={{ title: "Check" }} />
        <Tabs.Screen name="history" options={{ title: "History" }} />
        <Tabs.Screen name="child" options={{ title: "Child" }} />
      </Tabs>
    </>
  );
}
