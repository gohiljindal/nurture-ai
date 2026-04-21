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

type SleepPayload = Record<string, unknown>;

/**
 * Renders `/api/sleep/guidance/[childId]` JSON in readable sections.
 */
export function SleepGuidanceContent({ data }: { data: SleepPayload }) {
  const exp = data.expectations as Record<string, unknown> | undefined;
  const nap = data.nap_schedule as Record<string, unknown> | undefined;
  const regression = data.current_regression as Record<string, unknown> | null | undefined;
  const isRegressionAge = data.is_regression_age === true;
  const checklistWrap = data.safe_sleep_checklist as
    | {
        items?: Array<Record<string, unknown>>;
        completed_codes?: string[];
      }
    | undefined;
  const summary = data.recent_summary as Record<string, unknown> | undefined;

  const completed = new Set(checklistWrap?.completed_codes ?? []);

  function fmtDurationMin(n: unknown): string {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "—";
    if (n === 0) return "0";
    const h = Math.floor(n / 60);
    const m = Math.round(n % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  return (
    <View className="gap-4">
      {isRegressionAge ? (
        <View className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3">
          <Text className="text-sm font-bold text-sky-900">Typical sleep regression window</Text>
          <Text className="text-xs text-sky-800 mt-1 leading-relaxed">
            Many babies shift sleep patterns around this age. See below for ideas — you are
            not doing anything wrong.
          </Text>
        </View>
      ) : null}

      {exp ? (
        <Section title="What to expect">
          {typeof exp.age_label === "string" ? (
            <Text className="text-xs font-semibold text-brand-600">{exp.age_label}</Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            {typeof exp.total_hours_typical === "number" ? (
              <View className="bg-slate-50 rounded-xl px-3 py-2 min-w-[44%] flex-1">
                <Text className="text-lg font-extrabold text-slate-900">
                  {exp.total_hours_typical}h
                </Text>
                <Text className="text-[10px] text-slate-500 uppercase font-semibold">
                  Total sleep / 24h (typical)
                </Text>
              </View>
            ) : null}
            {typeof exp.nap_count_typical === "number" ? (
              <View className="bg-slate-50 rounded-xl px-3 py-2 min-w-[44%] flex-1">
                <Text className="text-lg font-extrabold text-slate-900">
                  {exp.nap_count_typical}
                </Text>
                <Text className="text-[10px] text-slate-500 uppercase font-semibold">
                  Naps (typical)
                </Text>
              </View>
            ) : null}
          </View>
          {typeof exp.night_sleep_hours === "number" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold">Night sleep (guide): </Text>
              ~{exp.night_sleep_hours} h
            </Text>
          ) : null}
          {typeof exp.wake_window_minutes_min === "number" &&
          typeof exp.wake_window_minutes_max === "number" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold">Wake windows: </Text>
              {exp.wake_window_minutes_min}–{exp.wake_window_minutes_max} minutes
            </Text>
          ) : null}
          {typeof exp.parent_tip === "string" ? (
            <Text className="text-sm text-slate-700 leading-relaxed border-l-2 border-brand-200 pl-2">
              {exp.parent_tip}
            </Text>
          ) : null}
          {Array.isArray(exp.what_is_normal) && exp.what_is_normal.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">What is normal</Text>
              <Bullets items={exp.what_is_normal.map(String)} />
            </View>
          ) : null}
          {Array.isArray(exp.common_challenges) && exp.common_challenges.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">Common challenges</Text>
              <Bullets items={exp.common_challenges.map(String)} />
            </View>
          ) : null}
          {exp.regression_risk === true && typeof exp.regression_note === "string" ? (
            <Text className="text-[11px] text-slate-500 italic">{exp.regression_note}</Text>
          ) : null}
        </Section>
      ) : null}

      {nap ? (
        <Section title="Naps & rhythm">
          {typeof nap.age_label === "string" ? (
            <Text className="text-xs text-slate-500">{nap.age_label}</Text>
          ) : null}
          {typeof nap.schedule_example === "string" ? (
            <Text className="text-sm text-slate-800 leading-relaxed">{nap.schedule_example}</Text>
          ) : null}
          {typeof nap.wake_windows === "string" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold">Wake windows: </Text>
              {nap.wake_windows}
            </Text>
          ) : null}
          {typeof nap.drop_signs === "string" ? (
            <Text className="text-sm text-slate-700">
              <Text className="font-semibold">When a nap may drop: </Text>
              {nap.drop_signs}
            </Text>
          ) : null}
          {nap.transition_note != null && String(nap.transition_note).trim() !== "" ? (
            <Text className="text-[11px] text-slate-500">{String(nap.transition_note)}</Text>
          ) : null}
        </Section>
      ) : null}

      {regression && typeof regression === "object" && regression !== null ? (
        <Section title="Sleep regression (this age)">
          {typeof regression.age_label === "string" ? (
            <Text className="text-sm font-bold text-slate-900">{regression.age_label}</Text>
          ) : null}
          {typeof regression.why_it_happens === "string" ? (
            <Text className="text-sm text-slate-700 leading-relaxed">{regression.why_it_happens}</Text>
          ) : null}
          {Array.isArray(regression.signs) && regression.signs.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-slate-500 uppercase">Signs</Text>
              <Bullets items={regression.signs.map(String)} />
            </View>
          ) : null}
          {Array.isArray(regression.what_helps) && regression.what_helps.length > 0 ? (
            <View className="gap-1">
              <Text className="text-xs font-bold text-green-800 uppercase">What can help</Text>
              <Bullets items={regression.what_helps.map(String)} />
            </View>
          ) : null}
          {typeof regression.what_doesnt_help === "string" ? (
            <Text className="text-[11px] text-slate-500 italic">{regression.what_doesnt_help}</Text>
          ) : null}
          {typeof regression.reassurance === "string" ? (
            <Text className="text-sm text-slate-600 border-t border-slate-100 pt-2">
              {regression.reassurance}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {checklistWrap?.items && checklistWrap.items.length > 0 ? (
        <Section title="Safe sleep checklist">
          <View className="gap-3">
            {checklistWrap.items.map((item, i) => {
              const code = typeof item.code === "string" ? item.code : String(i);
              const done = completed.has(code);
              return (
                <View key={code} className="gap-1">
                  <View className="flex-row gap-2 items-start">
                    <Text className="text-sm">{done ? "✓" : "○"}</Text>
                    <View className="flex-1">
                      {typeof item.title === "string" ? (
                        <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
                      ) : null}
                      {typeof item.description === "string" ? (
                        <Text className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      ) : null}

      {summary ? (
        <Section title="Recent sleep (logged, last ~3 days)">
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-slate-50 rounded-xl px-3 py-2 min-w-[30%] flex-1">
              <Text className="text-base font-extrabold text-slate-900">
                {fmtDurationMin(summary.total_sleep_minutes)}
              </Text>
              <Text className="text-[9px] text-slate-500 uppercase font-semibold">Total</Text>
            </View>
            <View className="bg-slate-50 rounded-xl px-3 py-2 min-w-[30%] flex-1">
              <Text className="text-base font-extrabold text-slate-900">
                {fmtDurationMin(summary.nap_minutes)}
              </Text>
              <Text className="text-[9px] text-slate-500 uppercase font-semibold">Naps</Text>
            </View>
            <View className="bg-slate-50 rounded-xl px-3 py-2 min-w-[30%] flex-1">
              <Text className="text-base font-extrabold text-slate-900">
                {typeof summary.nap_count === "number" ? String(summary.nap_count) : "—"}
              </Text>
              <Text className="text-[9px] text-slate-500 uppercase font-semibold">Nap count</Text>
            </View>
          </View>
          {summary.currently_sleeping === true ? (
            <Text className="text-xs text-brand-700 font-semibold">Currently sleeping (last log)</Text>
          ) : null}
        </Section>
      ) : null}
    </View>
  );
}
