import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { toPersianDigits } from "@/lib/utils/numberUtils";

export type MarketSnapshotValues = {
  market_change?: number | string | null;
  market_change_percent?: number | string | null;
  market_high?: number | string | null;
  market_low?: number | string | null;
  market_price_time?: string | null;
  market_symbol_name?: string | null;
  last_synced_at_jalali?: string | null;
};

type MarketSnapshotBarProps = MarketSnapshotValues & {
  variant?: "user" | "admin";
};

function toNum(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatAmount(value: number): string {
  return toPersianDigits(Math.abs(value).toLocaleString());
}

function formatPercent(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  return toPersianDigits(abs);
}

function formatMarketTime(raw?: string | null, withDate = false): string | null {
  if (!raw) return null;
  const [datePart, timePart] = raw.split("|");
  const time = (timePart || datePart || "").trim();
  const date = timePart ? (datePart || "").trim() : "";
  if (withDate && date && time) {
    return toPersianDigits(`${date} ${time}`);
  }
  return time ? toPersianDigits(time) : toPersianDigits(raw.replace("|", " "));
}

export default function MarketSnapshotBar({
  market_change,
  market_change_percent,
  market_high,
  market_low,
  market_price_time,
  market_symbol_name,
  last_synced_at_jalali,
  variant = "user",
}: MarketSnapshotBarProps) {
  const change = toNum(market_change);
  const percent = toNum(market_change_percent);
  const high = toNum(market_high);
  const low = toNum(market_low);
  const time = formatMarketTime(market_price_time, true);
  const synced = last_synced_at_jalali
    ? toPersianDigits(last_synced_at_jalali)
    : null;

  const hasChange = change !== null || percent !== null;
  const hasRange = high !== null && low !== null;
  if (!hasChange && !hasRange && !time && !synced) return null;

  const direction = (percent ?? change ?? 0) > 0 ? "up" : (percent ?? change ?? 0) < 0 ? "down" : "flat";
  const tone =
    direction === "up"
      ? "text-emerald-400"
      : direction === "down"
        ? "text-red-400"
        : "text-slate-400";
  const DirectionIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] md:text-xs ${
        variant === "admin" ? "text-slate-400 pt-1" : "text-slate-400"
      }`}
    >
      {hasChange && (
        <span className={`inline-flex items-center gap-1 font-bold ${tone}`}>
          <DirectionIcon size={14} />
          {change !== null ? formatAmount(change) : "—"}
          {percent !== null && (
            <span className="font-semibold">({formatPercent(percent)}٪)</span>
          )}
        </span>
      )}
      {hasRange && (
        <span>
          بازه امروز: {formatAmount(low!)} تا {formatAmount(high!)}
        </span>
      )}
      {time && <span>زمان نرخ: {time}</span>}
      {synced && <span className="text-slate-500">همگام‌سازی: {synced}</span>}
      {variant === "admin" && market_symbol_name && (
        <span className="text-slate-500">{market_symbol_name}</span>
      )}
    </div>
  );
}
