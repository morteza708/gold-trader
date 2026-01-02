"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  CreditCard, ArrowUpCircle, ArrowDownCircle, Plus, 
  Wallet as WalletIcon, History, Copy, CheckCircle2, Trash2, Building2,
  Calendar as CalendarIcon, UploadCloud, X, AlertTriangle, RefreshCw, Coins, Eye
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import AddCardModal from "@/components/dashboard/AddCardModal";
import { formatNumber, toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { walletAPI, Wallet, BankCard, WithdrawalRequest, DepositRequest, DepositAccountAssignment, DepositReceipt } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";

// تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

function WalletContent() {
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as "deposit" | "withdraw" | "withdraw-gold" | "cards" | "history" | null;
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "withdraw-gold" | "cards" | "history">(
    tabFromUrl && ["deposit", "withdraw", "withdraw-gold", "cards", "history"].includes(tabFromUrl) 
      ? tabFromUrl 
      : "deposit"
  );

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "کیف پول | پلتفرم معاملات طلا";
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
  // State برای نگهداری داده‌های فرم‌های فیش (key: `${requestId}-${assignmentId}`)
  const [receiptForms, setReceiptForms] = useState<Record<string, {
    amount: string;
    tracking_number: string;
    deposit_date: DateObject | null;
    receipt_file: File | null;
    receipt_image: string | null;
  }>>({});

  // بارگذاری داده‌ها
  useEffect(() => {
    fetchWalletData();
  }, []);

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
    // تبدیل اعداد فارسی به انگلیسی
    const englishValue = toEnglishDigits(e.target.value);
    // فرمت کردن با کاما
    const formatted = formatNumber(englishValue);
    setAmount(formatted);
  };

  const handleGoldAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // تبدیل اعداد فارسی به انگلیسی
    let englishValue = toEnglishDigits(e.target.value);
    // تبدیل نقطه اعشار فارسی (٫) به انگلیسی (.)
    englishValue = englishValue.replace(/٫/g, '.');
    // حذف کاماها
    const value = englishValue.replace(/,/g, '');
    // بررسی اینکه فقط عدد و نقطه اعشار باشد
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

    setIsSubmitting(true);
    try {
      // فقط مبلغ را می‌فرستیم (بدون tracking_number, deposit_date, receipt_image)
      await walletAPI.createDepositRequest({
        amount: amountValue,
      });
      
      toast.success("درخواست واریز با موفقیت ثبت شد. منتظر تخصیص حساب‌ها باشید.");
      
      // پاک کردن فرم
      setAmount("");
      
      await fetchWalletData();
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

    if (wallet && Number(wallet.rial_balance || 0) < amountValue) {
      toast.error("موجودی ریالی کافی نیست");
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

    if (wallet && Number(wallet.gold_balance || 0) < amountValue) {
      toast.error("موجودی طلا کافی نیست");
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
                    <div className="text-center">
                       <h3 className="font-black text-gray-800 text-lg">ثبت فیش واریزی</h3>
                       <p className="text-gray-400 text-xs mt-1">لطفا مبلغ را وارد کنید و درخواست واریز را ثبت کنید</p>
                    </div>

                    {/* فرم واریز (فقط مبلغ) */}
                    <div className="space-y-4 pt-2">
                       <div className="relative">
                          <Input 
                            label="مبلغ واریز"
                            placeholder="۰"
                            value={toPersianDigits(amount)}
                            onChange={handleAmountChange}
                            className="text-center text-xl font-black text-gray-800 dir-ltr"
                            dir="ltr"
                          />
                          <span className="absolute left-4 top-[42px] text-gray-400 text-xs font-bold bg-white px-1">ریال</span>
                       </div>
                       <p className="text-xs text-gray-500 text-center">
                         پس از ثبت درخواست، حساب‌های مقصد برای شما ارسال می‌شود
                       </p>
                    </div>

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
                                  {request.filteredAssignments.map((assignment, idx) => (
                                    <AssignmentReceiptForm
                                      key={assignment.id}
                                      assignment={assignment}
                                      depositRequestId={request.id}
                                      formKey={`${request.id}-${assignment.id}`}
                                      receiptForm={receiptForms[`${request.id}-${assignment.id}`]}
                                      setReceiptForm={(form) => {
                                        setReceiptForms(prev => ({
                                          ...prev,
                                          [`${request.id}-${assignment.id}`]: form
                                        }));
                                      }}
                                    />
                                  ))}
                                  {/* دکمه ثبت همه فیش‌ها */}
                                  <Button 
                                    variant="primary" 
                                    className="w-full justify-center !bg-blue-600 hover:!bg-blue-700 shadow-lg text-sm py-3 mt-4"
                                    onClick={async () => {
                                      // بررسی اینکه همه فرم‌ها پر شده‌اند
                                      const allForms = request.filteredAssignments.map(a => receiptForms[`${request.id}-${a.id}`]);
                                      const incompleteForms = allForms.filter(f => !f || !f.amount || !f.tracking_number || !f.deposit_date || !f.receipt_file);
                                      
                                      if (incompleteForms.length > 0) {
                                        toast.error(`لطفا تمام فیش‌های واریزی را تکمیل کنید (${incompleteForms.length} فیش ناقص)`);
                                        return;
                                      }
                                      
                                      // آماده کردن داده‌ها برای ارسال
                                      const receipts = request.filteredAssignments.map(assignment => {
                                        const form = receiptForms[`${request.id}-${assignment.id}`];
                                        const gregorianDate = form.deposit_date!.toDate();
                                        const amount = parseFloat(form.amount.replace(/,/g, ''));
                                        const maxAmount = Number(assignment.amount);
                                        
                                        // بررسی اینکه مبلغ بیشتر از assignment.amount نباشد
                                        if (amount > maxAmount) {
                                          throw new Error(`مبلغ برای حساب ${assignment.account_display || assignment.id} نمی‌تواند بیشتر از ${toPersianDigits(maxAmount.toLocaleString())} ریال باشد`);
                                        }
                                        
                                        return {
                                          assignment_id: assignment.id,
                                          amount: amount,
                                          tracking_number: form.tracking_number,
                                          deposit_date: gregorianDate.toISOString().split('T')[0],
                                          receipt_image: form.receipt_file!,
                                        };
                                      });
                                      
                                      try {
                                        await walletAPI.uploadDepositReceiptsBatch(request.id, receipts);
                                        toast.success(`${receipts.length} فیش واریزی با موفقیت ثبت شد`);
                                        
                                        // پاک کردن فرم‌ها
                                        const newForms = { ...receiptForms };
                                        request.filteredAssignments.forEach(assignment => {
                                          delete newForms[`${request.id}-${assignment.id}`];
                                        });
                                        setReceiptForms(newForms);
                                        
                                        // به‌روزرسانی داده‌ها
                                        await fetchWalletData();
                                      } catch (error: any) {
                                        console.error('Error uploading receipts:', error);
                                        toast.error(error.response?.data?.error || "خطا در ثبت فیش‌های واریزی");
                                      }
                                    }}
                                  >
                                    ثبت همه فیش‌های واریزی ({request.filteredAssignments.length})
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
function AssignmentReceiptForm({
  assignment,
  depositRequestId,
  formKey,
  receiptForm,
  setReceiptForm,
}: {
  assignment: DepositAccountAssignment;
  depositRequestId: number;
  formKey: string;
  receiptForm?: {
    amount: string;
    tracking_number: string;
    deposit_date: DateObject | null;
    receipt_file: File | null;
    receipt_image: string | null;
  };
  setReceiptForm: (form: {
    amount: string;
    tracking_number: string;
    deposit_date: DateObject | null;
    receipt_file: File | null;
    receipt_image: string | null;
  }) => void;
}) {
  // مقدار پیش‌فرض مبلغ = assignment.amount
  const defaultAmount = assignment.amount ? Number(assignment.amount).toString() : "";
  const amount = receiptForm?.amount || defaultAmount;
  const trackingNumber = receiptForm?.tracking_number || "";
  const depositDate = receiptForm?.deposit_date || null;
  const receiptFile = receiptForm?.receipt_file || null;
  const receiptImage = receiptForm?.receipt_image || null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // تنظیم مقدار پیش‌فرض در اولین بار
  useEffect(() => {
    if (!receiptForm && defaultAmount) {
      setReceiptForm({
        amount: defaultAmount,
        tracking_number: "",
        deposit_date: null,
        receipt_file: null,
        receipt_image: null,
      });
    }
  }, [defaultAmount, receiptForm, setReceiptForm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptForm({
          amount: receiptForm?.amount || "",
          tracking_number: receiptForm?.tracking_number || "",
          deposit_date: receiptForm?.deposit_date || null,
          receipt_file: file,
          receipt_image: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const englishValue = toEnglishDigits(e.target.value);
    const value = englishValue.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value) || 0;
      const maxAmount = Number(assignment.amount);
      // محدود کردن مبلغ به حداکثر assignment.amount
      const finalValue = numValue > maxAmount ? maxAmount.toString() : value;
      setReceiptForm({
        amount: finalValue,
        tracking_number: receiptForm?.tracking_number || "",
        deposit_date: receiptForm?.deposit_date || null,
        receipt_file: receiptForm?.receipt_file || null,
        receipt_image: receiptForm?.receipt_image || null,
      });
      // نمایش هشدار اگر مبلغ بیشتر از assignment باشد
      if (numValue > maxAmount) {
        toast.error(`مبلغ نمی‌تواند بیشتر از ${toPersianDigits(maxAmount.toLocaleString())} ریال باشد`);
      }
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

  // تابع کپی کردن شماره کارت
  const handleCopyCardNumber = async () => {
    if (!cardNumber) return;
    try {
      await navigator.clipboard.writeText(cardNumber);
      toast.success("شماره کارت کپی شد");
    } catch (error) {
      toast.error("خطا در کپی کردن شماره کارت");
    }
  };

  // تابع کپی کردن شماره شبا (فقط قسمت عددی)
  const handleCopyShebaNumber = async () => {
    if (!shebaNumber) return;
    // حذف IR از ابتدا در صورت وجود
    const shebaDigits = shebaNumber.replace(/^IR/i, '').trim();
    try {
      await navigator.clipboard.writeText(shebaDigits);
      toast.success("شماره شبا کپی شد");
    } catch (error) {
      toast.error("خطا در کپی کردن شماره شبا");
    }
  };

  // فرمت کردن شماره کارت برای نمایش (هر 4 رقم با فاصله)
  const formatCardNumber = (card: string) => {
    if (!card) return '';
    const cleaned = card.replace(/\s/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  };

  // فرمت کردن شماره شبا برای نمایش (IR + اعداد با فاصله)
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
            مبلغ: {toPersianDigits(Number(assignment.amount).toLocaleString())} ریال
          </p>
        </div>
      </div>

      {/* نمایش شماره کارت و شبا */}
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

      <div className="space-y-3 pt-2 border-t border-blue-200">
        <div className="relative">
          <Input 
            label="مبلغ واریز شده"
            placeholder={toPersianDigits(Number(assignment.amount).toLocaleString())}
            value={amount ? toPersianDigits(formatNumber(amount)) : ""}
            onChange={handleAmountChange}
            className="text-center text-lg font-bold text-gray-800 dir-ltr"
            dir="ltr"
          />
          <span className="absolute left-4 top-[42px] text-gray-400 text-xs font-bold bg-white px-1">ریال</span>
          <p className="text-xs text-gray-500 mt-1 text-center">
            حداکثر: {toPersianDigits(Number(assignment.amount).toLocaleString())} ریال
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input 
            label="شماره پیگیری" 
            placeholder="مثلا: ۱۲۳۴۵۶" 
            className="text-center font-bold text-sm"
            value={trackingNumber}
            onChange={(e) => {
              const englishValue = toEnglishDigits(e.target.value);
              setReceiptForm({
                amount: receiptForm?.amount || "",
                tracking_number: englishValue,
                deposit_date: receiptForm?.deposit_date || null,
                receipt_file: receiptForm?.receipt_file || null,
                receipt_image: receiptForm?.receipt_image || null,
              });
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
                value={depositDate}
                onChange={(date) => {
                  setReceiptForm({
                    amount: receiptForm?.amount || "",
                    tracking_number: receiptForm?.tracking_number || "",
                    deposit_date: date as DateObject | null,
                    receipt_file: receiptForm?.receipt_file || null,
                    receipt_image: receiptForm?.receipt_image || null,
                  });
                }}
              />
              <CalendarIcon size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none"/>
            </div>
          </div>
        </div>

        {/* آپلود فیش */}
        <div className="w-full">
          <label className="block text-xs font-bold text-gray-700 mb-2">تصویر فیش واریزی</label>
          {!receiptImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-gold-500 hover:bg-gold-50/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group text-center h-24"
            >
              <UploadCloud size={20} className="text-gray-400 group-hover:text-gold-600 mb-1"/>
              <span className="text-[10px] font-bold text-gray-600">آپلود تصویر فیش</span>
            </div>
          ) : (
            <div className="relative h-32 border-2 border-green-500 rounded-xl overflow-hidden group">
              <img src={receiptImage} className="w-full h-full object-cover" alt="receipt" />
              <button onClick={() => {
                setReceiptForm({
                  amount: receiptForm?.amount || "",
                  tracking_number: receiptForm?.tracking_number || "",
                  deposit_date: receiptForm?.deposit_date || null,
                  receipt_file: null,
                  receipt_image: null,
                });
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }} className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded-full shadow-lg"><X size={14}/></button>
              <div className="absolute bottom-0 w-full bg-green-500 text-white text-center text-[10px] py-1 font-bold">آماده ارسال</div>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>

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
