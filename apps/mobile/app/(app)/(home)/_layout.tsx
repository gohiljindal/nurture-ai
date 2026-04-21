import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function HomeStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle:
          Platform.OS === "web"
            ? ({ height: "100%", overflowY: "auto" } as never)
            : undefined,
      }}
    />
  );
}
