"use client";

import { useState, useEffect } from "react";
import { 
  Power, Users, Activity, Lock, TrendingUp, Loader2, AlertCircle,
  X, AlertTriangle, CheckCircle2, UserPlus, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import LiveClock from "@/components/dashboard/LiveClock";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { adminTradesAPI } from "@/lib/api/trades";
import { adminAPI } from "@/lib/api/auth";
import { useGoldPrice } from "@/hooks/useGoldPrice";
import { useTradesStatus } from "@/hooks/useTradesStatus";

export default function AdminDashboard() {
  const { prices, loading: priceLoading } = useGoldPrice(5000);
  const { status: tradesStatus, loading: statusLoading } = useTradesStatus(5000);
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null);
  
  // آمار dashboard
  const [stats, setStats] = useState({
    total_users: 0,
    new_users_today: 0,
    trades_today_count: 0,
    trades_today_volume: 0,
    revenue_today: 0,
    pending_requests: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "اتاق فرمان | پنل مدیریت";
  }, []);

  // دریافت آمار dashboard
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const data = await adminAPI.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      console.error("خطا در دریافت آمار dashboard:", error);
      // در صورت خطا، آمار قبلی حفظ می‌شود
    } finally {
      setStatsLoading(false);
    }
  };

  // بارگذاری اولیه و auto-refresh هر 30 ثانیه
  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000); // هر 30 ثانیه
    return () => clearInterval(interval);
  }, []);

  const handleToggleClick = () => {
    if (isToggling) return;
    
    const newStatus = !tradesStatus?.trades_enabled;
    setPendingStatus(newStatus);
    
    // نمایش مودال تایید برای خاموش کردن
    if (!newStatus) {
      setShowConfirmModal(true);
    } else {
      // برای روشن کردن، مستقیماً اجرا می‌کنیم
      executeToggle(newStatus);
    }
  };

  const executeToggle = async (newStatus: boolean) => {
    setIsToggling(true);
    setShowConfirmModal(false);
    
    try {
      const response = await adminTradesAPI.toggleTradesStatus(newStatus);
      
      if (newStatus) {
        toast.success(
          `معاملات فعال شد. ${response.resumed_orders} سفارش دوباره فعال شد.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `معاملات غیرفعال شد. ${response.suspended_orders} سفارش معلق شد.`,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'خطا در تغییر وضعیت معاملات';
      toast.error(errorMessage);
    } finally {
      setIsToggling(false);
      setPendingStatus(null);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus !== null) {
      executeToggle(pendingStatus);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      
      {/* هدر: عنوان و ساعت وسط‌چین */}
      <div className="relative flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
         <h1 className="text-2xl font-black text-white order-2 md:order-1">اتاق فرمان</h1>
         
         {/* ساعت دقیق (وسط صفحه در دسکتاپ) */}
         <div className="order-1 md:absolute md:left-1/2 md:-translate-x-1/2">
            <LiveClock />
         </div>
      </div>

      {/* پنل کنترل اصلی (Kill Switch) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* 1. سوئیچ بازار */}
         <div className={`rounded-3xl p-8 border-2 transition-all flex flex-col items-center justify-center gap-6 text-center shadow-2xl ${
           statusLoading ? "bg-gray-500/10 border-gray-500/50" :
           tradesStatus?.trades_enabled ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50"
         }`}>
            <div 
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 border-4 border-slate-900 ${
                statusLoading ? "bg-gray-500 shadow-gray-500/40 cursor-not-allowed" :
                tradesStatus?.trades_enabled ? "bg-green-500 shadow-green-500/40" : "bg-red-500 shadow-red-500/40"
              }`} 
              onClick={handleToggleClick}
            >
               {isToggling ? (
                  <Loader2 size={32} className="text-white animate-spin" />
               ) : (
                  <Power size={48} className="text-white" />
               )}
            </div>
            <div>
               {statusLoading ? (
                  <>
                     <h3 className="text-2xl font-black text-gray-400">در حال بارگذاری...</h3>
                     <p className="text-gray-500 text-sm mt-2">لطفاً صبر کنید</p>
                  </>
               ) : (
                  <>
                     <h3 className={`text-2xl font-black ${tradesStatus?.trades_enabled ? "text-green-400" : "text-red-400"}`}>
                        {tradesStatus?.trades_enabled ? "بازار باز است" : "بازار بسته است"}
                     </h3>
                     <p className="text-slate-300 text-sm mt-2">
                        {tradesStatus?.trades_enabled ? "کاربران مجاز به ثبت سفارش هستند" : "هیچ سفارشی ثبت نخواهد شد"}
                     </p>
                  </>
               )}
            </div>
         </div>

         {/* 2. نمایش قیمت‌ها (فقط خواندنی) */}
         <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col justify-center gap-4">
            <div className="flex justify-between items-center text-slate-400 text-sm mb-2">
               <span>نرخ زنده (دریافت از API)</span>
               {priceLoading ? (
                  <span className="flex items-center gap-1 text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                     <Loader2 size={12} className="animate-spin" /> Loading...
                  </span>
               ) : prices ? (
                  <span className="flex items-center gap-1 text-green-400 bg-green-900/30 px-2 py-1 rounded">
                     Connected <Activity size={12}/>
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
               </>
            ) : (
               <div className="bg-slate-900 rounded-2xl p-4 flex justify-center items-center border border-slate-700">
                  <span className="text-slate-400">قیمت در دسترس نیست</span>
               </div>
            )}
         </div>

      </div>

      {/* آمار زنده */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         {[
            { 
               title: "کاربران کل", 
               value: statsLoading ? "..." : toPersianDigits(stats.total_users.toLocaleString()), 
               icon: Users, 
               color: "text-blue-400" 
            },
            { 
               title: "کاربران جدید امروز", 
               value: statsLoading ? "..." : toPersianDigits(stats.new_users_today.toString()), 
               icon: UserPlus, 
               color: "text-purple-400" 
            },
            { 
               title: "معاملات امروز", 
               value: statsLoading ? "..." : toPersianDigits(stats.trades_today_count.toString()), 
               icon: TrendingUp, 
               color: "text-green-400" 
            },
            { 
               title: "حجم معاملات امروز", 
               value: statsLoading ? "..." : `${toPersianDigits(stats.trades_today_volume.toFixed(2))} گرم`, 
               icon: Activity, 
               color: "text-gold-400" 
            },
            { 
               title: "درآمد امروز", 
               value: statsLoading ? "..." : `${toPersianDigits(stats.revenue_today.toLocaleString())} ریال`, 
               icon: DollarSign, 
               color: "text-emerald-400" 
            },
            { 
               title: "منتظر تایید", 
               value: statsLoading ? "..." : toPersianDigits(stats.pending_requests.toString()), 
               icon: Lock, 
               color: "text-orange-400" 
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

      {/* مودال تایید تغییر وضعیت معاملات */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-700 bg-red-500/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">تایید غیرفعال کردن معاملات</h3>
                    <p className="text-sm text-slate-400 mt-1">این عمل قابل بازگشت است</p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-400 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-white font-bold mb-2">توجه!</p>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        با غیرفعال کردن معاملات:
                      </p>
                      <ul className="text-slate-300 text-sm mt-2 space-y-1 list-disc list-inside">
                        <li>کاربران نمی‌توانند معامله جدید ثبت کنند</li>
                        <li>تمام سفارشات در انتظار (Limit Orders) معلق می‌شوند</li>
                        <li>سفارشات معلق تا زمان فعال شدن معاملات اجرا نخواهند شد</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">آیا مطمئن هستید که می‌خواهید معاملات را غیرفعال کنید؟</p>
                  <p className="text-white font-bold">
                    می‌توانید در هر زمان معاملات را دوباره فعال کنید
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-700 flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isToggling}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  انصراف
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isToggling}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isToggling ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Power size={18} />
                      غیرفعال کردن
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
