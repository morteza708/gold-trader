"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDownRight, ArrowUpRight } from "lucide-react";
import LiveClock from "@/components/dashboard/LiveClock";
import TradeModal from "@/components/dashboard/TradeModal";
import MarketSnapshotBar from "@/components/dashboard/MarketSnapshotBar";
import PriceTrendChart from "@/components/charts/PriceTrendChart";
import { useGoldPrice } from "@/hooks/useGoldPrice";
import { useTradesStatus } from "@/hooks/useTradesStatus";
import { usePriceChart } from "@/hooks/usePriceChart";
import { isBuyAllowed, isSellAllowed } from "@/lib/utils/marketStatus";
import { pageTitle } from "@/lib/brand";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import {
  chartDirection,
  formatChartPercent,
} from "@/lib/charts/priceChart";
import type { ChartRange } from "@/lib/api/trades";
import toast from "react-hot-toast";

export default function MarketTrendPage() {
  const [range, setRange] = useState<ChartRange>("24h");
  const [seriesKey, setSeriesKey] = useState<"buy" | "sell">("buy");
  const [modalType, setModalType] = useState<"buy" | "sell" | null>(null);
  const { prices, loading: priceLoading } = useGoldPrice(10000);
  const { status: tradesStatus } = useTradesStatus(15000);
  const { data, loading: chartLoading } = usePriceChart(range);
  const buyAllowed = isBuyAllowed(tradesStatus);
  const sellAllowed = isSellAllowed(tradesStatus);
  const stats = data?.stats ?? null;
  const direction = chartDirection(stats);
  const livePrice = seriesKey === "buy" ? prices?.buy : prices?.sell;

  useEffect(() => {
    document.title = pageTitle("روند قیمت");
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gold-600"
        >
          <ArrowRight size={16} />
          خانه
        </Link>
        <LiveClock />
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gold-500/10 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div>
            <p className="text-xs text-slate-400 mb-1">قیمت معامله در اپال‌باکس</p>
            <h1 className="text-xl font-black">روند طلای آب‌شده</h1>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400 mb-1">
                {seriesKey === "buy" ? "قیمت خرید" : "قیمت فروش"}
                <span className="text-[11px] mr-2">تومان / گرم</span>
              </p>
              <p className="text-3xl font-black tracking-tight">
                {priceLoading || livePrice == null
                  ? "—"
                  : toPersianDigits(livePrice.toLocaleString())}
              </p>
            </div>
            {stats?.change_percent != null && (
              <span
                className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                  direction === "up"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : direction === "down"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-slate-700 text-slate-300"
                }`}
              >
                {direction === "down" ? "↓" : direction === "up" ? "↑" : "–"}{" "}
                {formatChartPercent(stats.change_percent)}٪
                <span className="font-medium text-[11px] mr-1 opacity-80">این بازه</span>
              </span>
            )}
          </div>

          {!priceLoading && prices && (
            <MarketSnapshotBar
              variant="user"
              market_change={prices.market_change}
              market_change_percent={prices.market_change_percent}
              market_high={prices.market_high}
              market_low={prices.market_low}
              market_price_time={prices.market_price_time}
              last_synced_at_jalali={prices.last_synced_at_jalali}
            />
          )}

          <PriceTrendChart
            range={range}
            onRangeChange={setRange}
            series={data?.series || []}
            stats={stats}
            loading={chartLoading}
            variant="user"
            seriesKey={seriesKey}
            onSeriesKeyChange={setSeriesKey}
            height={240}
          />

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (!buyAllowed) {
                  toast.error(tradesStatus?.message || "خرید در حال حاضر غیرفعال است");
                  return;
                }
                setModalType("buy");
              }}
              disabled={!buyAllowed}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-sm border transition-colors ${
                buyAllowed
                  ? "bg-green-500/15 border-green-500/40 text-green-300 hover:bg-green-500/25"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <ArrowDownRight size={16} />
              خرید طلا
            </button>
            <button
              type="button"
              onClick={() => {
                if (!sellAllowed) {
                  toast.error(tradesStatus?.message || "فروش در حال حاضر غیرفعال است");
                  return;
                }
                setModalType("sell");
              }}
              disabled={!sellAllowed}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-sm border transition-colors ${
                sellAllowed
                  ? "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <ArrowUpRight size={16} />
              فروش طلا
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 px-1">
        این نمودار قیمت اجرایی معامله در اپال‌باکس است، نه نمودار رسمی بازار.
        سقف و کف نمایش‌داده‌شده مربوط به بازه انتخاب‌شده همین نمودار است.
      </p>

      <TradeModal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        type={modalType || "buy"}
        price={modalType === "buy" ? (prices?.buy || 0) : (prices?.sell || 0)}
        buyEnabled={buyAllowed}
        sellEnabled={sellAllowed}
      />
    </div>
  );
}
