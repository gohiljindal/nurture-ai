import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type Props = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  tone?: "default" | "brand" | "muted";
};

const BASE = "rounded-[28px] p-5 border";

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-card border-border shadow-sm",
  brand: "bg-brand-50 border-brand-100 shadow-sm",
  muted: "bg-slate-50 border-slate-200 shadow-sm",
};

export default function AppCard({
  children,
  className = "",
  onPress,
  tone = "default",
}: Props) {
  const toneClass = TONES[tone];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${BASE} ${toneClass} active:opacity-90 ${className}`}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View className={`${BASE} ${toneClass} ${className}`}>
      {children}
    </View>
  );
}
