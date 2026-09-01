"use client";

import { pageTitle } from "@/lib/brand";

import { useState, useEffect } from "react";
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, 
  Plus, Minus, CreditCard, History, X, Wallet as WalletIcon, AlertCircle, Clock
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import LiveClock from "@/components/dashboard/LiveClock";
import TradeModal from "@/components/dashboard/TradeModal";
import MarketSnapshotBar from "@/components/dashboard/MarketSnapshotBar";
import WelcomeOnboardingModal from "@/components/dashboard/WelcomeOnboardingModal";
import { useGoldPrice } from "@/hooks/useGoldPrice";
import { useTradesStatus } from "@/hooks/useTradesStatus";
import { isBuyAllowed, isSellAllowed } from "@/lib/utils/marketStatus";
import toast from "react-hot-toast";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { walletAPI, Wallet } from "@/lib/api/auth";
import { tradesAPI, Trade, PendingPurchase } from "@/lib/api/trades";

export default function DashboardPage() {
  const [modalType, setModalType] = useState<"buy" | "sell" | null>(null);
  const { prices, loading: priceLoading } = useGoldPrice(10000); // هر 10 ثانیه
  const { status: tradesStatus } = useTradesStatus(15000);
  const buyAllowed = isBuyAllowed(tradesStatus);
  const sellAllowed = isSellAllowed(tradesStatus);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = pageTitle("داشبورد");
  }, []);

  // دریافت موجودی کیف پول
  useEffect(() => {
    walletAPI.getWallet().then(setWallet).catch(() => {
      // خطا را نادیده می‌گیریم
    });
    tradesAPI.getActivePendingPurchase().then((res) => {
      setPendingPurchase(res.pending_purchase);
    }).catch(() => {});
  }, []);

  // دریافت تراکنش‌های اخیر
  useEffect(() => {
    fetchRecentTrades();
  }, []);

  const fetchRecentTrades = async () => {
    setIsLoadingTrades(true);
    try {
      const trades = await tradesAPI.getTrades();
      // فقط 3 معامله آخر و فقط معاملات موفق
      const successfulTrades = trades
        .filter(trade => trade.status === 'SUCCESS')
        .slice(0, 3);
      setRecentTrades(successfulTrades);
    } catch (error) {
      // خطا را نادیده می‌گیریم
    } finally {
      setIsLoadingTrades(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      
      <WelcomeOnboardingModal />

      {pendingPurchase && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="font-bold text-blue-900 text-sm">خرید در انتظار تسویه دارید</p>
              <p className="text-blue-800/80 text-xs mt-0.5 leading-relaxed">
                {toPersianDigits(String(pendingPurchase.gold_amount))} گرم — {pendingPurchase.status_display}.
                تا تکمیل این فرآیند امکان معامله جدید ندارید.
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/wallet?tab=deposit&pending_purchase=${pendingPurchase.id}`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0 w-full sm:w-auto justify-center"
          >
            ادامه تسویه
          </Link>
        </div>
      )}

      {/* بنر موجودی صفر */}
      {wallet && Number(wallet.rial_balance || 0) === 0 && !pendingPurchase && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">موجودی کیف پول شما صفر است</p>
              <p className="text-amber-700/80 text-xs mt-0.5">
                برای خرید طلا، ابتدا کیف پول خود را شارژ کنید.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/wallet?tab=deposit"
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0 w-full sm:w-auto justify-center"
          >
            <WalletIcon size={14} />
            شارژ کیف پول
          </Link>
        </div>
      )}
      
      {/* --- بخش ۱: هدر قیمت‌ها و ساعت --- */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-slate-700">
        
        {/* پترن‌های پس‌زمینه برای زیبایی */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-8">
           
           {/* سطر اول: ساعت زنده (وسط چین) */}
           <div className="flex justify-center">
              <LiveClock />
           </div>

           {/* سطر دوم: باکس‌های قیمت (چیدمان جدید) */}
           <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
              
              {/* باکس راست: خرید (ما می‌فروشیم -> کاربر می‌خرد) */}
              <div 
                onClick={() => {
                  if (!buyAllowed) {
                    toast.error(tradesStatus?.message || "خرید در حال حاضر غیرفعال است");
                    return;
                  }
                  setModalType("buy");
                }}
                className={`w-full md:flex-1 rounded-2xl p-5 text-center transition-all group relative overflow-hidden border ${
                  buyAllowed
                    ? "bg-green-500/10 hover:bg-green-500/20 border-green-500/30 cursor-pointer"
                    : "bg-slate-800/40 border-slate-600/50 cursor-not-allowed opacity-70"
                }`}
              >
                 {!buyAllowed && (
                   <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px]">
                     <span className="text-[11px] font-bold text-amber-200 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full">
                       خرید غیرفعال
                     </span>
                   </div>
                 )}
                 <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                 <div className="flex items-center justify-center gap-2 mb-2 text-green-400">
                    <span className="text-base font-bold">بخرید</span>
                    <ArrowDownRight size={18} />
                 </div>
                 <h2 className="text-3xl font-black text-white tracking-tight group-hover:scale-105 transition-transform drop-shadow-lg">
                   {priceLoading ? (
                     <span className="text-gray-400">در حال بارگذاری...</span>
                   ) : prices ? (
                     toPersianDigits(prices.buy.toLocaleString())
                   ) : (
                     <span className="text-gray-400">-</span>
                   )}
                 </h2>
                 <span className="text-[11px] text-gray-400 mt-1 block">تومان / گرم</span>
              </div>

              {/* وسط: متن "نقدی فردا" (بدون باکس) */}
              <div className="flex flex-col items-center justify-center min-w-[120px]">
                 <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-600 to-transparent mb-2 hidden md:block"></div>
                 <span className="text-gold-400 font-bold text-lg whitespace-nowrap glow-text">
                   نقدی فـردا
                 </span>
                 <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-600 to-transparent mt-2 hidden md:block"></div>
              </div>

              {/* باکس چپ: فروش (ما می‌خریم -> کاربر می‌فروشد) */}
              <div 
                onClick={() => {
                  if (!sellAllowed) {
                    toast.error(tradesStatus?.message || "فروش در حال حاضر غیرفعال است");
                    return;
                  }
                  setModalType("sell");
                }}
                className={`w-full md:flex-1 rounded-2xl p-5 text-center transition-all group relative overflow-hidden border ${
                  sellAllowed
                    ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 cursor-pointer"
                    : "bg-slate-800/40 border-slate-600/50 cursor-not-allowed opacity-70"
                }`}
              >
                 {!sellAllowed && (
                   <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px]">
                     <span className="text-[11px] font-bold text-amber-200 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full">
                       فروش غیرفعال
                     </span>
                   </div>
                 )}
                 <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                 <div className="flex items-center justify-center gap-2 mb-2 text-red-400">
                    <span className="text-base font-bold">بفروشید</span>
                    <ArrowUpRight size={18} />
                 </div>
                 <h2 className="text-3xl font-black text-white tracking-tight group-hover:scale-105 transition-transform drop-shadow-lg">
                   {priceLoading ? (
                     <span className="text-gray-400">در حال بارگذاری...</span>
                   ) : prices ? (
                     toPersianDigits(prices.sell.toLocaleString())
                   ) : (
                     <span className="text-gray-400">-</span>
                   )}
                 </h2>
                 <span className="text-[11px] text-gray-400 mt-1 block">تومان / گرم</span>
              </div>

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
        </div>
      </div>

      {/* --- بخش ۲: دارایی‌ها و دسترسی سریع (کد کامل) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ستون راست: کارت‌های دارایی */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
           
           {/* کارت موجودی طلا */}
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-gold-500/5 rounded-br-full -z-0"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-gold-50 text-gold-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <TrendingUp size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-full">طلای آب‌شده</span>
                </div>
                <p className="text-gray-400 text-sm font-medium mb-1">موجودی طلا</p>
                <h3 className="text-3xl font-black text-gray-800">
                  {wallet ? toPersianDigits(Number(wallet.gold_balance || 0).toFixed(3)) : '۰.۰۰۰'} 
                  <span className="text-sm font-bold text-gray-400"> گرم</span>
                </h3>
                <p className="text-xs text-gray-400 mt-2 dir-ltr text-right">
                  ≈ {wallet && prices ? toPersianDigits((Number(wallet.gold_balance || 0) * prices.sell).toLocaleString()) : '۰'} ریال
                </p>
              </div>
           </div>

           {/* کارت موجودی ریالی */}
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/5 rounded-br-full -z-0"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <CreditCard size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-full">کیف پول</span>
                </div>
                <p className="text-gray-400 text-sm font-medium mb-1">موجودی ریالی</p>
                <h3 className="text-3xl font-black text-gray-800">
                  {wallet ? toPersianDigits(Number(wallet.rial_balance || 0).toLocaleString()) : '۰'} 
                  <span className="text-sm font-bold text-gray-400"> تومان</span>
                </h3>
                <div className="flex gap-2 mt-4">
                    <Link 
                      href="/dashboard/wallet?tab=deposit"
                      className="flex-1 bg-blue-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-blue-500/20 shadow-lg text-center"
                    >
                      واریز
                    </Link>
                    <Link 
                      href="/dashboard/wallet?tab=withdraw"
                      className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl hover:bg-gray-200 transition-colors text-center"
                    >
                      برداشت
                    </Link>
                </div>
              </div>
           </div>

        </div>

        {/* ستون چپ: اکشن‌های سریع */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center gap-4">
           <p className="font-bold text-gray-700 text-sm px-1">دسترسی سریع</p>
           
           <button onClick={() => setModalType("buy")} className="flex items-center justify-between bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-2xl transition-all group w-full border border-green-100 hover:shadow-lg hover:shadow-green-100">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><Plus size={20} /></div>
                 <span className="font-bold text-lg">خرید طلا</span>
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
           </button>

           <button onClick={() => setModalType("sell")} className="flex items-center justify-between bg-red-50 hover:bg-red-100 text-red-700 p-4 rounded-2xl transition-all group w-full border border-red-100 hover:shadow-lg hover:shadow-red-100">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><Minus size={20} /></div>
                 <span className="font-bold text-lg">فروش طلا</span>
              </div>
              <ArrowDownRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
           </button>
        </div>

      </div>

      {/* --- بخش ۳: لیست تراکنش‌های اخیر (کد کامل) --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
               <History size={20} className="text-gray-400" />
               تراکنش‌های اخیر
            </h3>
            <Link href="/dashboard/history" className="text-xs text-gold-600 font-bold hover:text-gold-700 bg-gold-50 px-3 py-1.5 rounded-lg border border-gold-100">مشاهده همه</Link>
         </div>
         
         <div className="divide-y divide-gray-50">
            {isLoadingTrades ? (
              <div className="p-5 text-center text-gray-400 text-sm">در حال بارگذاری...</div>
            ) : recentTrades.length === 0 ? (
              <div className="p-5 text-center text-gray-400 text-sm">هنوز تراکنشی ثبت نشده است</div>
            ) : (
              recentTrades.map((trade) => {
                const isSell = trade.trade_type.toLowerCase() === 'sell';
                const dateTime = trade.created_at_jalali ? trade.created_at_jalali.split(' ') : ['-', '-'];
                return (
                  <div key={trade.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-default">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isSell ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-green-50 text-green-500 group-hover:bg-green-100'}`}>
                        {isSell ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-base">{isSell ? 'فروش طلا' : 'خرید طلا'}</p>
                        <p className="text-xs text-gray-400 mt-1 font-medium">
                          {toPersianDigits(dateTime[0] || '-')} {dateTime[1] ? `- ${toPersianDigits(dateTime[1])}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-gray-800 text-base">
                        {toPersianDigits(Number(trade.amount || 0).toFixed(3))} <span className="text-xs text-gray-400 font-medium">گرم</span>
                      </p>
                      <p className={`text-xs font-bold mt-1 ${isSell ? 'text-green-500' : 'text-red-500'}`}>
                        {isSell ? '+' : '-'} {toPersianDigits(Number(trade.total || 0).toLocaleString())} ریال
                      </p>
                    </div>
                  </div>
                );
              })
            )}
         </div>
      </div>

      {/* --- بخش ۴: مدال ساده --- */}
      <TradeModal 
        isOpen={!!modalType} // اگر modalType نال نباشد true می‌شود
        onClose={() => setModalType(null)}
        type={modalType || "buy"} // پیش‌فرض buy است تا تایپ‌اسکریپت گیر ندهد
        price={modalType === "buy" ? (prices?.buy || 0) : (prices?.sell || 0)} // قیمت خرید یا فروش از API
        buyEnabled={buyAllowed}
        sellEnabled={sellAllowed}
      />
    </div>
  );
}
