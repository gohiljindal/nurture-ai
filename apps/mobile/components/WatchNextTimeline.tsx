import { Text, View } from "react-native";

type Props = {
  items: string[];
};

/**
 * Vertical timeline for structured `watch_next` bullets (task 23).
 */
export default function WatchNextTimeline({ items }: Props) {
  if (!items.length) return null;

  return (
    <View className="border-l-2 border-brand-200 ml-2 pl-4 gap-4">
      {items.map((line, i) => (
        <View key={i} className="relative">
          <View className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-white" />
          <Text className="text-sm text-slate-800 leading-relaxed">{line}</Text>
        </View>
      ))}
    </View>
  );
}
