import { Platform } from "react-native";
import { onlineManager } from "@tanstack/react-query";

/**
 * Keeps TanStack Query in sync with device connectivity (task 17).
 * Import once from the root layout (side effect).
 *
 * Skips during static web export / SSR where `window` is undefined — expo-network's
 * web implementation touches `window` at listener setup time.
 */
function setup() {
  if (Platform.OS === "web" && typeof window === "undefined") {
    return;
  }
  void import("expo-network").then((Network) => {
    onlineManager.setEventListener((setOnline) => {
      const sub = Network.addNetworkStateListener((state) => {
        setOnline(state.isConnected ?? false);
      });
      return () => sub.remove();
    });
  });
}

setup();
