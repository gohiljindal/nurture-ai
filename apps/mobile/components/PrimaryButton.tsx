import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";

import { GRADIENT } from "../constants/theme";

export default function PrimaryButton({
  children,
  disabled,
  onPress,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={({ pressed }) => [
        styles.outer,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.92 },
      ]}
    >
      <LinearGradient
        colors={[GRADIENT.start, GRADIENT.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#5b21b6",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  gradient: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
