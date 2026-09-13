"use client";

import { useId, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartRange, PriceChartPoint, PriceChartStats } from "@/lib/api/trades";
import {
  CHART_RANGE_OPTIONS,
  chartDirection,
  formatChartPercent,
  formatChartPrice,
  formatChartTick,
} from "@/lib/charts/priceChart";
import { toPersianDigits } from "@/lib/utils/numberUtils";

type SeriesKey = "buy" | "sell";

type PriceTrendChartProps = {
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  series: PriceChartPoint[];
  stats: PriceChartStats | null;
  loading?: boolean;
  variant?: "user" | "admin";
  seriesKey?: SeriesKey;
  onSeriesKeyChange?: (key: SeriesKey) => void;
  height?: number;
};

function ChartTooltip({
  active,
  payload,
  variant,
}: {
  active?: boolean;
  payload?: Array<{ payload: PriceChartPoint }>;
  variant: "user" | "admin";
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white">
      <p className="mb-1 text-slate-300">{toPersianDigits(row.t_jalali)}</p>
      {variant === "admin" ? (
        <>
          <p className="text-red-300">خرید: {formatChartPrice(row.buy)}</p>
          <p className="text-emerald-300">فروش: {formatChartPrice(row.sell)}</p>
          {row.source && (
            <p className="mt-1 text-slate-400">
              منبع: {row.source === "API" ? "زنده" : "دستی"}
            </p>
          )}
        </>
      ) : (
        <>
          <p>خرید: {formatChartPrice(row.buy)}</p>
          <p className="text-slate-300">فروش: {formatChartPrice(row.sell)}</p>
        </>
      )}
    </div>
  );
}

export default function PriceTrendChart({
  range,
  onRangeChange,
  series,
  stats,
  loading = false,
  variant = "user",
  seriesKey = "buy",
  onSeriesKeyChange,
  height = 220,
}: PriceTrendChartProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const userFillId = `userAreaFill-${uid}`;
  const buyFillId = `buyAreaFill-${uid}`;
  const sellFillId = `sellAreaFill-${uid}`;
  const direction = chartDirection(stats);
  const stroke =
    direction === "up" ? "#34d399" : direction === "down" ? "#f87171" : "#D4AF37";

  const data = useMemo(
    () =>
      series.map((point) => ({
        ...point,
        tick: formatChartTick(point, range),
      })),
    [series, range]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full bg-slate-800 p-1 border border-slate-700">
          {CHART_RANGE_OPTIONS.map((option) => {
            const active = option.id === range;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onRangeChange(option.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  active
                    ? "bg-gold-500 text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {variant === "user" && onSeriesKeyChange && (
          <div className="flex rounded-full bg-slate-800 p-1 border border-slate-700">
            {([
              { id: "buy" as const, label: "خرید" },
              { id: "sell" as const, label: "فروش" },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSeriesKeyChange(option.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  seriesKey === option.id
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] md:text-xs text-slate-300">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2">
          <p className="text-slate-500 mb-0.5">بالاترین این نمودار</p>
          <p className="font-black text-emerald-400">{formatChartPrice(stats?.high)}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2">
          <p className="text-slate-500 mb-0.5">پایین‌ترین این نمودار</p>
          <p className="font-black text-red-400">{formatChartPrice(stats?.low)}</p>
        </div>
      </div>

      {stats && (stats.change !== null || stats.change_percent !== null) && (
        <p
          className={`text-xs font-bold ${
            direction === "up"
              ? "text-emerald-400"
              : direction === "down"
                ? "text-red-400"
                : "text-slate-400"
          }`}
        >
          تغییر بازه: {stats.change !== null && stats.change > 0 ? "+" : ""}
          {formatChartPrice(stats.change)}
          {stats.change_percent !== null && (
            <span> ({formatChartPercent(stats.change_percent)}٪)</span>
          )}
        </p>
      )}

      <div className="w-full" style={{ height }}>
        {loading && series.length === 0 ? (
          <div className="h-full rounded-2xl bg-slate-800/60 animate-pulse" />
        ) : series.length < 2 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-700 rounded-2xl">
            تاریخچه قیمت برای این بازه کافی نیست
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={userFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={buyFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={sellFillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="tick"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(value: number) => formatChartPrice(value)}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={<ChartTooltip variant={variant} />}
                cursor={{ stroke: "#D4AF37", strokeOpacity: 0.4 }}
              />
              {variant === "admin" && (
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }}
                  formatter={(value) => (value === "buy" ? "خرید" : "فروش")}
                />
              )}
              {variant === "admin" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="buy"
                    name="buy"
                    stroke="#f87171"
                    fill={`url(#${buyFillId})`}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={!reduceMotion}
                  />
                  <Area
                    type="monotone"
                    dataKey="sell"
                    name="sell"
                    stroke="#34d399"
                    fill={`url(#${sellFillId})`}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={!reduceMotion}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={stroke}
                  fill={`url(#${userFillId})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!reduceMotion}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
