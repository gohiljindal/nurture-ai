import * as Network from "expo-network";
import { onlineManager } from "@tanstack/react-query";

/**
 * Keeps TanStack Query in sync with device connectivity (task 17).
 * Import once from the root layout (side effect).
 */
onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected ?? false);
  });
  return () => sub.remove();
});
