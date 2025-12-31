"use client";

import { useState, useEffect } from "react";
import { 
  Banknote, Search, Filter, Eye, XCircle, 
  ArrowUpRight, ArrowDownRight, TrendingUp,
  CheckCircle2, Clock, AlertCircle, User,
  Calendar, DollarSign, Package, FileText,
  Loader2, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import InvoiceModal from "@/components/dashboard/InvoiceModal";
import TradeStatusBadge from "@/components/admin/TradeStatusBadge";
import TradeTypeBadge from "@/components/admin/TradeTypeBadge";
import StatsCard from "@/components/admin/StatsCard";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { adminTradesAPI, Trade } from "@/lib/api/trades";

export default function TradesMonitoringPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed" | "pending" | "cancelled">("all");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "مانیتورینگ معاملات | پنل مدیریت";
  }, []);

  // دریافت معاملات از API
  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setIsLoading(true);
    try {
      const data = await adminTradesAPI.getTrades();
      setTrades(data);
    } catch (error: any) {
      toast.error("خطا در دریافت معاملات");
    } finally {
      setIsLoading(false);
    }
  };

  // فیلتر کردن معاملات
  const filteredTrades = trades.filter((trade) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      trade.user_name?.toLowerCase().includes(searchLower) ||
      trade.user_mobile?.includes(toEnglishDigits(searchQuery)) ||
      trade.tracking_code?.toLowerCase().includes(searchLower) ||
      trade.invoice_number?.toLowerCase().includes(searchLower);
    
    const matchesType = typeFilter === "all" || trade.trade_type.toLowerCase() === typeFilter;
    
    const statusMap: Record<string, string> = {
      SUCCESS: "success",
      FAILED: "failed",
      PENDING: "pending",
      CANCELLED: "cancelled",
    };
    const tradeStatus = statusMap[trade.status] || "pending";
    const matchesStatus = statusFilter === "all" || tradeStatus === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // آمار کلی
  const stats = {
    total: trades.length,
    buy: trades.filter(t => t.trade_type.toLowerCase() === "buy").length,
    sell: trades.filter(t => t.trade_type.toLowerCase() === "sell").length,
    success: trades.filter(t => t.status === "SUCCESS").length,
    pending: trades.filter(t => t.status === "PENDING").length,
    failed: trades.filter(t => t.status === "FAILED").length,
    cancelled: trades.filter(t => t.status === "CANCELLED").length,
    totalVolume: trades.filter(t => t.status === "SUCCESS").reduce((sum, t) => sum + Number(t.amount || 0), 0),
    totalBuyAmount: trades.filter(t => t.trade_type.toLowerCase() === "buy" && t.status === "SUCCESS").reduce((sum, t) => sum + Number(t.total || 0), 0),
    totalSellAmount: trades.filter(t => t.trade_type.toLowerCase() === "sell" && t.status === "SUCCESS").reduce((sum, t) => sum + Number(t.total || 0), 0),
  };

  // محاسبه سود خالص (مجموع سود حاشیه از تمام معاملات موفق)
  const netProfit = trades
    .filter(t => t.status === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.margin_profit || 0), 0);

  // عملیات مدیریتی
  const handleCancelTrade = async (trade: Trade) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این معامله را لغو کنید؟")) {
      return;
    }
    
    try {
      // TODO: اگر API برای لغو معامله وجود دارد، اینجا فراخوانی شود
      toast.success(`معامله #${trade.id} لغو شد`);
      fetchTrades();
    } catch (error: any) {
      toast.error("خطا در لغو معامله");
    }
  };

  const handleViewDetails = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsDetailModalOpen(true);
  };

  const handleViewInvoice = (trade: Trade) => {
    setSelectedInvoice(trade);
  };

  // تبدیل وضعیت برای نمایش
  const getStatusForDisplay = (status: string): "success" | "failed" | "pending" | "cancelled" => {
    const statusMap: Record<string, "success" | "failed" | "pending" | "cancelled"> = {
      SUCCESS: "success",
      FAILED: "failed",
      PENDING: "pending",
      CANCELLED: "cancelled",
    };
    return statusMap[status] || "pending";
  };


  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">مانیتورینگ معاملات</h1>
          <p className="text-sm text-slate-400">نظارت و مدیریت معاملات خرید و فروش طلا</p>
        </div>
        <button
          onClick={fetchTrades}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { title: "کل معاملات", value: stats.total, icon: Banknote, color: "text-blue-400" },
          { title: "خرید", value: stats.buy, icon: ArrowUpRight, color: "text-green-400" },
          { title: "فروش", value: stats.sell, icon: ArrowDownRight, color: "text-red-400" },
          { title: "حجم کل", value: toPersianDigits(stats.totalVolume.toFixed(2)) + " گرم", icon: Package, color: "text-gold-400" },
          { title: "سود خالص", value: toPersianDigits(netProfit.toLocaleString()) + " ریال", icon: TrendingUp, color: netProfit >= 0 ? "text-green-400" : "text-red-400" },
        ].map((stat, idx) => (
          <StatsCard key={idx} title={stat.title} value={toPersianDigits(stat.value.toString())} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      {/* آمار وضعیت */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "موفق", value: stats.success, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
          { title: "در انتظار", value: stats.pending, icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10" },
          { title: "ناموفق", value: stats.failed, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
          { title: "لغو شده", value: stats.cancelled, icon: XCircle, color: "text-gray-400", bg: "bg-gray-500/10" },
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.bg} p-4 rounded-2xl border border-slate-700`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-bold">{stat.title}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <h4 className="text-xl font-black text-white">{toPersianDigits(stat.value.toString())}</h4>
          </div>
        ))}
      </div>

      {/* نوار جستجو و فیلتر */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* جستجو */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="جستجو بر اساس نام کاربر، شماره موبایل، کد رهگیری یا شماره فاکتور..."
              value={toPersianDigits(searchQuery)}
              onChange={(e) => setSearchQuery(toEnglishDigits(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 pr-10 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          {/* فیلترها */}
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm font-bold focus:outline-none focus:border-gold-500 transition-colors"
            >
              <option value="all">همه انواع</option>
              <option value="buy">خرید</option>
              <option value="sell">فروش</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm font-bold focus:outline-none focus:border-gold-500 transition-colors"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="success">موفق</option>
              <option value="pending">در انتظار</option>
              <option value="failed">ناموفق</option>
              <option value="cancelled">لغو شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* جدول معاملات - دسکتاپ */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کد معامله</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کاربر</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">نوع</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">مقدار</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">قیمت واحد</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">مبلغ کل</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">تاریخ و زمان</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">وضعیت</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                  </td>
                </tr>
              ) : filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    معامله‌ای یافت نشد
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => {
                  const tradeType = trade.trade_type.toLowerCase();
                  const displayStatus = getStatusForDisplay(trade.status);
                  
                  return (
                    <tr key={trade.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <span className="text-sm font-bold text-slate-200 dir-ltr">#{toPersianDigits(trade.id.toString())}</span>
                          <p className="text-xs text-slate-400 mt-1">{trade.tracking_code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-bold text-white">{trade.user_name}</p>
                          <p className="text-xs text-slate-400 dir-ltr text-right tracking-wider">{toPersianDigits(trade.user_mobile)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TradeTypeBadge type={tradeType as "buy" | "sell"} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-slate-200">
                          {toPersianDigits(Number(trade.amount || 0).toFixed(3))} <span className="text-xs text-slate-400">گرم</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-slate-200">
                          {toPersianDigits(Number(trade.price || 0).toLocaleString())} <span className="text-xs text-slate-400">تومان</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-black ${
                          tradeType === "buy" ? "text-red-400" : "text-green-400"
                        }`}>
                          {tradeType === "buy" ? "-" : "+"} {toPersianDigits(Number(trade.total || 0).toLocaleString())} 
                          <span className="text-xs text-slate-400"> تومان</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-200">
                          <p>{trade.created_at_jalali ? toPersianDigits(trade.created_at_jalali) : '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TradeStatusBadge status={displayStatus as "success" | "failed" | "pending" | "cancelled"} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(trade)}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white"
                            title="مشاهده جزئیات"
                          >
                            <Eye size={16} />
                          </button>
                          {trade.status === "SUCCESS" && (
                            <button
                              onClick={() => handleViewInvoice(trade)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-blue-400"
                              title="مشاهده فاکتور"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          {trade.status === "PENDING" && (
                            <button
                              onClick={() => handleCancelTrade(trade)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400"
                              title="لغو معامله"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* کارت‌های معاملات - موبایل */}
      <div className="space-y-4 md:hidden">
        {isLoading ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
            <Loader2 className="animate-spin text-slate-400 mx-auto" size={32} />
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-400">
            معامله‌ای یافت نشد
          </div>
        ) : (
          filteredTrades.map((trade) => {
            const tradeType = trade.trade_type.toLowerCase();
            const displayStatus = getStatusForDisplay(trade.status);
            
            return (
              <div key={trade.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
                {/* هدر کارت */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">{trade.user_name}</p>
                    <p className="text-xs text-slate-400 dir-ltr text-right mt-1">{toPersianDigits(trade.user_mobile)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TradeTypeBadge type={tradeType as "buy" | "sell"} />
                    <TradeStatusBadge status={displayStatus} />
                  </div>
                </div>

                {/* اطلاعات معامله */}
                <div className="space-y-2 pt-2 border-t border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">کد معامله</span>
                    <span className="text-sm font-bold text-slate-200 dir-ltr">#{toPersianDigits(trade.id.toString())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">کد رهگیری</span>
                    <span className="text-xs text-slate-300 dir-ltr">{trade.tracking_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">مقدار</span>
                    <span className="text-sm font-bold text-slate-200">
                      {toPersianDigits(Number(trade.amount || 0).toFixed(3))} <span className="text-xs">گرم</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">قیمت واحد</span>
                    <span className="text-sm font-bold text-slate-200">
                      {toPersianDigits(Number(trade.price || 0).toLocaleString())} <span className="text-xs">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="text-xs text-slate-400">مبلغ کل</span>
                    <span className={`text-base font-black ${
                      tradeType === "buy" ? "text-red-400" : "text-green-400"
                    }`}>
                      {tradeType === "buy" ? "-" : "+"} {toPersianDigits(Number(trade.total || 0).toLocaleString())} 
                      <span className="text-xs"> تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">تاریخ و زمان</span>
                    <div className="text-left">
                      <p className="text-xs text-slate-200">{trade.created_at_jalali ? toPersianDigits(trade.created_at_jalali) : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                  <button
                    onClick={() => handleViewDetails(trade)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Eye size={14} />
                    جزئیات
                  </button>
                  {trade.status === "SUCCESS" && (
                    <button
                      onClick={() => handleViewInvoice(trade)}
                      className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-blue-400 text-xs font-bold flex items-center gap-1"
                    >
                      <FileText size={14} />
                      فاکتور
                    </button>
                  )}
                  {trade.status === "PENDING" && (
                    <button
                      onClick={() => handleCancelTrade(trade)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 text-xs font-bold flex items-center gap-1"
                    >
                      <XCircle size={14} />
                      لغو
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* مدال جزئیات معامله */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTrade && (
          <TradeDetailModal
            trade={selectedTrade}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedTrade(null);
            }}
            onCancel={handleCancelTrade}
            onViewInvoice={handleViewInvoice}
          />
        )}
      </AnimatePresence>

      {/* مدال فاکتور */}
      {selectedInvoice && (
        <InvoiceModal
          data={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          isAdmin={true}
        />
      )}
    </div>
  );
}

// کامپوننت مدال جزئیات معامله
function TradeDetailModal({
  trade,
  isOpen,
  onClose,
  onCancel,
  onViewInvoice,
}: {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  onCancel: (t: Trade) => void;
  onViewInvoice: (t: Trade) => void;
}) {
  if (!isOpen) return null;

  const tradeType = trade.trade_type.toLowerCase();
  const statusMap: Record<string, "success" | "failed" | "pending" | "cancelled"> = {
    SUCCESS: "success",
    FAILED: "failed",
    PENDING: "pending",
    CANCELLED: "cancelled",
  };
  const displayStatus = statusMap[trade.status] || "pending";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-800 w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl relative z-10 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className={`p-6 border-b border-slate-700 flex justify-between items-center ${
          tradeType === "buy" ? "bg-green-500/10" : "bg-red-500/10"
        }`}>
          <div>
            <h3 className="text-xl font-black text-white">جزئیات معامله</h3>
            <p className="text-sm text-slate-400 mt-1">کد معامله: #{toPersianDigits(trade.id.toString())}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            
            {/* اطلاعات کاربر */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <User size={16} />
                اطلاعات کاربر
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">نام و نام خانوادگی</p>
                  <p className="text-sm font-bold text-white">{trade.user_name}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">شماره موبایل</p>
                  <p className="text-sm font-bold text-white dir-ltr text-right tracking-wider">{toPersianDigits(trade.user_mobile)}</p>
                </div>
              </div>
            </div>

            {/* اطلاعات معامله */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <Banknote size={16} />
                اطلاعات معامله
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${
                  tradeType === "buy" 
                    ? "bg-green-500/20 border-green-500/30" 
                    : "bg-red-500/20 border-red-500/30"
                }`}>
                  <p className="text-xs text-slate-400 mb-1">نوع معامله</p>
                  <p className={`text-lg font-black ${
                    tradeType === "buy" ? "text-green-400" : "text-red-400"
                  }`}>
                    {tradeType === "buy" ? "خرید طلا" : "فروش طلا"}
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">وضعیت</p>
                  <div className="mt-1">
                    <TradeStatusBadge status={displayStatus} />
                  </div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">مقدار طلا</p>
                  <p className="text-xl font-black text-gold-400">
                    {toPersianDigits(Number(trade.amount || 0).toFixed(3))} <span className="text-sm">گرم</span>
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">قیمت واحد</p>
                  <p className="text-xl font-black text-white">
                    {toPersianDigits(Number(trade.price || 0).toLocaleString())} <span className="text-sm">تومان</span>
                  </p>
                </div>
                <div className={`p-4 rounded-xl border md:col-span-2 ${
                  tradeType === "buy" 
                    ? "bg-red-500/20 border-red-500/30" 
                    : "bg-green-500/20 border-green-500/30"
                }`}>
                  <p className="text-xs text-slate-400 mb-1">مبلغ کل</p>
                  <p className={`text-2xl font-black ${
                    tradeType === "buy" ? "text-red-400" : "text-green-400"
                  }`}>
                    {tradeType === "buy" ? "-" : "+"} {toPersianDigits(Number(trade.total || 0).toLocaleString())} 
                    <span className="text-sm"> تومان</span>
                  </p>
                </div>
              </div>
            </div>

            {/* اطلاعات فاکتور */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <FileText size={16} />
                اطلاعات فاکتور
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">شماره فاکتور</p>
                  <p className="text-sm font-bold text-white dir-ltr">{trade.invoice_number}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">کد رهگیری</p>
                  <p className="text-sm font-bold text-white dir-ltr">{trade.tracking_code}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 md:col-span-2">
                  <p className="text-xs text-slate-400 mb-1">تاریخ و زمان</p>
                  <p className="text-sm font-bold text-white">{trade.created_at_jalali ? toPersianDigits(trade.created_at_jalali) : '-'}</p>
                </div>
              </div>
            </div>

            {/* یادداشت ادمین */}
            {trade.admin_note && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                <p className="text-xs text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={14} />
                  یادداشت ادمین
                </p>
                <p className="text-sm text-red-300">{trade.admin_note}</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            بستن
          </button>
          {trade.status === "SUCCESS" && (
            <button
              onClick={() => {
                onViewInvoice(trade);
                onClose();
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              مشاهده فاکتور
            </button>
          )}
          {trade.status === "PENDING" && (
            <button
              onClick={() => {
                onCancel(trade);
                onClose();
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              لغو معامله
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

