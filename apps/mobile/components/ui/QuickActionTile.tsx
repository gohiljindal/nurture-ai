import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { Ionicons } from "@/lib/ionicons";

type Props = {
  ionicon: ComponentProps<typeof Ionicons>["name"];
  iconBgClass: string;
  iconColor: string;
  label: string;
  sub?: string;
  onPress: () => void;
  /** Column width so 2–3 tiles fill the row */
  width: number;
};

/**
 * Compact grid cell: icon on top, label + optional sub — for table-style quick actions.
 * Parent row should use alignItems: stretch so siblings in the same row share height.
 */
export default function QuickActionTile({
  ionicon,
  iconBgClass,
  iconColor,
  label,
  sub,
  onPress,
  width,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width, alignSelf: "stretch" }}
      className="rounded-2xl border border-border/90 bg-white p-2.5 active:opacity-90"
    >
      <View className="min-h-[104] flex-1 items-center justify-center">
        <View
          className={`mb-2 h-10 w-10 items-center justify-center rounded-xl ${iconBgClass}`}
        >
          <Ionicons name={ionicon} size={20} color={iconColor} />
        </View>
        <Text
          className="text-center text-[11px] font-bold leading-tight text-ink-900"
          numberOfLines={2}
        >
          {label}
        </Text>
        {sub ? (
          <Text
            className="mt-0.5 text-center text-[9px] leading-snug text-ink-500"
            numberOfLines={2}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
