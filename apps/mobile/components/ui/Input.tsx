import { Text, TextInput, View, type TextInputProps } from "react-native";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, ...props }: Props) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-sm font-semibold text-ink-700">{label}</Text>
      ) : null}
      <TextInput
        className={`rounded-2xl min-h-12 border bg-white px-4 py-3 text-sm text-ink-900 ${
          error ? "border-red-300" : "border-brand-100"
        }`}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
