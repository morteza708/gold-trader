"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowDown, Wallet, TrendingUp, Info, Clock, ShieldAlert } from "lucide-react";
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
  price: number;
  tradesEnabled?: boolean;
}

export default function TradeModal({ type, isOpen, onClose, price, tradesEnabled = true }: TradeModalProps) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wallet, setWallet] = useState<{
    rial_balance: number;
    gold_balance: number;
    available_rial_balance?: number;
    pending_trade_rial?: number;
  } | null>(null);
  const [showPendingInfo, setShowPendingInfo] = useState(false);
  const [agreedPending, setAgreedPending] = useState(false);
  const [hasActivePending, setHasActivePending] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      walletAPI.getWallet().then(setWallet).catch(() => {
        toast.error("خطا در دریافت موجودی");
      });
      tradesAPI.getActivePendingPurchase().then((res) => {
        setHasActivePending(!!res.pending_purchase);
      }).catch(() => setHasActivePending(false));
    }
  }, [isOpen]);

  useEffect(() => {
    setWeight("");
    setTotalPrice("");
    setShowPendingInfo(false);
    setAgreedPending(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const availableRial = wallet
    ? Number(wallet.available_rial_balance ?? wallet.rial_balance ?? 0)
    : 0;

  const theme = type === "buy"
    ? { color: "green", label: "خرید طلا", action: "پرداخت و خرید", bg: "bg-green-500", text: "text-green-600", border: "border-green-200" }
    : { color: "red", label: "فروش طلا", action: "فروش و دریافت وجه", bg: "bg-red-500", text: "text-red-600", border: "border-red-200" };

  const formatNumber = (num: string) => num.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const handleWeightChange = (val: string) => {
    const englishVal = toEnglishDigits(val);
    const rawVal = englishVal.replace(/[^0-9.]/g, "");
    setWeight(rawVal);
    setShowPendingInfo(false);
    setAgreedPending(false);
    if (rawVal) {
      const calculatedPrice = Number(rawVal) * price;
      setTotalPrice(formatNumber(Math.floor(calculatedPrice).toString()));
    } else {
      setTotalPrice("");
    }
  };

  const handlePriceChange = (val: string) => {
    const englishVal = toEnglishDigits(val);
    const rawVal = englishVal.replace(/,/g, "").replace(/[^0-9]/g, "");
    setTotalPrice(formatNumber(rawVal));
    setShowPendingInfo(false);
    setAgreedPending(false);
    if (rawVal) {
      const calculatedWeight = Number(rawVal) / price;
      setWeight(calculatedWeight.toFixed(3));
    } else {
      setWeight("");
    }
  };

  const neededTotal = totalPrice ? Number(totalPrice.replace(/,/g, "")) : 0;
  const shortfall = type === "buy" ? Math.max(0, neededTotal - availableRial) : 0;
  const needsPendingSettlement = type === "buy" && neededTotal > 0 && shortfall > 0;

  const handleSubmit = async () => {
    if (!weight || !totalPrice) {
      return toast.error("لطفا مبلغ یا وزن را وارد کنید");
    }
    if (!tradesEnabled) {
      return toast.error("معاملات در حال حاضر غیرفعال است");
    }
    if (hasActivePending) {
      return toast.error("شما یک خرید در انتظار تسویه دارید. ابتدا آن را تکمیل یا لغو کنید.");
    }

    const amount = Number(weight);
    if (amount <= 0) {
      return toast.error("مقدار باید بیشتر از صفر باشد");
    }

    if (needsPendingSettlement && !showPendingInfo) {
      setShowPendingInfo(true);
      return;
    }
    if (needsPendingSettlement && !agreedPending) {
      return toast.error("لطفاً شرایط خرید معلق را تأیید کنید");
    }

    setIsLoading(true);
    try {
      if (type === "buy") {
        if (needsPendingSettlement) {
          const result = await tradesAPI.createPendingPurchase(amount);
          toast.success("خرید معلق ثبت شد — به کیف پول منتقل می‌شوید");
          refreshUser();
          onClose();
          router.push(result.redirect_to || `/dashboard/wallet?tab=deposit&pending_purchase=${result.pending_purchase.id}`);
          return;
        }
        await tradesAPI.buyGold(amount);
        toast.success("خرید با موفقیت انجام شد");
      } else {
        await tradesAPI.sellGold(amount);
        toast.success("فروش با موفقیت انجام شد");
      }
      refreshUser();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در انجام معامله");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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

        <div className="p-6 -mt-6 bg-white rounded-t-3xl relative">
          {hasActivePending && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-xs text-amber-900 leading-relaxed">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                یک خرید در انتظار تسویه دارید. تا تکمیل فرآیند، معامله جدید ممکن نیست.{" "}
                <button
                  type="button"
                  className="font-bold underline"
                  onClick={() => {
                    onClose();
                    router.push("/dashboard/wallet?tab=deposit");
                  }}
                >
                  ادامه تسویه
                </button>
              </span>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-gray-50 border-2 border-gray-100 focus-within:border-gold-400 rounded-2xl p-3 transition-colors">
              <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                <span>مقدار طلا (گرم)</span>
                <span className="flex items-center gap-1 text-gold-600">
                  <TrendingUp size={12} /> موجودی: {wallet ? toPersianDigits(Number(wallet.gold_balance || 0).toFixed(3)) : "-"} گرم
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

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border border-gray-100 p-1.5 rounded-full shadow-sm text-gray-400">
                <ArrowDown size={16} />
              </div>
            </div>

            <div className={`bg-gray-50 border-2 ${theme.border} rounded-2xl p-3 transition-colors`}>
              <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                <span>مبلغ کل (ریال)</span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Wallet size={12} /> قابل استفاده: {toPersianDigits(availableRial.toLocaleString())}
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

          <div className="grid grid-cols-4 gap-2 mt-4">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => {
                  if (!wallet) return;
                  const maxBalance = type === "buy" ? availableRial : Number(wallet.gold_balance || 0);
                  if (type === "buy") {
                    handlePriceChange(Math.floor(maxBalance * (percent / 100)).toString());
                  } else {
                    handleWeightChange((maxBalance * (percent / 100)).toFixed(3));
                  }
                }}
                disabled={!wallet}
                className="text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {percent}%
              </button>
            ))}
          </div>

          {needsPendingSettlement && showPendingInfo && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2 text-xs text-blue-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1">
                <Clock size={14} /> خرید با تسویه بعدی
              </p>
              <p>
                موجودی قابل‌استفاده شما کمتر از مبلغ خرید است. می‌توانید همین حالا خرید را با{" "}
                <strong>قیمت قفل‌شده فعلی</strong> ثبت کنید و کسری را واریز نمایید.
              </p>
              <ul className="list-disc pr-4 space-y-1">
                <li>مبلغ کل قفل‌شده: {toPersianDigits(neededTotal.toLocaleString())} ریال</li>
                <li>سهم کیف پول: {toPersianDigits(Math.min(availableRial, neededTotal).toLocaleString())} ریال</li>
                <li>حداقل واریز لازم: {toPersianDigits(shortfall.toLocaleString())} ریال</li>
                <li>طلا پس از تأیید واریز به کیف اضافه می‌شود</li>
                <li>حدود ۴ ساعت برای تکمیل فرآیند فرصت دارید</li>
              </ul>
              <label className="flex items-start gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreedPending}
                  onChange={(e) => setAgreedPending(e.target.checked)}
                />
                <span>
                  متوجه شدم: قیمت قفل می‌شود، تا تسویه معامله جدید ندارم، و طلا بعد از تأیید واریز آزاد می‌شود.
                </span>
              </label>
            </div>
          )}

          {needsPendingSettlement && !showPendingInfo && (
            <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
              موجودی کافی نیست. می‌توانید با «تسویه بعدی» ادامه دهید (کسری:{" "}
              {toPersianDigits(shortfall.toLocaleString())} ریال).
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>کارمزد معامله (۰٪)</span>
              <span className="font-bold">۰ ریال</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between items-center text-gray-800">
              <span className="font-bold">مبلغ نهایی پرداخت</span>
              <span className={`text-lg font-black ${theme.text}`}>
                {totalPrice ? toPersianDigits(totalPrice) : "0"}{" "}
                <span className="text-xs text-gray-500 font-medium">ریال</span>
              </span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !totalPrice || !tradesEnabled || hasActivePending}
            className={`w-full mt-6 py-4 text-lg justify-center shadow-lg hover:shadow-xl transition-shadow ${
              type === "buy" ? "!bg-green-500 hover:!bg-green-600" : "!bg-red-500 hover:!bg-red-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {!tradesEnabled
              ? "معاملات غیرفعال است"
              : isLoading
                ? "در حال پردازش..."
                : needsPendingSettlement
                  ? showPendingInfo
                    ? "ثبت خرید معلق و رفتن به واریز"
                    : "ادامه با تسویه بعدی"
                  : theme.action}
          </Button>

          <div className="text-center mt-3 flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Info size={12} />
            در خرید معلق، قیمت همین لحظه در فاکتور قفل می‌شود
          </div>
        </div>
      </div>
    </div>
  );
}
