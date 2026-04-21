import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { Ionicons } from "@/lib/ionicons";

type Props = {
  title: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  /** Tailwind bg class, e.g. bg-pastel-peach */
  tileClassName: string;
  iconColor: string;
  onPress: () => void;
};

/**
 * Large pastel tile with glass-style arrow button (reference: activity grid).
 */
export default function FeatureTile({
  title,
  icon,
  tileClassName,
  iconColor,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`relative min-h-[152] w-[48%] rounded-[26px] p-4 active:opacity-90 ${tileClassName}`}
    >
      <Text className="text-sm font-bold text-ink-900">{title}</Text>
      <View className="mt-3 flex-1 items-start justify-end">
        <Ionicons name={icon} size={40} color={iconColor} />
      </View>
      <View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/45">
        <Ionicons name="arrow-up" size={18} color="#4338ca" />
      </View>
    </Pressable>
  );
}
