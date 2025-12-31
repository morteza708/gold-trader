"use client";

import { useState, useEffect } from "react";
import { X, ArrowDown, Wallet, TrendingUp, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { tradesAPI } from "@/lib/api/trades";
import { walletAPI } from "@/lib/api/auth";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

interface TradeModalProps {
  type: "buy" | "sell";
  isOpen: boolean;
  onClose: () => void;
  price: number; // قیمت واحد
  tradesEnabled?: boolean; // وضعیت معاملات
}

export default function TradeModal({ type, isOpen, onClose, price, tradesEnabled = true }: TradeModalProps) {
  const [weight, setWeight] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wallet, setWallet] = useState<{ rial_balance: number; gold_balance: number } | null>(null);
  const { refreshUser } = useAuth();

  // دریافت موجودی کیف پول
  useEffect(() => {
    if (isOpen) {
      walletAPI.getWallet().then(setWallet).catch(() => {
        toast.error('خطا در دریافت موجودی');
      });
    }
  }, [isOpen]);

  // ریست کردن فرم وقتی مودال باز/بسته میشه
  useEffect(() => {
    setWeight("");
    setTotalPrice("");
  }, [isOpen]);

  if (!isOpen) return null;

  // رنگ‌بندی بر اساس نوع معامله
  const theme = type === "buy" 
    ? { color: "green", label: "خرید طلا", action: "پرداخت و خرید", bg: "bg-green-500", text: "text-green-600", border: "border-green-200" } 
    : { color: "red", label: "فروش طلا", action: "فروش و دریافت وجه", bg: "bg-red-500", text: "text-red-600", border: "border-red-200" };

  // توابع کمکی فرمت پول
  const formatNumber = (num: string) => num.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const parseNumber = (num: string) => Number(num.replace(/,/g, ""));

  // هندلر تغییر وزن (محاسبه قیمت) - با پشتیبانی از اعداد فارسی
  const handleWeightChange = (val: string) => {
    // تبدیل فارسی به انگلیسی
    const englishVal = toEnglishDigits(val);
    const rawVal = englishVal.replace(/[^0-9.]/g, ""); // فقط عدد و ممیز
    setWeight(rawVal);
    
    if (rawVal) {
      const calculatedPrice = Number(rawVal) * price;
      setTotalPrice(formatNumber(Math.floor(calculatedPrice).toString()));
    } else {
      setTotalPrice("");
    }
  };

  // هندلر تغییر قیمت (محاسبه وزن) - با پشتیبانی از اعداد فارسی
  const handlePriceChange = (val: string) => {
    // تبدیل فارسی به انگلیسی
    const englishVal = toEnglishDigits(val);
    const rawVal = englishVal.replace(/,/g, "").replace(/[^0-9]/g, "");
    setTotalPrice(formatNumber(rawVal));

    if (rawVal) {
      const calculatedWeight = Number(rawVal) / price;
      // نمایش تا ۳ رقم اعشار برای وزن
      setWeight(calculatedWeight.toFixed(3));
    } else {
      setWeight("");
    }
  };

  const handleSubmit = async () => {
    if (!weight || !totalPrice) {
      return toast.error("لطفا مبلغ یا وزن را وارد کنید");
    }

    // بررسی فعال بودن معاملات
    if (!tradesEnabled) {
      return toast.error("معاملات در حال حاضر غیرفعال است");
    }

    const amount = Number(weight);
    if (amount <= 0) {
      return toast.error("مقدار باید بیشتر از صفر باشد");
    }

    setIsLoading(true);
    try {
      if (type === 'buy') {
        await tradesAPI.buyGold(amount);
        toast.success('خرید با موفقیت انجام شد');
      } else {
        await tradesAPI.sellGold(amount);
        toast.success('فروش با موفقیت انجام شد');
      }
      
      // به‌روزرسانی موجودی
      refreshUser();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'خطا در انجام معامله';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-6 pb-8 ${theme.bg} text-white relative`}>
          <button onClick={onClose} className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white">
            <X size={20} />
          </button>
          
          <div className="text-center mt-2">
            <h3 className="text-xl font-black mb-1">{theme.label}</h3>
            <p className="text-white/80 text-sm flex items-center justify-center gap-1">
              نرخ اعمال شده: 
              <span className="font-bold text-white text-base">{toPersianDigits(price.toLocaleString())}</span> 
              <span className="text-xs">ریال</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 -mt-6 bg-white rounded-t-3xl relative">
          
          {/* Inputs Section */}
          <div className="space-y-4">
            
            {/* 1. ورودی وزن (طلا) */}
            <div className="bg-gray-50 border-2 border-gray-100 focus-within:border-gold-400 rounded-2xl p-3 transition-colors">
              <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                <span>مقدار طلا (گرم)</span>
                <span className="flex items-center gap-1 text-gold-600">
                  <TrendingUp size={12}/> موجودی: {wallet ? toPersianDigits(Number(wallet.gold_balance || 0).toFixed(3)) : '-'} گرم
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={toPersianDigits(weight)}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="0.000"
                  className="w-full bg-transparent text-2xl font-black text-gray-800 outline-none placeholder:text-gray-300 dir-ltr text-left"
                />
                <span className="text-sm font-bold text-gray-500 bg-white px-2 py-1 rounded-lg shadow-sm">گرم</span>
              </div>
            </div>

            {/* آیکون فلش وسط */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border border-gray-100 p-1.5 rounded-full shadow-sm text-gray-400">
                <ArrowDown size={16} />
              </div>
            </div>

            {/* 2. ورودی مبلغ (تومان) */}
            <div className={`bg-gray-50 border-2 ${theme.border} rounded-2xl p-3 transition-colors`}>
              <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                <span>مبلغ کل (ریال)</span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Wallet size={12}/> موجودی: {wallet ? toPersianDigits(Number(wallet.rial_balance || 0).toLocaleString()) : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={toPersianDigits(totalPrice)}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0"
                  className={`w-full bg-transparent text-2xl font-black ${theme.text} outline-none placeholder:text-gray-300 dir-ltr text-left`}
                />
                <span className="text-sm font-bold text-gray-500 bg-white px-2 py-1 rounded-lg shadow-sm">ریال</span>
              </div>
            </div>

          </div>

          {/* درصدها (Quick Presets) */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[25, 50, 75, 100].map((percent) => (
              <button 
                key={percent}
                onClick={() => {
                   if (!wallet) return;
                   const maxBalance = type === 'buy' 
                     ? Number(wallet.rial_balance || 0) 
                     : Number(wallet.gold_balance || 0); 
                   if(type === 'buy') {
                     handlePriceChange(Math.floor(maxBalance * (percent/100)).toString());
                   } else {
                     handleWeightChange((maxBalance * (percent/100)).toFixed(3));
                   }
                }}
                disabled={!wallet}
                className="text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {percent}%
              </button>
            ))}
          </div>

          {/* فاکتور نهایی */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>کارمزد معامله (۰٪)</span>
              <span className="font-bold">۰ ریال</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>مالیات بر ارزش افزوده</span>
              <span className="font-bold">۰ ریال</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between items-center text-gray-800">
              <span className="font-bold">مبلغ نهایی پرداخت</span>
              <span className={`text-lg font-black ${theme.text}`}>
                {totalPrice ? toPersianDigits(totalPrice) : "0"} <span className="text-xs text-gray-500 font-medium">ریال</span>
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || !totalPrice || !tradesEnabled}
            className={`w-full mt-6 py-4 text-lg justify-center shadow-lg hover:shadow-xl transition-shadow ${type === 'buy' ? '!bg-green-500 hover:!bg-green-600' : '!bg-red-500 hover:!bg-red-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {!tradesEnabled ? "معاملات غیرفعال است" : isLoading ? "در حال پردازش..." : theme.action}
          </Button>
          
          <div className="text-center mt-3 flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Info size={12} />
            تضمین امنیت معامله توسط بانک مرکزی
          </div>

        </div>
      </div>
    </div>
  );
}
