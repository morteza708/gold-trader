"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  getMarketBannerView,
  type MarketStatusData,
} from "@/lib/utils/marketStatus";

interface MarketStatusBannerProps {
  status: MarketStatusData | null;
  loading?: boolean;
  compact?: boolean;
}

export default function MarketStatusBanner({
  status,
  loading = false,
  compact = false,
}: MarketStatusBannerProps) {
  if (loading) return null;

  const view = getMarketBannerView(status);
  if (!view.show || !status) return null;

  const toneStyles = {
    success: {
      wrap: "from-emerald-50 via-white to-emerald-50/40 border-emerald-200/80 text-emerald-950",
      icon: "bg-emerald-100 text-emerald-600 ring-emerald-200",
      badgeBuy: "bg-emerald-600 text-white",
      badgeSell: "bg-emerald-600 text-white",
      Icon: CheckCircle2,
    },
    warning: {
      wrap: "from-amber-50 via-orange-50/30 to-amber-50 border-amber-200/90 text-amber-950",
      icon: "bg-amber-100 text-amber-700 ring-amber-200",
      badgeBuy: status.buy_enabled
        ? "bg-emerald-600 text-white"
        : "bg-slate-200 text-slate-500 line-through",
      badgeSell: status.sell_enabled
        ? "bg-emerald-600 text-white"
        : "bg-slate-200 text-slate-500 line-through",
      Icon: AlertTriangle,
    },
    danger: {
      wrap: "from-red-50 via-rose-50/40 to-red-50 border-red-200/90 text-red-950",
      icon: "bg-red-100 text-red-600 ring-red-200",
      badgeBuy: "bg-slate-200 text-slate-500 line-through",
      badgeSell: "bg-slate-200 text-slate-500 line-through",
      Icon: XCircle,
    },
  } as const;

  const style = toneStyles[view.tone];
  const BannerIcon = style.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border shadow-sm bg-gradient-to-r ${style.wrap} ${
        compact ? "px-4 py-3" : "px-5 py-4"
      }`}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-current opacity-20" />

      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 rounded-xl p-2 ring-1 ${style.icon} ${compact ? "mt-0.5" : ""}`}
        >
          <BannerIcon size={compact ? 18 : 20} />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-black ${compact ? "text-sm" : "text-base"}`}>{view.title}</p>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${style.badgeBuy}`}
              >
                <TrendingDown size={12} />
                خرید {status.buy_enabled ? "فعال" : "غیرفعال"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${style.badgeSell}`}
              >
                <TrendingUp size={12} />
                فروش {status.sell_enabled ? "فعال" : "غیرفعال"}
              </span>
            </div>
          </div>

          <p className={`leading-relaxed opacity-90 ${compact ? "text-xs" : "text-sm"}`}>
            {view.description}
          </p>

          {status.market_mode === "CLOSED" && (
            <p className="text-[11px] flex items-center gap-1.5 opacity-75">
              <Lock size={12} />
              تا اطلاع بعدی امکان ثبت معامله جدید وجود ندارد.
            </p>
          )}

          {(status.market_mode === "SELL_ONLY" || status.market_mode === "BUY_ONLY") && (
            <p className="text-[11px] flex items-center gap-1.5 opacity-75">
              <ShoppingCart size={12} />
              {status.market_mode === "SELL_ONLY"
                ? "خرید فوری، خرید معلق و سفارش هوشمند خرید غیرفعال است."
                : "فروش فوری و سفارش هوشمند فروش غیرفعال است."}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
