"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Loader2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminTradesAPI } from "@/lib/api/trades";
import {
  getMarketModeLabel,
  type MarketStatusData,
} from "@/lib/utils/marketStatus";

interface MarketControlPanelProps {
  status: MarketStatusData | null;
  loading: boolean;
  onUpdated: () => void;
}

export default function MarketControlPanel({
  status,
  loading,
  onUpdated,
}: MarketControlPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [confirmSide, setConfirmSide] = useState<"buy" | "sell" | "all-close" | null>(null);
  const [pendingValues, setPendingValues] = useState<{ buy: boolean; sell: boolean } | null>(
    null
  );

  const buyEnabled = status?.buy_enabled ?? true;
  const sellEnabled = status?.sell_enabled ?? true;

  useEffect(() => {
    if (status?.admin_notice !== undefined) {
      setAdminNotice(status.admin_notice || "");
    }
  }, [status?.admin_notice, status?.market_mode]);

  const requestToggle = (side: "buy" | "sell", next: boolean) => {
    const nextBuy = side === "buy" ? next : buyEnabled;
    const nextSell = side === "sell" ? next : sellEnabled;

    if (!next) {
      setPendingValues({ buy: nextBuy, sell: nextSell });
      setConfirmSide(side);
      return;
    }

    applyControl(nextBuy, nextSell);
  };

  const closeAll = () => {
    setPendingValues({ buy: false, sell: false });
    setConfirmSide("all-close");
  };

  const applyControl = async (buy: boolean, sell: boolean) => {
    setIsSaving(true);
    setConfirmSide(null);
    try {
      const res = await adminTradesAPI.updateMarketControl({
        buy_enabled: buy,
        sell_enabled: sell,
        admin_notice: adminNotice.trim(),
      });
      toast.success(res.message, { duration: 5000 });
      onUpdated();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در تغییر وضعیت بازار");
    } finally {
      setIsSaving(false);
      setPendingValues(null);
    }
  };

  const mode = status?.market_mode ?? "OPEN";

  return (
    <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white">کنترل بازار</h3>
          <p className="text-slate-400 text-sm mt-1">خرید و فروش را به‌صورت جداگانه فعال یا غیرفعال کنید</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
            mode === "OPEN"
              ? "bg-green-500/15 text-green-300 border border-green-500/30"
              : mode === "CLOSED"
                ? "bg-red-500/15 text-red-300 border border-red-500/30"
                : "bg-amber-500/15 text-amber-200 border border-amber-500/30"
          }`}
        >
          {getMarketModeLabel(mode)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideToggleCard
          title="خرید"
          subtitle="فوری · معلق · سفارش هوشمند خرید"
          enabled={buyEnabled}
          loading={loading || isSaving}
          tone="green"
          icon={<TrendingDown size={22} />}
          onToggle={(next) => requestToggle("buy", next)}
        />
        <SideToggleCard
          title="فروش"
          subtitle="فوری · سفارش هوشمند فروش"
          enabled={sellEnabled}
          loading={loading || isSaving}
          tone="red"
          icon={<TrendingUp size={22} />}
          onToggle={(next) => requestToggle("sell", next)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-center text-xs">
        <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-3">
          <p className="text-slate-500">سفارش هوشمند خرید معلق</p>
          <p className="text-lg font-black text-white mt-1">
            {status?.suspended_buy_orders ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-3">
          <p className="text-slate-500">سفارش هوشمند فروش معلق</p>
          <p className="text-lg font-black text-white mt-1">
            {status?.suspended_sell_orders ?? 0}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 mb-2">
          پیام نمایشی برای کاربران (اختیاری)
        </label>
        <textarea
          value={adminNotice}
          onChange={(e) => setAdminNotice(e.target.value)}
          rows={2}
          placeholder="مثلاً: به دلیل نوسان بازار، خرید تا اطلاع بعدی متوقف است."
          className="w-full rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm p-3 focus:outline-none focus:border-gold-500/50 resize-none"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          در بنر پنل کاربر نمایش داده می‌شود. با ذخیره وضعیت اعمال می‌گردد.
        </p>
      </div>

      <button
        type="button"
        disabled={loading || isSaving || (!buyEnabled && !sellEnabled)}
        onClick={closeAll}
        className="w-full rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 py-3 text-sm font-bold transition-colors disabled:opacity-40"
      >
        بستن کامل بازار (خرید + فروش)
      </button>

      <AnimatePresence>
        {confirmSide && pendingValues && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-white">تأیید غیرفعال‌سازی</h4>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      {confirmSide === "all-close"
                        ? "بازار کاملاً بسته می‌شود و هیچ معامله جدیدی ثبت نخواهد شد."
                        : confirmSide === "buy"
                          ? "ثبت خرید جدید (فوری، معلق، هوشمند) متوقف می‌شود. سفارش‌های هوشمند خرید معلق می‌شوند."
                          : "ثبت فروش جدید متوقف می‌شود. سفارش‌های هوشمند فروش معلق می‌شوند."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmSide(null);
                    setPendingValues(null);
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => applyControl(pendingValues.buy, pendingValues.sell)}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white py-3 text-sm font-bold"
                >
                  تأیید
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmSide(null);
                    setPendingValues(null);
                  }}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 text-sm font-bold"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SideToggleCard({
  title,
  subtitle,
  enabled,
  loading,
  tone,
  icon,
  onToggle,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  loading: boolean;
  tone: "green" | "red";
  icon: React.ReactNode;
  onToggle: (next: boolean) => void;
}) {
  const activeClass =
    tone === "green"
      ? "border-green-500/40 bg-green-500/10"
      : "border-red-500/40 bg-red-500/10";

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        enabled ? activeClass : "border-slate-700 bg-slate-900/60 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              enabled
                ? tone === "green"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-red-500/20 text-red-300"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {icon}
          </div>
          <div>
            <p className="font-black text-white">{title}</p>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="animate-spin text-slate-400" size={20} />
        ) : (
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              enabled ? "bg-green-500/20 text-green-300" : "bg-slate-700 text-slate-400"
            }`}
          >
            {enabled ? "فعال" : "غیرفعال"}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => onToggle(!enabled)}
        className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
          enabled
            ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
            : tone === "green"
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-red-600 hover:bg-red-500 text-white"
        }`}
      >
        {enabled ? `غیرفعال کردن ${title}` : `فعال کردن ${title}`}
      </button>
    </div>
  );
}
