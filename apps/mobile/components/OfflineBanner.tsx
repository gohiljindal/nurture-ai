import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Network from "expo-network";

import { recoverAfterReconnect } from "@/lib/offline-queue";

/**
 * Shows when the device has no connection; triggers recovery when back online (task 17).
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Network.getNetworkStateAsync().then((s) => {
      if (mounted) setOffline(s.isConnected === false);
    });
    const sub = Network.addNetworkStateListener((s) => {
      const isOff = s.isConnected === false;
      setOffline(isOff);
      if (!isOff) void recoverAfterReconnect();
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  if (!offline) return null;

  return (
    <View
      className="bg-amber-100 border-b border-amber-300 px-4 py-2"
      accessibilityRole="alert"
    >
      <Text className="text-center text-xs font-semibold text-amber-900">
        You are offline. Guidance needs a connection — we will sync when you are
        back online.
      </Text>
    </View>
  );
}
