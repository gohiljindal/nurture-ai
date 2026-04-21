import type { ReactNode } from "react";
import { Text, View } from "react-native";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-3">
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wide">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View className="gap-2">
      {items.map((line, i) => (
        <View key={i} className="flex-row gap-2 items-start">
          <Text className="text-brand-500 mt-0.5">•</Text>
          <Text className="flex-1 text-sm text-slate-700 leading-relaxed">{line}</Text>
        </View>
      ))}
    </View>
  );
}

function humanizeAllergen(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(
  s: "introduced" | "overdue" | "upcoming" | "too_early"
): string {
  switch (s) {
    case "introduced":
      return "Introduced";
    case "overdue":
      return "Discuss with clinician";
    case "upcoming":
      return "Coming up";
    case "too_early":
      return "Before usual window";
    default:
      return s;
  }
}

type FeedingGuidancePayload = Record<string, unknown>;

/**
 * Renders `/api/feeding/guidance/[childId]` JSON in readable sections (not raw keys).
 */
export function FeedingGuidanceContent({ data }: { data: FeedingGuidancePayload }) {
  const guidance = data.guidance as Record<string, unknown> | undefined;
  const current = data.current_stage as Record<string, unknown> | undefined;
  const solids = data.solids_readiness as Record<string, unknown> | undefined;
  const allergens = data.allergen_status as
    | Array<{
        allergen: string;
        status: "introduced" | "overdue" | "upcoming" | "too_early";
        recommended_at_months: number;
      }>
    | undefined;
  const stages = data.all_stages as Record<string, unknown>[] | undefined;
  const allergenChecklist = data.allergen_introduction_checklist as
    | Array<{ step: number; title: string; detail: string }>
    | undefined;

  return (
    <View className="gap-4">
      {current ? (
        <Section title="Current feeding stage">
          {typeof current.stage === "string" ? (
            <Text className="text-base font-bold text-slate-900">{current.stage}</Text>
          ) : null}
          {typeof current.age_range === "string" ? (
            <Text className="text-sm text-slate-500">{current.age_range}</Text>
          ) : null}
          {typeof current.texture === "string" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold text-slate-800">Texture: </Text>
              {current.texture}
            </Text>
          ) : null}
          {typeof current.description === "string" ? (
            <Text className="text-sm text-slate-700 leading-relaxed">{current.description}</Text>
          ) : null}
          {Array.isArray(current.example_foods) && current.example_foods.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">Example foods</Text>
              <Bullets items={current.example_foods.map(String)} />
            </View>
          ) : null}
          {Array.isArray(current.foods_to_avoid) && current.foods_to_avoid.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-amber-700 uppercase">Foods to avoid</Text>
              <Bullets items={current.foods_to_avoid.map(String)} />
            </View>
          ) : null}
          {typeof current.self_feeding_notes === "string" ? (
            <Text className="text-[11px] text-slate-500 italic border-l-2 border-brand-200 pl-2">
              {current.self_feeding_notes}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {guidance ? (
        <Section title="Guidance for this age">
          {typeof guidance.age_label === "string" ? (
            <Text className="text-xs font-semibold text-brand-600">{guidance.age_label}</Text>
          ) : null}
          {typeof guidance.primary_message === "string" ? (
            <Text className="text-sm text-slate-800 leading-relaxed">{guidance.primary_message}</Text>
          ) : null}
          {typeof guidance.frequency === "string" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold">Frequency: </Text>
              {guidance.frequency}
            </Text>
          ) : null}
          {typeof guidance.volume_or_duration === "string" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold">Amount / duration: </Text>
              {guidance.volume_or_duration}
            </Text>
          ) : null}
          {Array.isArray(guidance.what_is_normal) && guidance.what_is_normal.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">What is normal</Text>
              <Bullets items={guidance.what_is_normal.map(String)} />
            </View>
          ) : null}
          {Array.isArray(guidance.hunger_cues) && guidance.hunger_cues.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">Hunger cues</Text>
              <Bullets items={guidance.hunger_cues.map(String)} />
            </View>
          ) : null}
          {Array.isArray(guidance.fullness_cues) && guidance.fullness_cues.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">Fullness cues</Text>
              <Bullets items={guidance.fullness_cues.map(String)} />
            </View>
          ) : null}
          {Array.isArray(guidance.watch_for) && guidance.watch_for.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-amber-800 uppercase">Watch for</Text>
              <Bullets items={guidance.watch_for.map(String)} />
            </View>
          ) : null}
          {Array.isArray(guidance.tips) && guidance.tips.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">Tips</Text>
              <Bullets items={guidance.tips.map(String)} />
            </View>
          ) : null}
          {guidance.health_canada_note != null && String(guidance.health_canada_note).trim() !== "" ? (
            <Text className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2 mt-1">
              {String(guidance.health_canada_note)}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {solids ? (
        <Section title="Starting solids">
          {typeof solids.message === "string" ? (
            <Text className="text-sm text-slate-700 leading-relaxed">{solids.message}</Text>
          ) : null}
          {Array.isArray(solids.checklist) ? (
            <View className="gap-2">
              {solids.checklist.map((row: unknown, i: number) => {
                const r = row as { sign?: string; met?: boolean | null };
                const met =
                  r.met === true ? "✓" : r.met === false ? "○" : "—";
                return (
                  <View key={i} className="flex-row gap-2 items-start">
                    <Text className="text-sm text-slate-500 w-5">{met}</Text>
                    <Text className="flex-1 text-sm text-slate-700">{r.sign ?? ""}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Section>
      ) : null}

      {allergenChecklist && allergenChecklist.length > 0 ? (
        <Section title="Allergen introduction (checklist)">
          <Text className="text-[11px] text-slate-500 leading-relaxed mb-1">
            Education summary — align with your clinician for high-risk infants.
          </Text>
          <View className="gap-3">
            {allergenChecklist.map((item) => (
              <View key={item.step} className="gap-1">
                <Text className="text-sm font-bold text-slate-900">
                  {item.step}. {item.title}
                </Text>
                <Text className="text-xs text-slate-600 leading-relaxed">{item.detail}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {allergens && allergens.length > 0 ? (
        <Section title="Common allergens (introduction)">
          <View className="gap-2">
            {allergens.map((a) => (
              <View
                key={a.allergen}
                className="flex-row items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0"
              >
                <Text className="text-sm font-medium text-slate-800 flex-1">
                  {humanizeAllergen(a.allergen)}
                </Text>
                <View className="bg-slate-100 rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-slate-600">
                    {statusLabel(a.status)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text className="text-[11px] text-slate-400 leading-relaxed">
            Follow your clinician&apos;s advice for your child&apos;s situation.
          </Text>
        </Section>
      ) : null}

      {stages && stages.length > 0 ? (
        <Section title="All stages (overview)">
          <View className="gap-3">
            {stages.map((st, i) => (
              <View key={i} className="border-l-2 border-brand-200 pl-3 gap-1">
                {typeof st.stage === "string" ? (
                  <Text className="text-sm font-bold text-slate-900">{st.stage}</Text>
                ) : null}
                {typeof st.age_range === "string" ? (
                  <Text className="text-xs text-slate-500">{st.age_range}</Text>
                ) : null}
                {typeof st.description === "string" ? (
                  <Text className="text-xs text-slate-600 leading-relaxed" numberOfLines={4}>
                    {st.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}
