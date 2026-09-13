import type { ChartRange, PriceChartPoint, PriceChartStats } from "@/lib/api/trades";
import { toPersianDigits } from "@/lib/utils/numberUtils";

export const CHART_RANGE_OPTIONS: { id: ChartRange; label: string }[] = [
  { id: "24h", label: "۲۴ ساعت" },
  { id: "7d", label: "هفتگی" },
  { id: "30d", label: "ماهانه" },
];

export function formatChartPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return toPersianDigits(Math.round(Number(value)).toLocaleString());
}

export function formatChartPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const abs = Math.abs(Number(value)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  return toPersianDigits(abs);
}

export function chartDirection(stats: PriceChartStats | null | undefined): "up" | "down" | "flat" {
  const change = stats?.change ?? stats?.change_percent ?? 0;
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export function formatChartTick(point: PriceChartPoint, range: ChartRange): string {
  const raw = point.t_jalali || "";
  const [datePart, timePart] = raw.split(" ");
  if (range === "24h") {
    return toPersianDigits(timePart || datePart || "");
  }
  return toPersianDigits(datePart || raw);
}

export function seriesValues(points: PriceChartPoint[], key: "buy" | "sell"): number[] {
  return points.map((p) => Number(p[key])).filter((n) => Number.isFinite(n));
}
