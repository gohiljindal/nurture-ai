import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  GrowthMetricChart,
  type WhoBandSample,
} from "@/components/growth/GrowthMetricChart";
import Button from "@/components/ui/Button";
import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";
import { useAddGrowthMeasurement, useGrowth } from "@/lib/hooks";
import type { GrowthChartDataPoint, GrowthGetResponse } from "@/lib/types";

function fmtPct(p: unknown): string {
  if (typeof p === "number" && Number.isFinite(p)) return `${Math.round(p)}th`;
  if (p && typeof p === "object" && "percentile" in (p as object)) {
    const n = (p as { percentile?: number }).percentile;
    if (typeof n === "number") return `${Math.round(n)}th pct`;
  }
  return "—";
}

function fmtPctPlain(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n)}`;
}

function buildPercentileShareText(
  childName: string,
  rows: { measured_at: string; weight_percentile: number | null; height_percentile: number | null; head_percentile: number | null }[]
): string {
  const header = `Growth percentiles — ${childName}\n(WHO-based approximations)\n`;
  const lines = rows.map(
    (r) =>
      `${r.measured_at}\tWt ${fmtPctPlain(r.weight_percentile)}\tHt ${fmtPctPlain(
        r.height_percentile
      )}\tHC ${fmtPctPlain(r.head_percentile)}`
  );
  return `${header}\n${lines.join("\n")}`;
}

function chartSeries(
  rows: GrowthChartDataPoint[],
  key: "weight_kg" | "height_cm" | "head_cm"
): { age_months: number; value: number }[] {
  const out: { age_months: number; value: number }[] = [];
  for (const r of rows) {
    const v = r[key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (typeof r.age_months !== "number" || !Number.isFinite(r.age_months)) continue;
    out.push({ age_months: r.age_months, value: v });
  }
  out.sort((a, b) => a.age_months - b.age_months);
  return out;
}

function whoBandSamples(
  rows: GrowthChartDataPoint[],
  bandKey: "weight" | "length" | "head"
): WhoBandSample[] {
  const out: WhoBandSample[] = [];
  for (const r of rows) {
    const b = r.bands?.[bandKey];
    if (!b) continue;
    if (typeof r.age_months !== "number" || !Number.isFinite(r.age_months)) continue;
    if (
      ![b.p3, b.p15, b.p50, b.p85, b.p97].every(
        (x) => typeof x === "number" && Number.isFinite(x)
      )
    ) {
      continue;
    }
    out.push({
      age_months: r.age_months,
      p3: b.p3,
      p15: b.p15,
      p50: b.p50,
      p85: b.p85,
      p97: b.p97,
    });
  }
  out.sort((a, b) => a.age_months - b.age_months);
  return out;
}

type TrendMetric = "weight" | "height" | "head";

const TREND_LABELS: Record<TrendMetric, string> = {
  weight: "Weight",
  height: "Height",
  head: "Head",
};

function maxAgeMonths(chart: GrowthGetResponse["chart_data"]): number {
  let m = 0;
  for (const r of [...chart.weight, ...chart.height, ...chart.head]) {
    if (typeof r.age_months === "number" && Number.isFinite(r.age_months)) {
      m = Math.max(m, r.age_months);
    }
  }
  return m;
}

function growthTrendConfig(metric: TrendMetric, payload: GrowthGetResponse) {
  switch (metric) {
    case "weight":
      return {
        title: "Weight",
        unit: "kg",
        points: chartSeries(payload.chart_data.weight, "weight_kg"),
        whoBands: whoBandSamples(payload.chart_data.weight, "weight"),
      };
    case "height":
      return {
        title: "Length / height",
        unit: "cm",
        points: chartSeries(payload.chart_data.height, "height_cm"),
        whoBands: whoBandSamples(payload.chart_data.height, "length"),
      };
    case "head":
      return {
        title: "Head circumference",
        unit: "cm",
        points: chartSeries(payload.chart_data.head, "head_cm"),
        whoBands: whoBandSamples(payload.chart_data.head, "head"),
      };
  }
}

export default function GrowthScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data, isLoading, error, refetch, isFetching } = useGrowth(childId ?? "");
  const { mutateAsync: addMeasurement, isPending } = useAddGrowthMeasurement(
    childId ?? ""
  );

  const [measuredAt, setMeasuredAt] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [head, setHead] = useState("");
  const [formError, setFormError] = useState("");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight");
  const trendDefaultApplied = useRef(false);

  const submit = async () => {
    setFormError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredAt.trim())) {
      setFormError("Use YYYY-MM-DD for date.");
      return;
    }
    const w = weight.trim() ? Number(weight) : null;
    const h = height.trim() ? Number(height) : null;
    const hd = head.trim() ? Number(head) : null;
    if (w == null && h == null && hd == null) {
      setFormError("Enter at least one measurement.");
      return;
    }
    try {
      await addMeasurement({
        measured_at: measuredAt.trim(),
        weight_kg: w,
        height_cm: h,
        head_cm: hd,
        notes: null,
      });
      setMeasuredAt("");
      setWeight("");
      setHeight("");
      setHead("");
    } catch (e) {
      setFormError((e as Error).message);
    }
  };

  useEffect(() => {
    trendDefaultApplied.current = false;
    setTrendMetric("weight");
  }, [childId]);

  useEffect(() => {
    if (!data) return;
    if (trendDefaultApplied.current) return;
    trendDefaultApplied.current = true;
    if (chartSeries(data.chart_data.weight, "weight_kg").length >= 2) return;
    if (chartSeries(data.chart_data.height, "height_cm").length >= 2) {
      setTrendMetric("height");
      return;
    }
    if (chartSeries(data.chart_data.head, "head_cm").length >= 2) {
      setTrendMetric("head");
    }
  }, [data]);

  if (!childId) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center">
        <Text className="text-sm text-slate-500">Missing child.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center gap-2">
        <ActivityIndicator color={BRAND_PRIMARY_HEX} size="large" />
        <Text className="text-sm text-slate-500">Loading growth…</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-page px-5 pt-6 gap-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-sm text-red-600">{(error as Error).message}</Text>
      </SafeAreaView>
    );
  }

  const ls = data.latest_summary as Record<string, unknown>;
  const w = ls.weight as { value?: number; percentile?: number } | null | undefined;
  const h = ls.height as { value?: number; percentile?: number } | null | undefined;
  const hd = ls.head as { value?: number; percentile?: number } | null | undefined;

  const trend = growthTrendConfig(trendMetric, data);
  const oldestChartAge = maxAgeMonths(data.chart_data);
  const showWhoAgeNote =
    data.child.age_months > 24 || oldestChartAge > 24;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-14 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={BRAND_PRIMARY_HEX}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-brand-500">‹ Back</Text>
        </Pressable>
        <Text className="text-2xl font-extrabold text-slate-900">Growth</Text>
        <Text className="text-sm text-slate-500">{data.child.name} · WHO-based percentiles</Text>

        {data.percentile_table && data.percentile_table.length > 0 ? (
          <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-xs font-bold text-slate-400 uppercase flex-1">
                Percentile table
              </Text>
              <Pressable
                onPress={() =>
                  Share.share({
                    message: buildPercentileShareText(data.child.name, data.percentile_table!),
                  })
                }
                className="bg-brand-50 border border-brand-200 rounded-xl px-3 py-1.5 active:opacity-70"
              >
                <Text className="text-xs font-bold text-brand-700">Share</Text>
              </Pressable>
            </View>
            <Text className="text-[10px] text-slate-500">
              Approximate percentiles at each visit (Wt / Ht / head circumference).
            </Text>
            {data.percentile_table.map((row) => (
              <View
                key={row.measured_at}
                className="border-t border-slate-100 pt-2 first:border-0 first:pt-0"
              >
                <Text className="text-[11px] font-semibold text-slate-500">{row.measured_at}</Text>
                <Text className="text-sm text-slate-800">
                  Wt {fmtPctPlain(row.weight_percentile)} · Ht {fmtPctPlain(row.height_percentile)} ·
                  HC {fmtPctPlain(row.head_percentile)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-2">
          <Text className="text-xs font-bold text-slate-400 uppercase">Latest (approx.)</Text>
          <Text className="text-sm text-slate-800">
            Weight: {w?.value != null ? `${w.value} kg` : "—"} · pct{" "}
            {w ? fmtPct(w) : "—"}
          </Text>
          <Text className="text-sm text-slate-800">
            Length/height: {h?.value != null ? `${h.value} cm` : "—"} · pct{" "}
            {h ? fmtPct(h) : "—"}
          </Text>
          <Text className="text-sm text-slate-800">
            Head: {hd?.value != null ? `${hd.value} cm` : "—"} · pct{" "}
            {hd ? fmtPct(hd) : "—"}
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-4">
          <Text className="text-xs font-bold text-slate-400 uppercase">Trends</Text>
          <View className="flex-row gap-2">
            {(["weight", "height", "head"] as const).map((key) => {
              const selected = trendMetric === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTrendMetric(key)}
                  className={`flex-1 min-w-0 py-2.5 px-2 rounded-xl border items-center justify-center ${
                    selected
                      ? "bg-brand-50 border-brand-500"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold text-center ${
                      selected ? "text-brand-700" : "text-slate-600"
                    }`}
                    numberOfLines={1}
                  >
                    {TREND_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {showWhoAgeNote ? (
            <Text className="text-[11px] text-slate-500 leading-relaxed">
              WHO reference shading and median curve use the 0–24 month standards. Older
              ages still show your measurement trend; bands may be absent or partial.
            </Text>
          ) : null}
          <GrowthMetricChart
            title={trend.title}
            unit={trend.unit}
            points={trend.points}
            whoBands={trend.whoBands}
          />
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 gap-3">
          <Text className="text-sm font-bold text-slate-900">Add measurement</Text>
          <TextInput
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
            placeholder="Date YYYY-MM-DD"
            value={measuredAt}
            onChangeText={setMeasuredAt}
            placeholderTextColor="#94a3b8"
          />
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
              placeholder="Weight kg"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
              placeholder="Height cm"
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
              placeholderTextColor="#94a3b8"
            />
          </View>
          <TextInput
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
            placeholder="Head cm (optional)"
            keyboardType="decimal-pad"
            value={head}
            onChangeText={setHead}
            placeholderTextColor="#94a3b8"
          />
          {formError ? (
            <Text className="text-xs text-red-600">{formError}</Text>
          ) : null}
          <Button
            label={isPending ? "Saving…" : "Save"}
            onPress={submit}
            disabled={isPending}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-bold text-slate-900">History</Text>
          {[...data.measurements].reverse().slice(0, 12).map((m) => (
            <View
              key={m.id}
              className="bg-white border border-slate-100 rounded-xl p-3"
            >
              <Text className="text-xs font-semibold text-slate-500">{m.measured_at}</Text>
              <Text className="text-sm text-slate-800">
                {[m.weight_kg != null ? `${m.weight_kg} kg` : null, m.height_cm != null ? `${m.height_cm} cm` : null, m.head_cm != null ? `${m.head_cm} cm hc` : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-[11px] text-slate-400 leading-relaxed">
          Percentiles describe how your child compares to the reference population — not
          good or bad by themselves. Discuss trends with your clinician.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
