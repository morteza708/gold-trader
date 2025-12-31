"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, Clock, X, 
  AlertCircle, CheckCircle2, Loader2,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { tradesAPI, Order } from "@/lib/api/trades";
import { useGoldPrice } from "@/hooks/useGoldPrice";
import { useTradesStatus } from "@/hooks/useTradesStatus";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { walletAPI, Wallet } from "@/lib/api/auth";

export default function TradePage() {
  const { prices, loading: priceLoading } = useGoldPrice(5000);
  const { status: tradesStatus } = useTradesStatus(5000);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "معامله هوشمند | پلتفرم معاملات طلا";
  }, []);
  
  // فرم ایجاد سفارش
  const [orderType, setOrderType] = useState<"BUY_LIMIT" | "SELL_LIMIT">("BUY_LIMIT");
  const [targetPrice, setTargetPrice] = useState("");
  const [amount, setAmount] = useState("");

  // دریافت داده‌ها
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [walletData, ordersData] = await Promise.all([
        walletAPI.getWallet(),
        tradesAPI.getOrders(),
      ]);
      setWallet(walletData);
      setOrders(ordersData);
    } catch (error: any) {
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  // محاسبه قیمت هدف پیشنهادی
  const getSuggestedPrice = () => {
    if (!prices) return 0;
    if (orderType === "BUY_LIMIT") {
      // برای خرید: 5% کمتر از قیمت فعلی
      return Math.floor(prices.buy * 0.95);
    } else {
      // برای فروش: 5% بیشتر از قیمت فعلی
      return Math.floor(prices.sell * 1.05);
    }
  };

  // اعمال قیمت پیشنهادی
  const handleApplySuggestedPrice = () => {
    const suggested = getSuggestedPrice();
    setTargetPrice(toPersianDigits(suggested.toLocaleString()));
  };

  // ایجاد سفارش
  const handleCreateOrder = async () => {
    if (!targetPrice || !amount) {
      return toast.error("لطفا قیمت هدف و مقدار را وارد کنید");
    }

    if (!tradesStatus?.trades_enabled) {
      return toast.error("معاملات در حال حاضر غیرفعال است");
    }

    const targetPriceNum = Number(toEnglishDigits(targetPrice).replace(/,/g, ""));
    const amountNum = Number(toEnglishDigits(amount));

    if (targetPriceNum <= 0 || amountNum <= 0) {
      return toast.error("مقادیر باید بیشتر از صفر باشند");
    }

    // بررسی قیمت هدف
    if (orderType === "BUY_LIMIT" && prices && targetPriceNum >= prices.buy) {
      return toast.error("قیمت هدف باید کمتر از قیمت فعلی خرید باشد");
    }
    if (orderType === "SELL_LIMIT" && prices && targetPriceNum <= prices.sell) {
      return toast.error("قیمت هدف باید بیشتر از قیمت فعلی فروش باشد");
    }

    setIsSubmitting(true);
    try {
      await tradesAPI.createOrder({
        order_type: orderType,
        target_price: targetPriceNum,
        amount: amountNum,
      });
      
      toast.success("سفارش با موفقیت ثبت شد");
      setTargetPrice("");
      setAmount("");
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "خطا در ثبت سفارش";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // لغو سفارش
  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این سفارش را لغو کنید؟")) {
      return;
    }

    try {
      await tradesAPI.cancelOrder(orderId);
      toast.success("سفارش با موفقیت لغو شد");
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "خطا در لغو سفارش";
      toast.error(errorMessage);
    }
  };

  // نمایش وضعیت سفارش
  const getStatusBadge = (status: Order["status"]) => {
    const statusConfig = {
      PENDING: { label: "در انتظار", color: "bg-blue-100 text-blue-700", icon: Clock },
      SUSPENDED: { label: "معلق", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
      EXECUTED: { label: "اجرا شده", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
      CANCELLED: { label: "لغو شده", color: "bg-gray-100 text-gray-700", icon: X },
      EXPIRED: { label: "منقضی شده", color: "bg-red-100 text-red-700", icon: X },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      
      {/* هدر */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-2xl">
        <h1 className="text-2xl font-black mb-2">معاملات هوشمند</h1>
        <p className="text-gray-300 text-sm">
          سفارش خود را ثبت کنید و وقتی قیمت به هدف رسید، به صورت خودکار اجرا می‌شود
        </p>
      </div>

      {/* نمایش وضعیت معاملات */}
      {tradesStatus && !tradesStatus.trades_enabled && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <div>
              <p className="font-bold text-red-800">معاملات غیرفعال است</p>
              <p className="text-sm text-red-600">
                در حال حاضر امکان ثبت سفارش جدید وجود ندارد.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* نمایش سفارشات معلق */}
      {orders.filter(o => o.status === "SUSPENDED").length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="text-yellow-500" size={20} />
            <div>
              <p className="font-bold text-yellow-800">
                {orders.filter(o => o.status === "SUSPENDED").length} سفارش معلق است
              </p>
              <p className="text-sm text-yellow-600">
                این سفارشات تا زمانی که معاملات فعال شود، اجرا نخواهند شد.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ستون راست: فرم ایجاد سفارش */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* فرم ایجاد سفارش */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-black text-gray-800 mb-6">ثبت سفارش جدید</h2>
            
            {/* نوع سفارش */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                نوع سفارش
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOrderType("BUY_LIMIT")}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    orderType === "BUY_LIMIT"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingDown size={20} />
                    <span className="font-bold">خرید در قیمت پایین</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    وقتی قیمت به {prices ? toPersianDigits(prices.buy.toLocaleString()) : "-"} ریال یا کمتر برسد
                  </p>
                </button>
                
                <button
                  onClick={() => setOrderType("SELL_LIMIT")}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    orderType === "SELL_LIMIT"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp size={20} />
                    <span className="font-bold">فروش در قیمت بالا</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    وقتی قیمت به {prices ? toPersianDigits(prices.sell.toLocaleString()) : "-"} ریال یا بیشتر برسد
                  </p>
                </button>
              </div>
            </div>

            {/* قیمت هدف */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                قیمت هدف (ریال)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={targetPrice}
                  onChange={(e) => {
                    const english = toEnglishDigits(e.target.value);
                    const formatted = english.replace(/,/g, "").replace(/[^0-9]/g, "");
                    setTargetPrice(toPersianDigits(formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",")));
                  }}
                  placeholder="قیمت هدف را وارد کنید"
                  className="flex-1"
                />
                <Button
                  onClick={handleApplySuggestedPrice}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  قیمت پیشنهادی
                </Button>
              </div>
              {targetPrice && (
                <p className="text-xs text-gray-500 mt-2">
                  قیمت پیشنهادی: {toPersianDigits(getSuggestedPrice().toLocaleString())} ریال
                </p>
              )}
            </div>

            {/* مقدار */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                مقدار طلا (گرم)
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const english = toEnglishDigits(e.target.value);
                  const formatted = english.replace(/[^0-9.]/g, "");
                  setAmount(formatted);
                }}
                placeholder="0.000"
              />
              {wallet && (
                <p className="text-xs text-gray-500 mt-2">
                  موجودی: {toPersianDigits(Number(wallet.gold_balance).toFixed(3))} گرم
                </p>
              )}
            </div>

            {/* دکمه ثبت */}
            <Button
              onClick={handleCreateOrder}
              disabled={isSubmitting || !tradesStatus?.trades_enabled || !targetPrice || !amount}
              className="w-full py-4 text-lg"
            >
              {isSubmitting ? "در حال ثبت..." : "ثبت سفارش"}
            </Button>
          </div>

          {/* لیست سفارشات */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-black text-gray-800 mb-6">سفارشات من</h2>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>هنوز سفارشی ثبت نشده است</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {orders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 border border-gray-200 rounded-2xl hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {order.order_type === "BUY_LIMIT" ? (
                              <ArrowDownRight className="text-green-500 shrink-0" size={20} />
                            ) : (
                              <ArrowUpRight className="text-red-500 shrink-0" size={20} />
                            )}
                            <span className="font-bold text-gray-800 whitespace-nowrap">
                              {order.order_type === "BUY_LIMIT" ? "خرید در قیمت پایین" : "فروش در قیمت بالا"}
                            </span>
                            <div className="shrink-0">
                              {getStatusBadge(order.status)}
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-500 whitespace-nowrap">قیمت هدف:</span>
                              <span className="font-bold text-gray-800 text-left whitespace-nowrap">
                                {toPersianDigits(Number(order.target_price).toLocaleString())} ریال
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-500 whitespace-nowrap">مقدار:</span>
                              <span className="font-bold text-gray-800 text-left whitespace-nowrap">
                                {toPersianDigits(Number(order.amount).toFixed(3))} گرم
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-500 whitespace-nowrap">تاریخ ثبت:</span>
                              <span className="font-bold text-gray-800 text-left whitespace-nowrap">
                                {toPersianDigits(order.created_at_jalali || '-')}
                              </span>
                            </div>
                            {order.executed_trade && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500 whitespace-nowrap">کد رهگیری:</span>
                                <span className="font-bold text-gray-800 text-left whitespace-nowrap dir-ltr">
                                  {order.executed_trade.tracking_code}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {order.status === "PENDING" || order.status === "SUSPENDED" ? (
                          <Button
                            onClick={() => handleCancelOrder(order.id)}
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                          >
                            لغو
                          </Button>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ستون چپ: اطلاعات قیمت */}
        <div className="space-y-6">
          
          {/* کارت قیمت فعلی */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-800 mb-4">قیمت فعلی</h3>
            
            {priceLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : prices ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">قیمت خرید</span>
                    <TrendingDown className="text-green-500" size={18} />
                  </div>
                  <p className="text-2xl font-black text-green-700">
                    {toPersianDigits(prices.buy.toLocaleString())}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">ریال / گرم</p>
                </div>
                
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">قیمت فروش</span>
                    <TrendingUp className="text-red-500" size={18} />
                  </div>
                  <p className="text-2xl font-black text-red-700">
                    {toPersianDigits(prices.sell.toLocaleString())}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">ریال / گرم</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">قیمت در دسترس نیست</p>
            )}
          </div>

          {/* کارت موجودی */}
          {wallet && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-black text-gray-800 mb-4">موجودی</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">موجودی طلا:</span>
                  <p className="text-xl font-black text-gray-800 mt-1">
                    {toPersianDigits(Number(wallet.gold_balance).toFixed(3))} گرم
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">موجودی ریالی:</span>
                  <p className="text-xl font-black text-gray-800 mt-1">
                    {toPersianDigits(wallet.rial_balance.toLocaleString())} ریال
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
