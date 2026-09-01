"use client";

import { useState, useEffect } from "react";
import {
  Users, Activity, Lock, TrendingUp, Loader2, AlertCircle,
  UserPlus, DollarSign,
} from "lucide-react";
import LiveClock from "@/components/dashboard/LiveClock";
import MarketSnapshotBar from "@/components/dashboard/MarketSnapshotBar";
import MarketControlPanel from "@/components/admin/MarketControlPanel";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { adminAPI } from "@/lib/api/auth";
import { useGoldPrice } from "@/hooks/useGoldPrice";
import { useTradesStatus } from "@/hooks/useTradesStatus";

export default function AdminDashboard() {
  const { prices, loading: priceLoading } = useGoldPrice(5000);
  const { status: tradesStatus, loading: statusLoading, refresh: refreshMarketStatus } =
    useTradesStatus(5000, true);

  const [stats, setStats] = useState({
    total_users: 0,
    new_users_today: 0,
    trades_today_count: 0,
    trades_today_volume: 0,
    revenue_today: 0,
    pending_requests: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    document.title = "اتاق فرمان | پنل مدیریت";
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const data = await adminAPI.getDashboardStats();
      setStats(data);
    } catch (error: unknown) {
      console.error("خطا در دریافت آمار dashboard:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="relative flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl font-black text-white order-2 md:order-1">اتاق فرمان</h1>
        <div className="order-1 md:absolute md:left-1/2 md:-translate-x-1/2">
          <LiveClock />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MarketControlPanel
          status={tradesStatus}
          loading={statusLoading}
          onUpdated={refreshMarketStatus}
        />

        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col justify-center gap-4">
          <div className="flex justify-between items-center text-slate-400 text-sm mb-2">
            <span>نرخ زنده (دریافت از API)</span>
            {priceLoading ? (
              <span className="flex items-center gap-1 text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                <Loader2 size={12} className="animate-spin" /> Loading...
              </span>
            ) : prices ? (
              <span className="flex items-center gap-1 text-green-400 bg-green-900/30 px-2 py-1 rounded">
                Connected <Activity size={12} />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 bg-red-900/30 px-2 py-1 rounded">
                <AlertCircle size={12} /> Error
              </span>
            )}
          </div>

          {priceLoading ? (
            <div className="bg-slate-900 rounded-2xl p-4 flex justify-center items-center border border-slate-700">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : prices ? (
            <>
              <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center border border-slate-700">
                <span className="text-slate-400 font-bold">خرید:</span>
                <span className="text-2xl font-black text-red-400">
                  {toPersianDigits(prices.buy.toLocaleString())}
                </span>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center border border-slate-700">
                <span className="text-slate-400 font-bold">فروش:</span>
                <span className="text-2xl font-black text-green-400">
                  {toPersianDigits(prices.sell.toLocaleString())}
                </span>
              </div>
              <MarketSnapshotBar
                variant="admin"
                market_change={prices.market_change}
                market_change_percent={prices.market_change_percent}
                market_high={prices.market_high}
                market_low={prices.market_low}
                market_price_time={prices.market_price_time}
                market_symbol_name={prices.market_symbol_name}
                last_synced_at_jalali={prices.last_synced_at_jalali}
              />
            </>
          ) : (
            <div className="bg-slate-900 rounded-2xl p-4 flex justify-center items-center border border-slate-700">
              <span className="text-slate-400">قیمت در دسترس نیست</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            title: "کاربران کل",
            value: statsLoading ? "..." : toPersianDigits(stats.total_users.toLocaleString()),
            icon: Users,
            color: "text-blue-400",
          },
          {
            title: "کاربران جدید امروز",
            value: statsLoading ? "..." : toPersianDigits(stats.new_users_today.toString()),
            icon: UserPlus,
            color: "text-purple-400",
          },
          {
            title: "معاملات امروز",
            value: statsLoading ? "..." : toPersianDigits(stats.trades_today_count.toString()),
            icon: TrendingUp,
            color: "text-green-400",
          },
          {
            title: "حجم معاملات امروز",
            value: statsLoading
              ? "..."
              : `${toPersianDigits(stats.trades_today_volume.toFixed(2))} گرم`,
            icon: Activity,
            color: "text-gold-400",
          },
          {
            title: "درآمد امروز",
            value: statsLoading
              ? "..."
              : `${toPersianDigits(stats.revenue_today.toLocaleString())} ریال`,
            icon: DollarSign,
            color: "text-emerald-400",
          },
          {
            title: "منتظر تایید",
            value: statsLoading ? "..." : toPersianDigits(stats.pending_requests.toString()),
            icon: Lock,
            color: "text-orange-400",
          },
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-bold">{stat.title}</span>
              {statsLoading ? (
                <Loader2 size={18} className="text-slate-500 animate-spin" />
              ) : (
                <stat.icon size={18} className={stat.color} />
              )}
            </div>
            <h4 className="text-2xl font-black text-white">{stat.value}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}
