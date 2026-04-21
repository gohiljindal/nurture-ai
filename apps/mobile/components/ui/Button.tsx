import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { Ionicons } from "@/lib/ionicons";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  onPress: () => void;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  /** Optional leading icon (Ionicons glyph name) */
  icon?: ComponentProps<typeof Ionicons>["name"];
};

export default function Button({
  onPress,
  label,
  loading = false,
  disabled = false,
  variant = "primary",
  fullWidth = true,
  icon,
}: Props) {
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        className={`${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-55" : "active:opacity-92 active:scale-[0.99]"}`}
      >
        <LinearGradient
          colors={["#8b86f2", "#6366f1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            minHeight: 52,
            borderRadius: 9999,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            gap: 8,
            shadowColor: "#4338ca",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {icon ? (
                <Ionicons name={icon} size={20} color="#ffffff" />
              ) : null}
              <Text className="text-sm font-bold tracking-wide text-white">
                {label}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === "secondary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-full border border-border bg-white px-6 shadow-sm ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-55" : "active:opacity-90"}`}
      >
        {loading ? (
          <ActivityIndicator color={BRAND_PRIMARY_HEX} />
        ) : (
          <>
            {icon ? (
              <Ionicons name={icon} size={20} color={BRAND_PRIMARY_HEX} />
            ) : null}
            <Text className="text-sm font-bold text-ink-700">{label}</Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`min-h-12 flex-row items-center justify-center gap-1 rounded-full px-4 ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-55" : "active:opacity-80"}`}
    >
      <View className="flex-row items-center gap-1">
        {icon ? (
          <Ionicons name={icon} size={18} color={BRAND_PRIMARY_HEX} />
        ) : null}
        <Text className="text-sm font-bold text-brand-600">{label}</Text>
      </View>
    </Pressable>
  );
}
