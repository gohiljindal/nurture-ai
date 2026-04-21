import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// expo-secure-store is native-only. On web use localStorage in the browser; during
// static SSR (Node) there is no localStorage — use a tiny in-memory store so export/SSR does not crash.
function createWebAuthStorage() {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    return {
      getItem: (key: string): Promise<string | null> =>
        Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string): Promise<void> =>
        Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string): Promise<void> =>
        Promise.resolve(localStorage.removeItem(key)),
    };
  }
  const memory = new Map<string, string>();
  return {
    getItem: (key: string): Promise<string | null> =>
      Promise.resolve(memory.get(key) ?? null),
    setItem: (key: string, value: string): Promise<void> => {
      memory.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string): Promise<void> => {
      memory.delete(key);
      return Promise.resolve();
    },
  };
}

const storage =
  Platform.OS === "web"
    ? createWebAuthStorage()
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
