import { useCallback, useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { BRAND_PRIMARY_HEX } from "@/lib/brand-colors";

export type GrowthChartSeriesPoint = { age_months: number; value: number };

/** WHO band control points aligned with measurement ages (typically 0–24 mo on server). */
export type WhoBandSample = {
  age_months: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

type Props = {
  title: string;
  unit: string;
  /** Sorted by age_months ascending; at least two points for a line. */
  points: GrowthChartSeriesPoint[];
  /** Optional shaded WHO corridors (3rd–97th and 15th–85th) behind the line. */
  whoBands?: WhoBandSample[];
};

const CHART_HEIGHT = 168;
const PAD = { l: 38, r: 10, t: 8, b: 26 };

function polygonBetweenBands(
  band: WhoBandSample[],
  highKey: "p97" | "p85",
  lowKey: "p3" | "p15",
  sx: (x: number) => number,
  sy: (y: number) => number
): string {
  const top = band.map((r) => `${sx(r.age_months)},${sy(r[highKey])}`);
  const bottom = [...band].reverse().map((r) => `${sx(r.age_months)},${sy(r[lowKey])}`);
  return [...top, ...bottom].join(" ");
}

export function GrowthMetricChart({ title, unit, points, whoBands }: Props) {
  const [width, setWidth] = useState(280);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  }, []);

  if (points.length < 2) {
    return (
      <View className="bg-slate-50 rounded-xl p-3 gap-1">
        <Text className="text-sm font-bold text-slate-800">{title}</Text>
        <Text className="text-xs text-slate-400">
          Add at least two measurements with this metric to see a trend.
        </Text>
      </View>
    );
  }

  const xs = points.map((p) => p.age_months);
  const ys = points.map((p) => p.value);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const bands =
    whoBands && whoBands.length >= 2
      ? whoBands.filter((b) =>
          [b.p3, b.p15, b.p50, b.p85, b.p97].every(
            (v) => typeof v === "number" && Number.isFinite(v)
          )
        )
      : [];

  for (const b of bands) {
    minY = Math.min(minY, b.p3, b.p15, b.p50, b.p85, b.p97);
    maxY = Math.max(maxY, b.p3, b.p15, b.p50, b.p85, b.p97);
    minX = Math.min(minX, b.age_months);
    maxX = Math.max(maxX, b.age_months);
  }

  const dx = maxX - minX || 1e-6;
  const dy = maxY - minY || 1e-6;
  const yPad = Math.max(dy * 0.08, 1e-4);
  const y0 = minY - yPad;
  const y1 = maxY + yPad;
  const innerW = width - PAD.l - PAD.r;
  const innerH = CHART_HEIGHT - PAD.t - PAD.b;

  const sx = (x: number) => PAD.l + ((x - minX) / dx) * innerW;
  const sy = (y: number) => PAD.t + (1 - (y - y0) / (y1 - y0)) * innerH;

  const medianStroke =
    bands.length >= 2
      ? bands.map((b) => `${sx(b.age_months)},${sy(b.p50)}`).join(" ")
      : "";

  const poly = points.map((p) => `${sx(p.age_months)},${sy(p.value)}`).join(" ");

  const fmtY = (v: number) =>
    v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  const fmtX = (v: number) => (v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1));

  return (
    <View className="w-full gap-2" onLayout={onLayout}>
      <Text className="text-sm font-bold text-slate-900">{title}</Text>
      <Svg width={width} height={CHART_HEIGHT}>
        <Line
          x1={PAD.l}
          y1={CHART_HEIGHT - PAD.b}
          x2={width - PAD.r}
          y2={CHART_HEIGHT - PAD.b}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <Line
          x1={PAD.l}
          y1={PAD.t}
          x2={PAD.l}
          y2={CHART_HEIGHT - PAD.b}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        {bands.length >= 2 ? (
          <>
            <Polygon
              points={polygonBetweenBands(bands, "p97", "p3", sx, sy)}
              fill="rgba(203, 213, 225, 0.45)"
            />
            <Polygon
              points={polygonBetweenBands(bands, "p85", "p15", sx, sy)}
              fill="rgba(20, 184, 166, 0.18)"
            />
            <Polyline
              points={medianStroke}
              fill="none"
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </>
        ) : null}
        <Polyline
          points={poly}
          fill="none"
          stroke={BRAND_PRIMARY_HEX}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle
            key={`${p.age_months}-${p.value}-${i}`}
            cx={sx(p.age_months)}
            cy={sy(p.value)}
            r={4}
            fill="#fff"
            stroke={BRAND_PRIMARY_HEX}
            strokeWidth={2}
          />
        ))}
        <SvgText
          x={PAD.l}
          y={CHART_HEIGHT - 6}
          fontSize={10}
          fill="#94a3b8"
        >
          {fmtX(minX)} mo
        </SvgText>
        <SvgText
          x={width - PAD.r}
          y={CHART_HEIGHT - 6}
          fontSize={10}
          fill="#94a3b8"
          textAnchor="end"
        >
          {fmtX(maxX)} mo
        </SvgText>
        <SvgText x={2} y={sy(maxY) + 4} fontSize={10} fill="#94a3b8">
          {fmtY(maxY)}
        </SvgText>
        <SvgText x={2} y={sy(minY) + 4} fontSize={10} fill="#94a3b8">
          {fmtY(minY)}
        </SvgText>
      </Svg>
      <Text className="text-[11px] text-slate-400">
        Age (months) → · {unit}
        {bands.length >= 2
          ? " · Shaded: WHO 3rd–97th (wide), 15th–85th (teal), dashed: 50th (median)."
          : ""}
      </Text>
    </View>
  );
}
