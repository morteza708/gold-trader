"use client";

import { pageTitle } from "@/lib/brand";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  CreditCard, ArrowUpCircle, ArrowDownCircle, Plus, 
  Wallet as WalletIcon, History, Copy, CheckCircle2, Trash2, Building2,
  Calendar as CalendarIcon, UploadCloud, X, AlertTriangle, RefreshCw, Coins, Eye,
  Clock
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import AddCardModal from "@/components/dashboard/AddCardModal";
import WalletTabGuide from "@/components/dashboard/WalletTabGuide";
import ImageCompressHelp from "@/components/ui/ImageCompressHelp";
import { formatNumber, toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { IMAGE_FILE_ACCEPT, MAX_IMAGE_SIZE_LABEL, validateImageFile } from "@/lib/utils/imageUpload";
import { walletAPI, Wallet, BankCard, WithdrawalRequest, DepositRequest, DepositAccountAssignment, DepositReceipt } from "@/lib/api/auth";
import { tradesAPI, PendingPurchase } from "@/lib/api/trades";
import { useAuth } from "@/contexts/AuthContext";

// تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

function WalletContent() {
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as "deposit" | "withdraw" | "withdraw-gold" | "cards" | "history" | null;
  const pendingPurchaseIdFromUrl = searchParams.get('pending_purchase');
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "withdraw-gold" | "cards" | "history">(
    tabFromUrl && ["deposit", "withdraw", "withdraw-gold", "cards", "history"].includes(tabFromUrl) 
      ? tabFromUrl 
      : "deposit"
  );

  // تنظیم title صفحه
  useEffect(() => {
    document.title = pageTitle("کیف پول");
  }, []);
  const [amount, setAmount] = useState("");
  const [goldAmount, setGoldAmount] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [depositDate, setDepositDate] = useState<DateObject | null>(null);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  
  // State برای داده‌های API
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cards, setCards] = useState<BankCard[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [depositAssignments, setDepositAssignments] = useState<Record<number, DepositAccountAssignment[]>>({});
  const [goldPickupAddress, setGoldPickupAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(new Set());
  // State برای نگهداری خطوط فیش هر حساب (key: `${requestId}-${assignmentId}`)
  const [receiptForms, setReceiptForms] = useState<Record<string, Array<{
    amount: string;
    tracking_number: string;
    deposit_date: DateObject | null;
    receipt_file: File | null;
    receipt_image: string | null;
  }>>>({});
  const [activePendingPurchase, setActivePendingPurchase] = useState<PendingPurchase | null>(null);

  // بارگذاری داده‌ها
  useEffect(() => {
    fetchWalletData();
    loadPendingPurchase();
  }, []);

  const loadPendingPurchase = async () => {
    try {
      if (pendingPurchaseIdFromUrl) {
        const detail = await tradesAPI.getPendingPurchase(Number(pendingPurchaseIdFromUrl));
        setActivePendingPurchase(detail);
        const minAmount = Number(detail.deposit_min_amount || 0);
        if (minAmount > 0 && !amount) {
          setAmount(formatNumber(String(minAmount)));
        }
        return;
      }
      const res = await tradesAPI.getActivePendingPurchase();
      setActivePendingPurchase(res.pending_purchase);
      if (res.pending_purchase?.status === "AWAITING_DEPOSIT") {
        const minAmount = Number(res.pending_purchase.deposit_min_amount || 0);
        if (minAmount > 0) {
          setAmount(formatNumber(String(minAmount)));
        }
      }
    } catch {
      // ignore
    }
  };

  // تغییر تب بر اساس URL parameter
  useEffect(() => {
    if (tabFromUrl && ["deposit", "withdraw", "withdraw-gold", "cards", "history"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const [walletData, cardsData, withdrawalData, depositData, addressData] = await Promise.all([
        walletAPI.getWallet(),
        walletAPI.getBankCards(),
        walletAPI.getWithdrawalRequests(),
        walletAPI.getDepositRequests(),
        walletAPI.getGoldPickupAddress(),
      ]);
      
      setWallet(walletData);
      setCards(cardsData);
      setWithdrawalRequests(withdrawalData);
      setDepositRequests(depositData);
      setGoldPickupAddress(addressData.address || "");
      
      // بارگذاری assignments برای درخواست‌های PENDING
      const assignmentsMap: Record<number, DepositAccountAssignment[]> = {};
      for (const deposit of depositData) {
        if (deposit.status === 'PENDING') {
          try {
            const assignments = await walletAPI.getDepositAssignments(deposit.id);
            console.log(`Assignments for deposit ${deposit.id}:`, assignments);
            assignmentsMap[deposit.id] = assignments;
          } catch (error) {
            console.error(`Error fetching assignments for deposit ${deposit.id}:`, error);
          }
        }
      }
      console.log('All assignments map:', assignmentsMap);
      setDepositAssignments(assignmentsMap);
      
      // انتخاب کارت پیش‌فرض
      if (cardsData.length > 0 && !selectedCardId) {
        const activeCard = cardsData.find(c => c.is_active);
        setSelectedCardId(activeCard ? activeCard.id : cardsData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
      toast.error("خطا در دریافت اطلاعات کیف پول");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("کپی شد");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setReceiptImage(URL.createObjectURL(file));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const englishValue = toEnglishDigits(e.target.value);
    const formatted = formatNumber(englishValue);
    const numeric = parseFloat(englishValue.replace(/,/g, "")) || 0;
    const minDeposit = activePendingPurchase
      ? Number(activePendingPurchase.deposit_min_amount || 0)
      : 0;

    if (activePendingPurchase?.status === "AWAITING_DEPOSIT" && minDeposit > 0 && numeric < minDeposit) {
      // اجازه تایپ آزاد؛ هنگام blur/submit کنترل می‌کنیم — اما اگر خالی شد به کف برنگردان
      setAmount(formatted);
      return;
    }
    setAmount(formatted);
  };

  const handleGoldAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let englishValue = toEnglishDigits(e.target.value);
    englishValue = englishValue.replace(/٫/g, '.');
    const value = englishValue.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(value)) {
      setGoldAmount(value);
    }
  };

  const handleDepositSubmit = async () => {
    if (!amount) {
      toast.error("لطفا مبلغ واریز را وارد کنید");
      return;
    }

    const amountValue = parseFloat(amount.replace(/,/g, ''));
    if (amountValue <= 0) {
      toast.error("مبلغ باید بیشتر از صفر باشد");
      return;
    }

    const minDeposit = activePendingPurchase
      ? Number(activePendingPurchase.deposit_min_amount || 0)
      : 0;

    if (
      activePendingPurchase?.status === "AWAITING_DEPOSIT" &&
      minDeposit > 0 &&
      amountValue < minDeposit
    ) {
      toast.error(
        `مبلغ واریز نمی‌تواند کمتر از ${toPersianDigits(minDeposit.toLocaleString())} ریال باشد`,
        { duration: 5000 }
      );
      setAmount(formatNumber(String(minDeposit)));
      return;
    }

    setIsSubmitting(true);
    try {
      await walletAPI.createDepositRequest({
        amount: amountValue,
        pending_purchase_id:
          activePendingPurchase?.status === "AWAITING_DEPOSIT"
            ? activePendingPurchase.id
            : undefined,
      });
      
      toast.success("درخواست واریز با موفقیت ثبت شد. منتظر تخصیص حساب‌ها باشید.");
      
      setAmount("");
      await fetchWalletData();
      await loadPendingPurchase();
    } catch (error: any) {
      console.error('Error creating deposit request:', error);
      toast.error(error.response?.data?.error || "خطا در ثبت درخواست واریز");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawRial = async () => {
    if (!amount || !selectedCardId) {
      toast.error("لطفا مبلغ و کارت بانکی را انتخاب کنید");
      return;
    }

    const amountValue = parseFloat(amount.replace(/,/g, ''));
    if (amountValue <= 0) {
      toast.error("مبلغ باید بیشتر از صفر باشد");
      return;
    }

    if (wallet && Number(wallet.available_rial_balance ?? wallet.rial_balance ?? 0) < amountValue) {
      toast.error("موجودی ریالی قابل استفاده کافی نیست");
      return;
    }

    setIsSubmitting(true);
    try {
      await walletAPI.createWithdrawalRequest({
        withdrawal_type: 'RIAL',
        amount: amountValue,
        bank_card_id: selectedCardId,
      });
      toast.success("درخواست برداشت وجه با موفقیت ثبت شد");
      setAmount("");
      await fetchWalletData();
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast.error(error.response?.data?.error || "خطا در ثبت درخواست برداشت");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawGold = async () => {
    if (!goldAmount) {
      toast.error("لطفا مقدار طلا را وارد کنید");
      return;
    }

    const amountValue = parseFloat(goldAmount);
    if (amountValue <= 0) {
      toast.error("مقدار باید بیشتر از صفر باشد");
      return;
    }

    if (wallet && Number(wallet.available_gold_balance ?? wallet.gold_balance ?? 0) < amountValue) {
      toast.error("موجودی طلای قابل استفاده کافی نیست");
      return;
    }

    setIsSubmitting(true);
    try {
      await walletAPI.createWithdrawalRequest({
        withdrawal_type: 'GOLD',
        amount: amountValue,
      });
      toast.success("درخواست برداشت طلا با موفقیت ثبت شد");
      setGoldAmount("");
      await fetchWalletData();
    } catch (error: any) {
      console.error('Error creating gold withdrawal request:', error);
      toast.error(error.response?.data?.error || "خطا در ثبت درخواست برداشت طلا");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این کارت را حذف کنید؟")) {
      return;
    }

    try {
      await walletAPI.deleteBankCard(cardId);
      toast.success("کارت بانکی با موفقیت حذف شد");
      await fetchWalletData();
    } catch (error: any) {
      console.error('Error deleting card:', error);
      toast.error("خطا در حذف کارت بانکی");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      'PENDING': { text: 'در انتظار', className: 'bg-orange-100 text-orange-700' },
      'APPROVED': { text: 'تایید شده', className: 'bg-blue-100 text-blue-700' },
      'REJECTED': { text: 'رد شده', className: 'bg-red-100 text-red-700' },
      'COMPLETED': { text: 'تکمیل شده', className: 'bg-green-100 text-green-700' },
    };
    const statusInfo = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      
      {/* --- بخش ۱: کارت گرافیکی موجودی --- */}
      <div className="relative w-full max-w-lg mx-auto md:mx-0 h-56 bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-3xl p-6 text-white shadow-2xl overflow-hidden border border-slate-700 group">
         {/* افکت‌های پس‌زمینه */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2"></div>
         <div className="absolute top-6 left-6 opacity-80">
            <WalletIcon size={32} className="text-gold-400" />
         </div>

         <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
               <p className="text-gray-400 text-sm font-medium mb-1">موجودی ریالی</p>
               <h2 className="text-4xl font-black tracking-tight text-white">
                 {isLoading ? (
                   <RefreshCw size={32} className="animate-spin" />
                 ) : (
                   <>
                     {wallet ? toPersianDigits(Number(wallet.rial_balance || 0).toLocaleString()) : '0'} <span className="text-lg font-bold text-gray-500">ریال</span>
                   </>
                 )}
               </h2>
               {!isLoading && wallet && (
                 Number(wallet.pending_trade_rial || 0) > 0 || Number(wallet.pending_withdrawal_rial || 0) > 0
               ) && (
                 <p className="text-xs text-amber-300/90 mt-2">
                   قابل استفاده: {toPersianDigits(Number(wallet.available_rial_balance ?? 0).toLocaleString())} ریال
                   {Number(wallet.pending_trade_rial || 0) > 0 && (
                     <> — قفل خرید معلق: {toPersianDigits(Number(wallet.pending_trade_rial).toLocaleString())}</>
                   )}
                 </p>
               )}
            </div>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-xs text-gray-400 mb-1">موجودی طلا</p>
                  <div className="flex items-center gap-2">
                     <Coins size={16} className="text-gold-400" />
                     <span className="font-bold text-gold-400">
                       {isLoading ? (
                         <RefreshCw size={14} className="animate-spin" />
                       ) : (
                         wallet ? `${toPersianDigits(Number(wallet.gold_balance || 0).toFixed(3))} گرم` : '0 گرم'
                       )}
                     </span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* --- بخش ۲: تب‌های عملیاتی --- */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 md:p-6 shadow-sm min-h-[400px]">
         
         {/* هدر تب‌ها */}
         <div className="flex p-1 bg-gray-50 rounded-xl mb-6 relative overflow-x-auto">
            {(["deposit", "withdraw", "withdraw-gold", "cards", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:py-3 px-2 md:px-4 rounded-lg text-[10px] md:text-sm font-bold transition-all relative z-10 ${activeTab === tab ? "text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
              >
                {tab === "deposit" && <ArrowDownCircle size={18} className="md:w-5 md:h-5"/>}
                {tab === "withdraw" && <ArrowUpCircle size={18} className="md:w-5 md:h-5"/>}
                {tab === "withdraw-gold" && <Coins size={18} className="md:w-5 md:h-5"/>}
                {tab === "cards" && <CreditCard size={18} className="md:w-5 md:h-5"/>}
                {tab === "history" && <History size={18} className="md:w-5 md:h-5"/>}
                
                <span className="whitespace-nowrap">
                  {tab === "deposit" && "افزایش موجودی"}
                  {tab === "withdraw" && "برداشت وجه"}
                  {tab === "withdraw-gold" && "برداشت طلا"}
                  {tab === "cards" && "کارت‌های بانکی"}
                  {tab === "history" && "تاریخچه"}
                </span>

                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabWallet"
                    className="absolute inset-0 bg-white shadow-sm rounded-lg border border-gray-200/50"
                    style={{ zIndex: -1 }}
                  />
                )}
              </button>
            ))}
         </div>

         <div className="max-w-md mx-auto">
            <AnimatePresence mode="wait">
               
               {/* 1. تب واریز فیش */}
               {activeTab === "deposit" && (
                 <motion.div 
                   key="deposit"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                 >
                    {activePendingPurchase && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3 text-sm text-blue-950">
                        <div className="flex items-start gap-2">
                          <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-black">خرید در انتظار تسویه — {activePendingPurchase.request_code}</p>
                            <p className="text-xs text-blue-800/90 leading-relaxed">
                              {toPersianDigits(String(activePendingPurchase.gold_amount))} گرم با قیمت قفل‌شده{" "}
                              {toPersianDigits(Number(activePendingPurchase.locked_unit_price).toLocaleString())} ریال.
                              مبلغ کل: {toPersianDigits(Number(activePendingPurchase.locked_total).toLocaleString())} ریال.
                              سهم کیف: {toPersianDigits(Number(activePendingPurchase.wallet_applied).toLocaleString())} ریال.
                            </p>
                            <p className="text-xs font-bold text-blue-700">
                              وضعیت: {activePendingPurchase.status_display}
                              {activePendingPurchase.expires_at_jalali
                                ? ` — مهلت تا ${toPersianDigits(activePendingPurchase.expires_at_jalali)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        {activePendingPurchase.status === "AWAITING_DEPOSIT" && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await tradesAPI.cancelPendingPurchase(activePendingPurchase.id);
                                  toast.success("خرید معلق لغو شد");
                                  setActivePendingPurchase(null);
                                  setAmount("");
                                  await fetchWalletData();
                                } catch (error: any) {
                                  toast.error(error.response?.data?.error || "خطا در لغو");
                                }
                              }}
                              className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 hover:bg-red-100"
                            >
                              لغو خرید معلق
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <WalletTabGuide
                      storageKey={
                        activePendingPurchase
                          ? "opalbox_wallet_guide_deposit_pending"
                          : "opalbox_wallet_guide_deposit"
                      }
                      steps={
                        activePendingPurchase
                          ? [
                              "مبلغ واریز حداقل برابر کسری خرید معلق است؛ می‌توانید بیشتر واریز کنید ولی کمتر نه.",
                              "پس از ثبت درخواست، حساب مقصد توسط مدیر ارسال می‌شود.",
                              "واریز کنید و فیش + شماره پیگیری را آپلود کنید.",
                              "پس از تأیید مدیر، خرید با قیمت قفل‌شده قطعی و طلا به کیف اضافه می‌شود.",
                            ]
                          : [
                              "مبلغ واریز را به ریال وارد کنید و درخواست را ثبت کنید.",
                              "پس از ثبت، حساب‌های مقصد برای شما نمایش داده می‌شود.",
                              "مبلغ را به یکی از حساب‌ها واریز کنید و فیش را آپلود نمایید.",
                              "پس از تایید مدیر، موجودی ریالی کیف پول شما افزایش می‌یابد.",
                            ]
                      }
                    />

                    <div className="text-center">
                       <h3 className="font-black text-gray-800 text-lg">
                         {activePendingPurchase?.status === "AWAITING_DEPOSIT"
                           ? "واریز برای تسویه خرید"
                           : "ثبت درخواست واریز"}
                       </h3>
                       <p className="text-gray-400 text-xs mt-1">
                         {activePendingPurchase?.status === "AWAITING_DEPOSIT"
                           ? `حداقل مبلغ: ${toPersianDigits(Number(activePendingPurchase.deposit_min_amount).toLocaleString())} ریال (قابل افزایش)`
                           : "لطفا مبلغ را وارد کنید و درخواست واریز را ثبت کنید"}
                       </p>
                    </div>

                    {/* فرم واریز (فقط مبلغ) — برای خرید معلق فقط تا قبل از ثبت واریز */}
                    {(!activePendingPurchase || activePendingPurchase.status === "AWAITING_DEPOSIT") && (
                    <div className="space-y-4 pt-2">
                       <div className="relative">
                          <Input 
                            label="مبلغ واریز"
                            placeholder="۰"
                            value={toPersianDigits(amount)}
                            onChange={handleAmountChange}
                            onBlur={() => {
                              if (!activePendingPurchase || activePendingPurchase.status !== "AWAITING_DEPOSIT") return;
                              const minDeposit = Number(activePendingPurchase.deposit_min_amount || 0);
                              const current = parseFloat((amount || "0").replace(/,/g, "")) || 0;
                              if (current < minDeposit) {
                                setAmount(formatNumber(String(minDeposit)));
                                toast.error("مبلغ به حداقل لازم برگردانده شد");
                              }
                            }}
                            className="text-center text-xl font-black text-gray-800 dir-ltr"
                            dir="ltr"
                          />
                          <span className="absolute left-4 top-[42px] text-gray-400 text-xs font-bold bg-white px-1">ریال</span>
                       </div>
                       <p className="text-xs text-gray-500 text-center">
                         {activePendingPurchase?.status === "AWAITING_DEPOSIT"
                           ? "می‌توانید مبلغ را افزایش دهید؛ کاهش زیر کف مجاز نیست."
                           : "پس از ثبت درخواست، حساب‌های مقصد برای شما ارسال می‌شود"}
                       </p>
                    </div>
                    )}

                    {(!activePendingPurchase || activePendingPurchase.status === "AWAITING_DEPOSIT") && (
                    <Button 
                      variant="primary" 
                      className="w-full justify-center !bg-gray-900 hover:!bg-black shadow-lg"
                      onClick={handleDepositSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin ml-2" />
                          در حال ثبت...
                        </>
                      ) : (
                        "ثبت درخواست واریز"
                      )}
                    </Button>
                    )}

                    {/* نمایش فیش‌های آپلود شده برای درخواست‌های در انتظار تایید */}
                    {depositRequests.filter(r => r.status === 'PENDING' && r.receipts && r.receipts.length > 0).length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-gray-200">
                        <h4 className="font-black text-gray-800 text-base">فیش‌های آپلود شده (در انتظار تایید)</h4>
                        {depositRequests
                          .filter(r => r.status === 'PENDING' && r.receipts && r.receipts.length > 0)
                          .map((request) => (
                            <div key={request.id} className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-sm text-green-800">درخواست: {request.request_code}</p>
                                  <p className="text-xs text-green-600 mt-1">
                                    {request.receipts?.length || 0} فیش آپلود شده
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {request.receipts?.map((receipt: any) => {
                                  const getReceiptStatusBadge = (status: string) => {
                                    const statusMap: Record<string, { text: string; className: string }> = {
                                      'PENDING': { text: 'در انتظار تایید', className: 'bg-orange-100 text-orange-700' },
                                      'APPROVED': { text: 'تایید شده', className: 'bg-green-100 text-green-700' },
                                      'REJECTED': { text: 'رد شده', className: 'bg-red-100 text-red-700' },
                                    };
                                    const statusInfo = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-700' };
                                    return (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusInfo.className}`}>
                                        {statusInfo.text}
                                      </span>
                                    );
                                  };
                                  
                                  let accountDisplay = 'حساب نامشخص';
                                  if (receipt.account_assignment_info) {
                                    const assignment = receipt.account_assignment_info;
                                    if (assignment.account_type === 'WITHDRAWAL' && assignment.withdrawal_request_info) {
                                      const userInfo = assignment.withdrawal_request_info.user_info;
                                      const bankCardInfo = assignment.withdrawal_request_info.bank_card_info;
                                      accountDisplay = `${userInfo?.full_name || userInfo?.phone_number || 'نامشخص'} - ${bankCardInfo?.bank_name || ''}`;
                                    } else if (assignment.account_type === 'DEPOSIT_ACCOUNT' && assignment.deposit_account_info) {
                                      accountDisplay = `${assignment.deposit_account_info.owner_name || ''} - ${assignment.deposit_account_info.bank_name || ''}`;
                                    } else if (assignment.account_type === 'CUSTOM') {
                                      accountDisplay = `${assignment.custom_owner_name || 'نامشخص'} - ${assignment.custom_bank_name || 'نامشخص'}`;
                                    }
                                  }
                                  
                                  return (
                                    <div key={receipt.id} className="bg-white border border-green-300 rounded-xl p-3">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <p className="text-xs font-bold text-gray-700 mb-1">حساب مقصد:</p>
                                          <p className="text-sm font-bold text-gray-800">{accountDisplay}</p>
                                        </div>
                                        {getReceiptStatusBadge(receipt.status)}
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                        <div>
                                          <p className="text-gray-500 mb-1">مبلغ:</p>
                                          <p className="font-bold text-gray-800">
                                            {toPersianDigits(Number(receipt.amount || 0).toLocaleString())} ریال
                                          </p>
                                        </div>
                                        {receipt.tracking_number && (
                                          <div>
                                            <p className="text-gray-500 mb-1">شماره پیگیری:</p>
                                            <p className="font-mono text-gray-600 dir-ltr">{receipt.tracking_number}</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {receipt.receipt_image_url && (
                                        <button
                                          onClick={() => setSelectedReceiptImage(receipt.receipt_image_url)}
                                          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 hover:bg-blue-100 transition-colors"
                                        >
                                          <Eye size={14} />
                                          مشاهده فیش
                                        </button>
                                      )}
                                      
                                      {receipt.admin_note && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <p className="text-xs text-gray-500 mb-1">یادداشت مدیر:</p>
                                          <p className="text-xs text-gray-700">{receipt.admin_note}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* لیست حساب‌های تخصیص یافته */}
                    {(() => {
                      const pendingRequestsWithAssignments = depositRequests.filter(r => {
                        const assignments = depositAssignments[r.id] || [];
                        console.log(`Request ${r.id} (${r.status}):`, assignments.length, 'assignments');
                        return r.status === 'PENDING' && assignments.length > 0;
                      });
                      console.log('Pending requests with assignments:', pendingRequestsWithAssignments.length);
                      return pendingRequestsWithAssignments.length > 0;
                    })() && (
                      <div className="space-y-4 pt-6 border-t border-gray-200">
                        <h4 className="font-black text-gray-800 text-base">حساب‌های مقصد برای واریز</h4>
                        {depositRequests
                          .filter(r => {
                            // نمایش همه assignments (حتی DEPOSIT_ACCOUNT)
                            const assignments = depositAssignments[r.id] || [];
                            return r.status === 'PENDING' && assignments.length > 0;
                          })
                          .map((request) => {
                            // نمایش همه assignments
                            const filteredAssignments = depositAssignments[request.id] || [];
                            return { ...request, filteredAssignments };
                          })
                          .filter(r => r.filteredAssignments.length > 0)
                          .map((request) => (
                            <div key={request.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-sm text-blue-800">درخواست: {request.request_code}</p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    مبلغ کل: {toPersianDigits(Number(request.amount).toLocaleString())} ریال
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedAssignments);
                                    if (newExpanded.has(request.id)) {
                                      newExpanded.delete(request.id);
                                    } else {
                                      newExpanded.add(request.id);
                                    }
                                    setExpandedAssignments(newExpanded);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-bold"
                                >
                                  {expandedAssignments.has(request.id) ? 'بستن' : 'مشاهده حساب‌ها'}
                                </button>
                              </div>
                              
                              {expandedAssignments.has(request.id) && (
                                <div className="space-y-3 pt-2">
                                  {request.filteredAssignments.map((assignment) => {
                                    const formKey = `${request.id}-${assignment.id}`;
                                    const remaining = Number(assignment.remaining_amount ?? assignment.amount);
                                    const uploadedTotal = Number(assignment.receipts_total ?? 0);
                                    if (remaining <= 0) {
                                      return (
                                        <div key={assignment.id} className="bg-green-50 border border-green-300 rounded-xl p-4">
                                          <p className="font-bold text-sm text-green-800">
                                            {assignment.account_display || `حساب #${assignment.id}`}
                                          </p>
                                          <p className="text-xs text-green-700 mt-1">
                                            فیش‌ها کامل است ({toPersianDigits(uploadedTotal.toLocaleString())} از {toPersianDigits(Number(assignment.amount).toLocaleString())} ریال)
                                          </p>
                                        </div>
                                      );
                                    }
                                    return (
                                    <AssignmentReceiptForm
                                      key={assignment.id}
                                      assignment={assignment}
                                      depositRequestId={request.id}
                                      formKey={formKey}
                                      receiptLines={receiptForms[formKey] || []}
                                      setReceiptLines={(lines) => {
                                        setReceiptForms(prev => ({
                                          ...prev,
                                          [formKey]: lines
                                        }));
                                      }}
                                    />
                                    );
                                  })}
                                  {/* دکمه ثبت همه فیش‌ها */}
                                  <Button 
                                    variant="primary" 
                                    className="w-full justify-center !bg-blue-600 hover:!bg-blue-700 shadow-lg text-sm py-3 mt-4"
                                    onClick={async () => {
                                      const openAssignments = request.filteredAssignments.filter(
                                        a => Number(a.remaining_amount ?? a.amount) > 0
                                      );
                                      if (openAssignments.length === 0) {
                                        toast.error("برای این درخواست فیش ناقصی باقی نمانده است");
                                        return;
                                      }

                                      // flatten خطوط فیش همه حساب‌ها
                                      type FlatReceipt = {
                                        assignment_id: number;
                                        amount: number;
                                        tracking_number: string;
                                        deposit_date: string;
                                        receipt_image: File;
                                      };
                                      const receipts: FlatReceipt[] = [];

                                      for (const assignment of openAssignments) {
                                        const lines = receiptForms[`${request.id}-${assignment.id}`] || [];
                                        const remaining = Number(assignment.remaining_amount ?? assignment.amount);
                                        if (lines.length === 0) {
                                          toast.error(`لطفاً حداقل یک فیش برای حساب ${assignment.account_display || assignment.id} ثبت کنید`);
                                          return;
                                        }
                                        let linesSum = 0;
                                        for (const form of lines) {
                                          if (!form.amount || !form.tracking_number || !form.deposit_date || !form.receipt_file) {
                                            toast.error("لطفاً تمام فیلدهای فیش‌ها را تکمیل کنید");
                                            return;
                                          }
                                          const imageCheck = validateImageFile(form.receipt_file);
                                          if (!imageCheck.ok) {
                                            toast.error(imageCheck.message || "یکی از تصاویر فیش نامعتبر است", { duration: 6000 });
                                            return;
                                          }
                                          const amount = parseFloat(form.amount.replace(/,/g, ''));
                                          if (!amount || amount <= 0) {
                                            toast.error("مبلغ هر فیش باید بیشتر از صفر باشد");
                                            return;
                                          }
                                          linesSum += amount;
                                          const gregorianDate = form.deposit_date.toDate();
                                          receipts.push({
                                            assignment_id: assignment.id,
                                            amount,
                                            tracking_number: form.tracking_number,
                                            deposit_date: gregorianDate.toISOString().split('T')[0],
                                            receipt_image: form.receipt_file,
                                          });
                                        }
                                        if (linesSum > remaining + 0.0001) {
                                          toast.error(
                                            `جمع فیش‌های حساب ${assignment.account_display || assignment.id} بیشتر از مانده (${toPersianDigits(remaining.toLocaleString())} ریال) است`
                                          );
                                          return;
                                        }
                                      }
                                      
                                      try {
                                        await walletAPI.uploadDepositReceiptsBatch(request.id, receipts);
                                        toast.success(`${toPersianDigits(String(receipts.length))} فیش واریزی با موفقیت ثبت شد`);
                                        
                                        const newForms = { ...receiptForms };
                                        openAssignments.forEach(assignment => {
                                          delete newForms[`${request.id}-${assignment.id}`];
                                        });
                                        setReceiptForms(newForms);
                                        
                                        await fetchWalletData();
                                      } catch (error: any) {
                                        console.error('Error uploading receipts:', error);
                                        const details = error.response?.data?.details;
                                        const firstDetail = Array.isArray(details) && details[0]
                                          ? Object.values(details[0])[0]
                                          : null;
                                        toast.error(
                                          (typeof firstDetail === "string" ? firstDetail : error.response?.data?.error) ||
                                          "خطا در ثبت فیش‌های واریزی",
                                          { duration: 6000 }
                                        );
                                      }
                                    }}
                                  >
                                    ثبت فیش‌های واریزی
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                 </motion.div>
               )}

               {/* 2. تب برداشت وجه */}
               {activeTab === "withdraw" && (
                 <motion.div
                   key="withdraw"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                 >
                    <WalletTabGuide
                      storageKey="opalbox_wallet_guide_withdraw"
                      steps={[
                        "ابتدا یک کارت بانکی در تب «کارت‌های بانکی» ثبت کنید.",
                        "مبلغ برداشت را وارد کنید (حداکثر تا موجودی ریالی شما).",
                        "درخواست برداشت ثبت می‌شود و توسط مدیر بررسی می‌گردد.",
                        "پس از تایید، مبلغ به حساب بانکی شما واریز می‌شود.",
                      ]}
                    />

                    <div className="text-center">
                       <h3 className="font-black text-gray-800 text-lg">برداشت از کیف پول</h3>
                       <p className="text-gray-400 text-xs mt-1">واریز به حساب بانکی شما (پایا/ساتنا)</p>
                    </div>

                    <div className="relative">
                       <Input 
                         label="مبلغ برداشت"
                         placeholder="۰"
                         value={amount ? toPersianDigits(amount) : ''}
                         onChange={handleAmountChange}
                         className="text-center text-2xl font-black text-gray-800 placeholder:text-gray-300"
                         dir="ltr"
                       />
                       <span className="absolute left-4 top-[42px] text-gray-400 text-xs font-bold bg-white px-1">ریال</span>
                    </div>

                    {/* انتخاب حساب */}
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-700">حساب مقصد</label>
                       {cards.length === 0 ? (
                         <div className="text-center py-8 text-gray-400 text-sm">
                            کارت بانکی ثبت نشده است. لطفا ابتدا کارت بانکی خود را اضافه کنید.
                         </div>
                       ) : (
                         cards.map((card) => (
                            <div 
                              key={card.id} 
                              onClick={() => setSelectedCardId(card.id)}
                              className={`border-2 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${selectedCardId === card.id ? "border-gold-500 bg-gold-50" : "border-gray-100 hover:border-gray-300"}`}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCardId === card.id ? "bg-gold-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                                     <Building2 size={20} />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-gray-800">{card.bank_name}</p>
                                     <p className="text-xs text-gray-400 font-mono dir-ltr">{card.card_number.slice(-4).padStart(card.card_number.length, '*')}</p>
                                  </div>
                               </div>
                               {selectedCardId === card.id && <CheckCircle2 size={20} className="text-gold-600" />}
                            </div>
                         ))
                       )}
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full justify-center !bg-gray-900 hover:!bg-black"
                      onClick={handleWithdrawRial}
                      disabled={isSubmitting || !amount || !selectedCardId || cards.length === 0}
                    >
                      {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : "ثبت درخواست برداشت"}
                    </Button>
                 </motion.div>
               )}

               {/* 3. تب برداشت طلا */}
               {activeTab === "withdraw-gold" && (
                 <motion.div
                   key="withdraw-gold"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                 >
                    <WalletTabGuide
                      storageKey="opalbox_wallet_guide_withdraw_gold"
                      steps={[
                        "مقدار طلا (گرم) را وارد کنید؛ حداکثر تا موجودی طلای شما.",
                        "درخواست برداشت حضوری ثبت می‌شود.",
                        "پس از تایید مدیر، برای دریافت طلا با پشتیبانی هماهنگ کنید.",
                      ]}
                    />

                    <div className="text-center">
                       <h3 className="font-black text-gray-800 text-lg">برداشت طلا</h3>
                       <p className="text-gray-400 text-xs mt-1">درخواست دریافت طلا به صورت حضوری</p>
                    </div>

                    {/* نمایش موجودی طلا */}
                    <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4">
                       <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700">موجودی طلا:</span>
                          <span className="text-lg font-black text-gold-600">
                            {wallet ? `${toPersianDigits(Number(wallet.gold_balance || 0).toFixed(3))} گرم` : '0 گرم'}
                          </span>
                       </div>
                    </div>

                    <div className="relative">
                       <Input 
                         label="مقدار طلا (گرم)"
                         placeholder="۰"
                         value={goldAmount ? toPersianDigits(goldAmount) : ''}
                         onChange={handleGoldAmountChange}
                         className="text-center text-2xl font-black text-gray-800 placeholder:text-gray-300"
                         dir="ltr"
                       />
                       <span className="absolute left-4 top-[42px] text-gray-400 text-xs font-bold bg-white px-1">گرم</span>
                    </div>

                    {/* هشدار مراجعه حضوری */}
                    {goldPickupAddress && (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
                         <div className="flex items-start gap-2">
                            <AlertTriangle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                               <p className="text-sm font-bold text-orange-900 mb-2">
                                  کاربر گرامی پس از تایید درخواست شما مبنی بر دریافت طلا توسط مدیر حتما به آدرس زیر مراجعه نمایید و به صورت حضوری طلای خود را دریافت نمایید.
                               </p>
                               <div className="bg-white rounded-xl p-3 border border-orange-200">
                                  <p className="text-xs text-gray-400 mb-1">آدرس مراجعه:</p>
                                  <p className="text-sm font-bold text-gray-800">{goldPickupAddress}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    <Button 
                      variant="primary" 
                      className="w-full justify-center !bg-gold-600 hover:!bg-gold-700"
                      onClick={handleWithdrawGold}
                      disabled={isSubmitting || !goldAmount}
                    >
                      {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : "ثبت درخواست برداشت طلا"}
                    </Button>
                 </motion.div>
               )}

               {/* 4. تب کارت‌ها */}
               {activeTab === "cards" && (
                 <motion.div
                   key="cards"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                 >
                    <WalletTabGuide
                      storageKey="opalbox_wallet_guide_cards"
                      steps={[
                        "برای برداشت وجه، حداقل یک کارت بانکی به نام خودتان ثبت کنید.",
                        "شماره کارت ۱۶ رقمی و نام بانک را وارد نمایید.",
                        "کارت تایید شده در درخواست‌های برداشت قابل انتخاب است.",
                      ]}
                    />

                    <div className="flex justify-between items-center">
                       <h3 className="font-black text-gray-800 text-lg">مدیریت حساب‌ها</h3>
                       <button onClick={() => setIsAddCardOpen(true)} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                          <Plus size={14} /> افزودن کارت جدید
                       </button>
                    </div>

                    <div className="space-y-3">
                       {cards.length === 0 ? (
                         <div className="text-center py-8 text-gray-400 text-sm">
                            کارت بانکی ثبت نشده است.
                         </div>
                       ) : (
                         cards.map((card) => (
                            <div key={card.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                               <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                     <span className="font-bold text-gray-700">{card.bank_name}</span>
                                     {card.is_active && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">پیش‌فرض</span>}
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                  >
                                     <Trash2 size={16} />
                                  </button>
                               </div>
                               
                               <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                     <span className="text-gray-400">شماره کارت:</span>
                                     <span className="font-mono text-gray-600 dir-ltr">{card.card_number}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                     <span className="text-gray-400">شماره شبا:</span>
                                     <span className="font-mono text-gray-600 dir-ltr truncate max-w-[200px]">{card.sheba_number}</span>
                                  </div>
                               </div>
                            </div>
                         ))
                       )}
                    </div>
                 </motion.div>
               )}

               {/* 5. تب تاریخچه */}
               {activeTab === "history" && (
                 <motion.div
                   key="history"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="space-y-4"
                 >
                    <WalletTabGuide
                      storageKey="opalbox_wallet_guide_history"
                      steps={[
                        "تمام درخواست‌های واریز و برداشت شما در اینجا نمایش داده می‌شود.",
                        "وضعیت هر درخواست: در انتظار، تایید شده یا رد شده.",
                        "برای جزئیات بیشتر روی هر مورد کلیک کنید.",
                      ]}
                    />

                    <div className="text-center mb-4">
                       <h3 className="font-black text-gray-800 text-lg">تاریخچه تراکنش‌ها</h3>
                    </div>

                    {(() => {
                       // ترکیب واریزها و برداشت‌ها در یک آرایه
                       const allTransactions = [
                          ...depositRequests.map(req => ({ type: 'deposit' as const, data: req, created_at: req.created_at })),
                          ...withdrawalRequests.map(req => ({ type: 'withdrawal' as const, data: req, created_at: req.created_at }))
                       ];
                       
                       // مرتب‌سازی بر اساس تاریخ (از جدیدترین به قدیمی‌ترین)
                       allTransactions.sort((a, b) => {
                          const dateA = new Date(a.created_at).getTime();
                          const dateB = new Date(b.created_at).getTime();
                          return dateB - dateA; // نزولی (جدیدترین اول)
                       });
                       
                       if (allTransactions.length === 0) {
                          return (
                             <div className="text-center py-12 text-gray-400 text-sm">
                                تراکنشی ثبت نشده است.
                             </div>
                          );
                       }
                       
                       return (
                          <div className="space-y-3">
                             {allTransactions.map((transaction) => {
                                if (transaction.type === 'deposit') {
                                   const request = transaction.data as DepositRequest;
                                   return (
                                      <div key={`deposit-${request.id}`} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                         <div className="flex justify-between items-start mb-3">
                                            <div>
                                               <p className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                                  <ArrowDownCircle size={16} className="text-green-600" />
                                                  واریز وجه
                                               </p>
                                               <p className="text-xs text-gray-400 mt-1">
                                                  {toPersianDigits(request.created_at_jalali || 'تاریخ نامعتبر')}
                                               </p>
                                            </div>
                                            {getStatusBadge(request.status)}
                                         </div>
                                         
                                         <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                                            <div className="flex justify-between text-sm">
                                               <span className="text-gray-400">کد درخواست:</span>
                                               <span className="font-mono text-gray-600 dir-ltr">{request.request_code}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                               <span className="text-gray-400">مبلغ کل:</span>
                                               <span className="font-bold text-gray-800">
                                                  {toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال
                                               </span>
                                            </div>
                                            
                                            {/* نمایش همه فیش‌های واریزی */}
                                            {request.receipts && request.receipts.length > 0 && (
                                               <div className="mt-3 pt-3 border-t border-gray-200">
                                                  <p className="text-xs text-gray-400 mb-3 font-bold">فیش‌های واریزی ({request.receipts.length}):</p>
                                                  <div className="space-y-3">
                                                     {request.receipts.map((receipt: any) => {
                                                        // تعیین وضعیت فیش
                                                        const getReceiptStatusBadge = (status: string) => {
                                                           const statusMap: Record<string, { text: string; className: string }> = {
                                                              'PENDING': { text: 'در انتظار', className: 'bg-orange-100 text-orange-700' },
                                                              'APPROVED': { text: 'تایید شده', className: 'bg-green-100 text-green-700' },
                                                              'REJECTED': { text: 'رد شده', className: 'bg-red-100 text-red-700' },
                                                           };
                                                           const statusInfo = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-700' };
                                                           return (
                                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusInfo.className}`}>
                                                                 {statusInfo.text}
                                                              </span>
                                                           );
                                                        };
                                                        
                                                        // نمایش اطلاعات حساب مقصد
                                                        let accountDisplay = 'حساب نامشخص';
                                                        if (receipt.account_assignment_info) {
                                                           const assignment = receipt.account_assignment_info;
                                                           if (assignment.account_type === 'WITHDRAWAL' && assignment.withdrawal_request_info) {
                                                              const userInfo = assignment.withdrawal_request_info.user_info;
                                                              const bankCardInfo = assignment.withdrawal_request_info.bank_card_info;
                                                              accountDisplay = `${userInfo?.full_name || userInfo?.phone_number || 'نامشخص'} - ${bankCardInfo?.bank_name || ''}`;
                                                           } else if (assignment.account_type === 'DEPOSIT_ACCOUNT' && assignment.deposit_account_info) {
                                                              accountDisplay = `${assignment.deposit_account_info.owner_name || ''} - ${assignment.deposit_account_info.bank_name || ''}`;
                                                           } else if (assignment.account_type === 'CUSTOM') {
                                                              accountDisplay = `${assignment.custom_owner_name || 'نامشخص'} - ${assignment.custom_bank_name || 'نامشخص'}`;
                                                           }
                                                        }
                                                        
                                                        return (
                                                           <div key={receipt.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                                              <div className="flex justify-between items-start">
                                                                 <div className="flex-1">
                                                                    <p className="text-xs font-bold text-gray-700 mb-1">حساب مقصد:</p>
                                                                    <p className="text-sm font-bold text-gray-800">{accountDisplay}</p>
                                                                 </div>
                                                                 {getReceiptStatusBadge(receipt.status)}
                                                              </div>
                                                              
                                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                                 <div>
                                                                    <p className="text-gray-500 mb-1">مبلغ فیش:</p>
                                                                    <p className="font-bold text-gray-800">
                                                                       {toPersianDigits(Number(receipt.amount || 0).toLocaleString())} ریال
                                                                    </p>
                                                                 </div>
                                                                 {receipt.tracking_number && (
                                                                    <div>
                                                                       <p className="text-gray-500 mb-1">شماره پیگیری:</p>
                                                                       <p className="font-mono text-gray-600 dir-ltr">{receipt.tracking_number}</p>
                                                                    </div>
                                                                 )}
                                                              </div>
                                                              
                                                              {receipt.deposit_date_jalali && (
                                                                 <div className="text-xs">
                                                                    <p className="text-gray-500 mb-1">تاریخ واریز:</p>
                                                                    <p className="font-mono text-gray-600">{toPersianDigits(receipt.deposit_date_jalali)}</p>
                                                                 </div>
                                                              )}
                                                              
                                                              {receipt.receipt_image_url && (
                                                                 <button
                                                                    onClick={() => setSelectedReceiptImage(receipt.receipt_image_url)}
                                                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 rounded-lg py-2 px-3 hover:bg-blue-50 transition-colors mt-2"
                                                                 >
                                                                    <Eye size={14} />
                                                                    مشاهده فیش واریزی
                                                                 </button>
                                                              )}
                                                              
                                                              {receipt.admin_note && (
                                                                 <div className="mt-2 pt-2 border-t border-blue-200">
                                                                    <p className="text-xs text-gray-500 mb-1">یادداشت مدیر:</p>
                                                                    <p className="text-xs text-gray-700">{receipt.admin_note}</p>
                                                                 </div>
                                                              )}
                                                           </div>
                                                        );
                                                     })}
                                                  </div>
                                               </div>
                                            )}
                                            
                                            {/* نمایش فیش قدیمی (برای سازگاری با داده‌های قدیمی) */}
                                            {(!request.receipts || request.receipts.length === 0) && (request.receipt_image_url || request.receipt_image) && (
                                               <div className="mt-2 pt-2 border-t border-gray-200">
                                                  <button
                                                     onClick={() => setSelectedReceiptImage(request.receipt_image_url || request.receipt_image || null)}
                                                     className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                                                  >
                                                     <Eye size={14} />
                                                     مشاهده فیش واریزی
                                                  </button>
                                               </div>
                                            )}
                                            
                                            {request.admin_note && (!request.receipts || request.receipts.length === 0) && (
                                               <div className="mt-2 pt-2 border-t border-gray-200">
                                                  <p className="text-xs text-gray-400 mb-1">یادداشت مدیر:</p>
                                                  <p className="text-sm text-gray-700">{request.admin_note}</p>
                                               </div>
                                            )}
                                         </div>
                                      </div>
                                   );
                                } else {
                                   const request = transaction.data as WithdrawalRequest;
                                   return (
                                      <div key={`withdrawal-${request.id}`} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                         <div className="flex justify-between items-start mb-3">
                                            <div>
                                               <p className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                                  <ArrowUpCircle size={16} className={request.withdrawal_type === 'RIAL' ? "text-red-600" : "text-gold-600"} />
                                                  {request.withdrawal_type === 'RIAL' ? 'برداشت وجه' : 'برداشت طلا'}
                                               </p>
                                               <p className="text-xs text-gray-400 mt-1">
                                                  {toPersianDigits(request.created_at_jalali || 'تاریخ نامعتبر')}
                                               </p>
                                            </div>
                                            {getStatusBadge(request.status)}
                                         </div>
                                         
                                         <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                                            <div className="flex justify-between text-sm">
                                               <span className="text-gray-400">کد درخواست:</span>
                                               <span className="font-mono text-gray-600 dir-ltr">{request.request_code}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                               <span className="text-gray-400">مبلغ کل:</span>
                                               <span className="font-bold text-gray-800">
                                                  {request.withdrawal_type === 'RIAL' 
                                                    ? `${toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال`
                                                    : `${toPersianDigits(Number(request.amount || 0).toFixed(3))} گرم`
                                                  }
                                               </span>
                                            </div>
                                            
                                            {/* نمایش وضعیت پرداخت برای برداشت‌های ریالی ناقص */}
                                            {request.withdrawal_type === 'RIAL' && request.status === 'PENDING' && request.remaining_amount !== undefined && request.paid_amount !== undefined && (
                                               <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                                  <div className="flex justify-between text-sm">
                                                     <span className="text-gray-400">پرداخت شده:</span>
                                                     <span className="font-bold text-green-600">
                                                        {toPersianDigits(Number(request.paid_amount || 0).toLocaleString())} ریال
                                                     </span>
                                                  </div>
                                                  <div className="flex justify-between text-sm">
                                                     <span className="text-gray-400">باقی‌مانده:</span>
                                                     <span className="font-bold text-orange-600">
                                                        {toPersianDigits(Number(request.remaining_amount || 0).toLocaleString())} ریال
                                                     </span>
                                                  </div>
                                                  {/* Progress bar */}
                                                  {Number(request.amount || 0) > 0 && (
                                                     <div className="mt-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                           <div 
                                                              className="bg-green-500 h-2 rounded-full transition-all"
                                                              style={{ 
                                                                 width: `${Math.min(100, (Number(request.paid_amount || 0) / Number(request.amount || 1)) * 100)}%` 
                                                              }}
                                                           ></div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                                           {toPersianDigits(Math.round((Number(request.paid_amount || 0) / Number(request.amount || 1)) * 100).toString())}% تکمیل شده
                                                        </p>
                                                     </div>
                                                  )}
                                               </div>
                                            )}
                                            
                                            {request.bank_card && (
                                               <div className="flex justify-between text-sm">
                                                  <span className="text-gray-400">کارت بانکی:</span>
                                                  <span className="font-mono text-gray-600 dir-ltr">{request.bank_card.card_number}</span>
                                               </div>
                                            )}
                                            {request.withdrawal_type === 'RIAL' && request.receipt_image && (
                                               <div className="mt-2 pt-2 border-t border-gray-200">
                                                  <button
                                                     onClick={() => setSelectedReceiptImage(request.receipt_image || null)}
                                                     className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                                                  >
                                                     <Eye size={14} />
                                                     مشاهده فیش واریزی
                                                  </button>
                                               </div>
                                            )}
                                            
                                            {/* فیش‌های واریزی مرتبط (نمایش همه لینک‌ها) */}
                                            {request.deposit_receipts_info && request.deposit_receipts_info.length > 0 && (
                                               <div className="mt-3 pt-3 border-t border-gray-200">
                                                  <p className="text-xs text-gray-400 mb-2 font-bold">فیش‌های واریزی مرتبط:</p>
                                                  <div className="space-y-3">
                                                     {request.deposit_receipts_info.map((receiptInfo, idx) => (
                                                        <div key={receiptInfo.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                                           <div className="mb-2">
                                                              <p className="text-xs text-gray-500 mb-1">واریزکننده:</p>
                                                              <p className="text-sm font-bold text-gray-800">{receiptInfo.depositor_info.full_name}</p>
                                                              {receiptInfo.depositor_info.account_code && (
                                                                 <p className="text-xs text-gray-500 mt-1">
                                                                    کد حساب: {toPersianDigits(receiptInfo.depositor_info.account_code)}
                                                                 </p>
                                                              )}
                                                           </div>
                                                           <div className="mb-2 grid grid-cols-2 gap-2">
                                                              <div>
                                                                 <p className="text-xs text-gray-500 mb-1">مبلغ فیش:</p>
                                                                 <p className="text-sm font-bold text-gray-800">
                                                                    {toPersianDigits(Number(receiptInfo.amount).toLocaleString())} ریال
                                                                 </p>
                                                              </div>
                                                              <div>
                                                                 <p className="text-xs text-gray-500 mb-1">مبلغ تخصیص یافته:</p>
                                                                 <p className="text-sm font-bold text-green-600">
                                                                    {toPersianDigits(Number(receiptInfo.link_amount || 0).toLocaleString())} ریال
                                                                 </p>
                                                              </div>
                                                           </div>
                                                           {receiptInfo.receipt_image_url && (
                                                              <button
                                                                 onClick={() => setSelectedReceiptImage(receiptInfo.receipt_image_url || null)}
                                                                 className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 rounded-lg py-2 px-3 hover:bg-blue-50 transition-colors"
                                                              >
                                                                 <Eye size={14} />
                                                                 مشاهده فیش واریزی
                                                              </button>
                                                           )}
                                                        </div>
                                                     ))}
                                                  </div>
                                               </div>
                                            )}
                                            
                                            {request.admin_note && (
                                               <div className="mt-2 pt-2 border-t border-gray-200">
                                                  <p className="text-xs text-gray-400 mb-1">یادداشت مدیر:</p>
                                                  <p className="text-sm text-gray-700">{request.admin_note}</p>
                                               </div>
                                            )}
                                         </div>
                                      </div>
                                   );
                                }
                             })}
                          </div>
                       );
                    })()}
                 </motion.div>
               )}

            </AnimatePresence>
         </div>
      </div>

      <AddCardModal 
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onAdd={async (newCard) => {
          try {
            await walletAPI.addBankCard({
              bank_name: newCard.bank,
              card_number: newCard.number.replace(/\s+/g, ''),
              sheba_number: newCard.sheba,
            });
            toast.success("کارت بانکی با موفقیت اضافه شد");
            setIsAddCardOpen(false);
            await fetchWalletData();
            // به‌روزرسانی اطلاعات کاربر برای نمایش تایید حساب بانکی
            await refreshUser();
          } catch (error: any) {
            console.error('Error adding card:', error);
            toast.error(error.response?.data?.error || "خطا در افزودن کارت بانکی");
          }
        }}
      />

      {/* کامپوننت فرم آپلود فیش برای هر assignment */}
      {(() => {
        // این کامپوننت در انتهای فایل تعریف می‌شود
        return null;
      })()}

      {/* مودال نمایش فیش واریزی */}
      {selectedReceiptImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReceiptImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => setSelectedReceiptImage(null)}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[90vh]">
              <img 
                src={selectedReceiptImage} 
                alt="فیش واریزی" 
                className="w-full h-auto rounded-lg"
                onError={() => {
                  toast.error("خطا در نمایش تصویر");
                  setSelectedReceiptImage(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// کامپوننت فرم آپلود فیش برای هر assignment
type ReceiptFormLine = {
  amount: string;
  tracking_number: string;
  deposit_date: DateObject | null;
  receipt_file: File | null;
  receipt_image: string | null;
};

function emptyReceiptLine(defaultAmount = ""): ReceiptFormLine {
  return {
    amount: defaultAmount,
    tracking_number: "",
    deposit_date: null,
    receipt_file: null,
    receipt_image: null,
  };
}

function AssignmentReceiptForm({
  assignment,
  receiptLines,
  setReceiptLines,
}: {
  assignment: DepositAccountAssignment;
  depositRequestId: number;
  formKey: string;
  receiptLines: ReceiptFormLine[];
  setReceiptLines: (lines: ReceiptFormLine[]) => void;
}) {
  const remainingAmount = Number(assignment.remaining_amount ?? assignment.amount);
  const uploadedTotal = Number(assignment.receipts_total ?? 0);
  const defaultAmount = remainingAmount > 0 ? remainingAmount.toString() : "";
  const lines = receiptLines.length > 0 ? receiptLines : [emptyReceiptLine(defaultAmount)];
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [uploadHelpReasons, setUploadHelpReasons] = useState<Record<number, "size" | "format" | "general" | null>>({});
  const [previewFailed, setPreviewFailed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (receiptLines.length === 0 && defaultAmount) {
      setReceiptLines([emptyReceiptLine(defaultAmount)]);
    }
  }, [defaultAmount, receiptLines.length, setReceiptLines]);

  const linesSum = lines.reduce((sum, line) => {
    const n = parseFloat((line.amount || "0").replace(/,/g, "")) || 0;
    return sum + n;
  }, 0);
  const leftover = Math.max(0, remainingAmount - linesSum);

  const updateLine = (index: number, patch: Partial<ReceiptFormLine>) => {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    setReceiptLines(next);
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.ok) {
      setPreviewFailed(prev => ({ ...prev, [index]: false }));
      setUploadHelpReasons(prev => ({ ...prev, [index]: validation.reason || "general" }));
      updateLine(index, { receipt_file: null, receipt_image: null });
      if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = "";
      toast.error(validation.message || "فایل نامعتبر است", { duration: 5000 });
      return;
    }

    setUploadHelpReasons(prev => ({ ...prev, [index]: null }));
    setPreviewFailed(prev => ({ ...prev, [index]: false }));
    updateLine(index, {
      receipt_file: file,
      receipt_image: URL.createObjectURL(file),
    });
  };

  const handleAmountChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const englishValue = toEnglishDigits(e.target.value);
    const value = englishValue.replace(/,/g, '');
    if (!/^\d*\.?\d*$/.test(value)) return;

    const numValue = parseFloat(value) || 0;
    const otherSum = lines.reduce((sum, line, i) => {
      if (i === index) return sum;
      return sum + (parseFloat((line.amount || "0").replace(/,/g, "")) || 0);
    }, 0);
    const maxForThis = Math.max(0, remainingAmount - otherSum);
    const finalValue = numValue > maxForThis ? maxForThis.toString() : value;
    updateLine(index, { amount: finalValue });
    if (numValue > maxForThis) {
      toast.error(`مبلغ نمی‌تواند بیشتر از مانده (${toPersianDigits(maxForThis.toLocaleString())} ریال) باشد`);
    }
  };

  // نمایش اطلاعات حساب
  let accountDisplay = '';
  let ownerName = '';
  let cardNumber = '';
  let shebaNumber = '';
  let bankName = '';
  
  if (assignment.account_type === 'WITHDRAWAL' && assignment.withdrawal_request_info) {
    const userInfo = assignment.withdrawal_request_info.user_info;
    const bankCardInfo = assignment.withdrawal_request_info.bank_card_info;
    ownerName = userInfo?.full_name || userInfo?.phone_number || 'نامشخص';
    bankName = bankCardInfo?.bank_name || '';
    accountDisplay = `${ownerName} - ${bankName}`;
    cardNumber = bankCardInfo?.card_number || '';
    shebaNumber = bankCardInfo?.sheba_number || '';
  } else if (assignment.account_type === 'DEPOSIT_ACCOUNT' && assignment.deposit_account_info) {
    ownerName = assignment.deposit_account_info.owner_name || '';
    bankName = assignment.deposit_account_info.bank_name || '';
    accountDisplay = `${ownerName} - ${bankName}`;
    cardNumber = assignment.deposit_account_info.card_number;
    shebaNumber = assignment.deposit_account_info.sheba_number;
  } else if (assignment.account_type === 'CUSTOM') {
    ownerName = assignment.custom_owner_name || '';
    bankName = assignment.custom_bank_name || '';
    accountDisplay = `${ownerName || 'نامشخص'} - ${bankName || 'نامشخص'}`;
    cardNumber = assignment.custom_card_number || '';
    shebaNumber = assignment.custom_sheba_number || '';
  }

  const handleCopyCardNumber = async () => {
    if (!cardNumber) return;
    try {
      await navigator.clipboard.writeText(cardNumber);
      toast.success("شماره کارت کپی شد");
    } catch {
      toast.error("خطا در کپی کردن شماره کارت");
    }
  };

  const handleCopyShebaNumber = async () => {
    if (!shebaNumber) return;
    const shebaDigits = shebaNumber.replace(/^IR/i, '').trim();
    try {
      await navigator.clipboard.writeText(shebaDigits);
      toast.success("شماره شبا کپی شد");
    } catch {
      toast.error("خطا در کپی کردن شماره شبا");
    }
  };

  const formatCardNumber = (card: string) => {
    if (!card) return '';
    const cleaned = card.replace(/\s/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  };

  const formatShebaNumber = (sheba: string) => {
    if (!sheba) return '';
    const cleaned = sheba.replace(/^IR/i, '').replace(/\s/g, '');
    return `IR${cleaned.match(/.{1,4}/g)?.join(' ') || cleaned}`;
  };

  return (
    <div className="bg-white border border-blue-300 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-gray-800">{accountDisplay}</p>
          <p className="text-xs text-gray-500 mt-1">
            مبلغ تخصیص: {toPersianDigits(Number(assignment.amount).toLocaleString())} ریال
          </p>
          {uploadedTotal > 0 && (
            <p className="text-xs text-green-700 mt-0.5">
              آپلود شده: {toPersianDigits(uploadedTotal.toLocaleString())} — مانده: {toPersianDigits(remainingAmount.toLocaleString())} ریال
            </p>
          )}
        </div>
      </div>

      {(cardNumber || shebaNumber) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
          {cardNumber && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-600 mb-1">شماره کارت:</p>
                <bdi className="text-sm font-bold text-gray-800 block" dir="ltr" style={{ unicodeBidi: 'isolate', textAlign: 'left' }}>
                  {toPersianDigits(formatCardNumber(cardNumber))}
                </bdi>
              </div>
              <button
                onClick={handleCopyCardNumber}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors"
                title="کپی شماره کارت"
              >
                <Copy size={14} />
                کپی
              </button>
            </div>
          )}
          {shebaNumber && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-200">
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-600 mb-1">شماره شبا:</p>
                <bdi className="text-sm font-bold text-gray-800 block" dir="ltr" style={{ unicodeBidi: 'isolate', textAlign: 'left' }}>
                  {toPersianDigits(formatShebaNumber(shebaNumber))}
                </bdi>
              </div>
              <button
                onClick={handleCopyShebaNumber}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors"
                title="کپی شماره شبا (بدون IR)"
              >
                <Copy size={14} />
                کپی
              </button>
            </div>
          )}
        </div>
      )}

      {lines.map((line, index) => (
        <div key={index} className="space-y-3 pt-2 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-700">فیش {toPersianDigits(String(index + 1))}</p>
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => setReceiptLines(lines.filter((_, i) => i !== index))}
                className="text-xs text-red-500 font-bold hover:text-red-600"
              >
                حذف این فیش
              </button>
            )}
          </div>

          <div className="relative">
            <Input 
              label="مبلغ واریز شده"
              placeholder={toPersianDigits(remainingAmount.toLocaleString())}
              value={line.amount ? toPersianDigits(formatNumber(line.amount)) : ""}
              onChange={(e) => handleAmountChange(index, e)}
              className="text-center text-lg font-bold text-gray-800 dir-ltr"
              dir="ltr"
            />
            <span className="absolute left-4 top-[42px] text-gray-400 text-xs font-bold bg-white px-1">ریال</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="شماره پیگیری" 
              placeholder="مثلا: ۱۲۳۴۵۶" 
              className="text-center font-bold text-sm"
              value={line.tracking_number}
              onChange={(e) => {
                updateLine(index, { tracking_number: toEnglishDigits(e.target.value) });
              }}
            />
            
            <div className="w-full">
              <label className="block text-xs font-bold text-gray-700 mb-2">تاریخ واریز</label>
              <div className="relative">
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  containerClassName="w-full"
                  inputClass="w-full bg-gray-50 text-gray-900 border-2 border-gray-200 focus:border-gold-500 rounded-xl px-3 py-2 outline-none transition-all text-center font-bold text-xs"
                  placeholder="انتخاب کنید"
                  value={line.deposit_date}
                  onChange={(date) => {
                    updateLine(index, { deposit_date: date as DateObject | null });
                  }}
                />
                <CalendarIcon size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none"/>
              </div>
            </div>
          </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-gray-700 mb-2">تصویر فیش واریزی</label>
            <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
              JPG، PNG، WebP یا HEIC آیفون — حداکثر {MAX_IMAGE_SIZE_LABEL}
            </p>
            {!line.receipt_image ? (
              <div 
                onClick={() => fileInputRefs.current[index]?.click()}
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group text-center h-24 ${
                  uploadHelpReasons[index]
                    ? "border-red-300 bg-red-50/40"
                    : "border-gray-300 hover:border-gold-500 hover:bg-gold-50/20"
                }`}
              >
                <UploadCloud size={20} className="text-gray-400 group-hover:text-gold-600 mb-1"/>
                <span className="text-[10px] font-bold text-gray-600">آپلود تصویر فیش</span>
              </div>
            ) : (
              <div className="relative h-32 border-2 border-green-500 rounded-xl overflow-hidden group">
                {previewFailed[index] ? (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-[10px] text-gray-500 px-3 text-center">
                    فایل انتخاب شد: {line.receipt_file?.name || "فیش واریزی"}
                    <br />
                    (پیش‌نمایش در این مرورگر در دسترس نیست؛ آپلود مشکلی ندارد)
                  </div>
                ) : (
                  <img
                    src={line.receipt_image}
                    className="w-full h-full object-cover"
                    alt="receipt"
                    onError={() => setPreviewFailed(prev => ({ ...prev, [index]: true }))}
                  />
                )}
                <button type="button" onClick={() => {
                  setUploadHelpReasons(prev => ({ ...prev, [index]: null }));
                  setPreviewFailed(prev => ({ ...prev, [index]: false }));
                  updateLine(index, { receipt_file: null, receipt_image: null });
                  if (fileInputRefs.current[index]) {
                    fileInputRefs.current[index]!.value = '';
                  }
                }} className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded-full shadow-lg z-10"><X size={14}/></button>
                <div className="absolute bottom-0 w-full bg-green-500 text-white text-center text-[10px] py-1 font-bold">آماده ارسال</div>
              </div>
            )}
            {uploadHelpReasons[index] && <ImageCompressHelp reason={uploadHelpReasons[index]!} compact />}
            <input
              type="file"
              ref={(el) => { fileInputRefs.current[index] = el; }}
              onChange={(e) => handleFileChange(index, e)}
              className="hidden"
              accept={IMAGE_FILE_ACCEPT}
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-gray-500">
          جمع فیش‌های این فرم: {toPersianDigits(linesSum.toLocaleString())} ریال
          {leftover > 0 ? ` — مانده پوشش‌نداده: ${toPersianDigits(leftover.toLocaleString())}` : ""}
        </p>
        {leftover > 0 && (
          <button
            type="button"
            onClick={() => setReceiptLines([...lines, emptyReceiptLine(leftover.toString())])}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus size={14} />
            افزودن فیش دیگر
          </button>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-center text-gray-500">در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    }>
      <WalletContent />
    </Suspense>
  );
}
