import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-50">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} />
      </View>
    );
  }

  return <Redirect href={hasSession ? "/(app)/(home)" : "/(auth)/login"} />;
}
