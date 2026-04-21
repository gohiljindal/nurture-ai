import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { Ionicons } from "@/lib/ionicons";

type Props = {
  ionicon: ComponentProps<typeof Ionicons>["name"];
  /** Tailwind classes for icon container background */
  iconBgClass: string;
  iconColor: string;
  label: string;
  sub?: string;
  onPress: () => void;
};

/**
 * Full-width row CTA with icon capsule + glass chevron (premium baby-app style).
 */
export default function IconActionRow({
  ionicon,
  iconBgClass,
  iconColor,
  label,
  sub,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-[22px] border border-border/90 bg-white p-4 shadow-sm active:opacity-90"
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-2xl ${iconBgClass}`}
      >
        <Ionicons name={ionicon} size={22} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold text-ink-900">{label}</Text>
        {sub ? (
          <Text className="mt-0.5 text-xs leading-relaxed text-ink-500">
            {sub}
          </Text>
        ) : null}
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-full border border-brand-200/80 bg-brand-50">
        <Ionicons name="chevron-forward" size={18} color={BRAND_PRIMARY_HEX} />
      </View>
    </Pressable>
  );
}
