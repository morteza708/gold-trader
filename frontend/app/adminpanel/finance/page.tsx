"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  CreditCard, Search, Eye, CheckCircle2, 
  XCircle, Clock, ArrowDownCircle, ArrowUpCircle,
  TrendingUp, DollarSign, AlertCircle, Download,
  User, Calendar, Building2, FileText, RefreshCw, Coins
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import StatsCard from "@/components/admin/StatsCard";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { type ImageUploadErrorReason } from "@/lib/utils/imageUpload";
import ImageCompressHelp from "@/components/ui/ImageCompressHelp";
import { adminWalletAPI, WithdrawalRequest, DepositRequest } from "@/lib/api/auth";
import { tradesAPI, PendingPurchase } from "@/lib/api/trades";
import { useDebounce } from "@/hooks/useDebounce";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import DepositDetailModalNew from "@/components/admin/DepositDetailModalNew";
import ImageUploadZone from "@/components/ui/ImageUploadZone";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"rial" | "gold" | "deposit">("rial");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED">("all");
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | DepositRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptUploadError, setReceiptUploadError] = useState<ImageUploadErrorReason | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "تراکنش‌های مالی | پنل مدیریت";
  }, []);

  // Debounce برای جستجو
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Handler برای تغییر فیلد جستجو
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // تبدیل اعداد فارسی به انگلیسی برای ذخیره‌سازی
    const englishValue = toEnglishDigits(e.target.value);
    setSearchQuery(englishValue);
  };

  // بارگذاری درخواست‌ها
  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      if (activeTab === 'deposit') {
        const params: Record<string, string> = {};
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const data = await adminWalletAPI.getDepositRequests(params);
        setDepositRequests(data);
        try {
          const pending = await tradesAPI.adminListPendingPurchases('active');
          setPendingPurchases(pending);
        } catch {
          setPendingPurchases([]);
        }
      } else {
        const params: Record<string, string> = {
          type: activeTab === 'rial' ? 'RIAL' : 'GOLD',
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const data = await adminWalletAPI.getWithdrawalRequests(params);
        setWithdrawalRequests(data);
      }
    } catch (error: unknown) {
      console.error('Error fetching requests:', error);
      if (!silent) {
        toast.error(activeTab === 'deposit' ? "خطا در دریافت درخواست‌های واریز" : "خطا در دریافت درخواست‌های برداشت");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeTab, statusFilter]);

  useVisibilityPolling(() => fetchRequests(true), { interval: 25000 });

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // فیلتر درخواست‌ها بر اساس جستجو
  const filteredWithdrawalRequests = withdrawalRequests.filter((request) => {
    if (!debouncedSearch) return true;
    const search = debouncedSearch.toLowerCase();
    return (
      request.user_info.phone_number.includes(search) ||
      request.user_info.first_name?.toLowerCase().includes(search) ||
      request.user_info.last_name?.toLowerCase().includes(search) ||
      request.request_code.toLowerCase().includes(search) ||
      request.user_info.account_code?.includes(search)
    );
  });

  const filteredDepositRequests = depositRequests.filter((request) => {
    if (!debouncedSearch) return true;
    const search = debouncedSearch.toLowerCase();
    return (
      request.user_info?.phone_number?.includes(search) ||
      request.user_info?.first_name?.toLowerCase().includes(search) ||
      request.user_info?.last_name?.toLowerCase().includes(search) ||
      request.request_code.toLowerCase().includes(search) ||
      (request.tracking_number?.includes(search) || false) ||
      request.user_info?.account_code?.includes(search)
    );
  });

  // آمار
  const stats = {
    total: activeTab === 'deposit' ? depositRequests.length : withdrawalRequests.length,
    pending: activeTab === 'deposit' 
      ? depositRequests.filter(r => r.status === 'PENDING').length
      : withdrawalRequests.filter(r => r.status === 'PENDING').length,
    approved: activeTab === 'deposit'
      ? depositRequests.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length
      : withdrawalRequests.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length,
    rejected: activeTab === 'deposit'
      ? depositRequests.filter(r => r.status === 'REJECTED').length
      : withdrawalRequests.filter(r => r.status === 'REJECTED').length,
    completed: activeTab === 'gold'
      ? withdrawalRequests.filter(r => r.withdrawal_type === 'GOLD' && r.status === 'COMPLETED').length
      : 0,
    totalAmount: activeTab === 'deposit'
      ? depositRequests
          .filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED')
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : withdrawalRequests
          .filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED')
          .reduce((sum, r) => sum + (r.withdrawal_type === 'RIAL' ? Number(r.amount) : 0), 0),
    totalGold: withdrawalRequests
      .filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (r.withdrawal_type === 'GOLD' ? Number(r.amount) : 0), 0),
  };

  // مشاهده جزئیات
  const handleViewDetails = async (request: WithdrawalRequest | DepositRequest) => {
    setIsDetailModalOpen(true);
    try {
      if (activeTab === 'deposit') {
        const detail = await adminWalletAPI.getDepositRequestDetail(request.id);
        setSelectedRequest(detail);
      } else {
        const detail = await adminWalletAPI.getWithdrawalRequestDetail(request.id);
        setSelectedRequest(detail);
      }
    } catch (error: any) {
      console.error('Error fetching request detail:', error);
      toast.error("خطا در دریافت جزئیات درخواست");
      setIsDetailModalOpen(false);
    }
  };

  // تایید درخواست
  const handleApprove = async (request: WithdrawalRequest | DepositRequest) => {
    setIsProcessing(request.id);
    try {
      if (activeTab === 'deposit') {
        await adminWalletAPI.approveDepositNewFlow((request as DepositRequest).id);
        toast.success("درخواست واریز با موفقیت تایید شد");
      } else {
        const withdrawal = request as WithdrawalRequest;
        if (withdrawal.withdrawal_type !== 'GOLD') {
          toast.error("برای برداشت ریالی، فیش واریزی را آپلود کرده و «تأیید واریز و تکمیل» را بزنید");
          return;
        }
        await adminWalletAPI.approveWithdrawal(withdrawal.id);
        toast.success("درخواست برداشت طلا تایید شد");
      }
      setIsDetailModalOpen(false);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.error || "خطا در تایید درخواست");
    } finally {
      setIsProcessing(null);
    }
  };

  // رد درخواست
  const handleReject = async (request: WithdrawalRequest | DepositRequest) => {
    if (!rejectNote.trim()) {
      toast.error("لطفا دلیل رد را وارد کنید");
      return;
    }

    setIsProcessing(request.id);
    try {
      if (activeTab === 'deposit') {
        await adminWalletAPI.rejectDeposit((request as DepositRequest).id, rejectNote);
        toast.success("درخواست واریز رد شد");
      } else {
        await adminWalletAPI.rejectWithdrawal((request as WithdrawalRequest).id, rejectNote);
        toast.success("درخواست رد شد");
      }
      setRejectNote("");
      setIsDetailModalOpen(false);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.error || "خطا در رد درخواست");
    } finally {
      setIsProcessing(null);
    }
  };

  // تکمیل برداشت ریالی (فیش + تأیید یک‌مرحله‌ای)
  const handleCompleteRialWithdrawal = async (request: WithdrawalRequest) => {
    if (!receiptFile) {
      toast.error("لطفا فیش واریزی را انتخاب کنید");
      return;
    }

    setIsProcessing(request.id);
    try {
      await adminWalletAPI.completeRialWithdrawal(request.id, {
        receipt_image: receiptFile,
        tracking_number: trackingNumber.trim() || undefined,
      });
      toast.success("برداشت ریالی با موفقیت تکمیل شد");
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setReceiptUploadError(null);
      setTrackingNumber("");
      setIsDetailModalOpen(false);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error completing rial withdrawal:', error);
      const message = error.response?.data?.error || "خطا در تکمیل برداشت ریالی";
      toast.error(message, { duration: 6000 });
      if (typeof message === "string" && (message.includes("حجم") || message.includes("فرمت"))) {
        setReceiptUploadError(message.includes("حجم") ? "size" : "format");
      }
    } finally {
      setIsProcessing(null);
    }
  };

  // ثبت تحویل حضوری برداشت طلا
  const handleCompleteGoldWithdrawal = async (request: WithdrawalRequest) => {
    setIsProcessing(request.id);
    try {
      await adminWalletAPI.completeGoldWithdrawal(request.id);
      toast.success("تحویل طلا با موفقیت ثبت شد");
      setIsDetailModalOpen(false);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error completing gold withdrawal:', error);
      toast.error(error.response?.data?.error || "خطا در ثبت تحویل");
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      'PENDING': { text: 'در انتظار', className: 'bg-orange-500/20 text-orange-400' },
      'APPROVED': { text: 'تایید شده', className: 'bg-blue-500/20 text-blue-400' },
      'REJECTED': { text: 'رد شده', className: 'bg-red-500/20 text-red-400' },
      'COMPLETED': { text: 'تکمیل شده', className: 'bg-green-500/20 text-green-400' },
    };
    const statusInfo = statusMap[status] || { text: status, className: 'bg-gray-500/20 text-gray-400' };
    return (
      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">مدیریت مالی</h1>
          <p className="text-sm text-slate-400">مدیریت درخواست‌های واریز، برداشت وجه و طلا</p>
        </div>
        <button
          onClick={() => fetchRequests()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      {/* آمار کلی */}
      <div className={`grid grid-cols-2 ${activeTab === 'gold' ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4`}>
        {[
          { title: "کل درخواست‌ها", value: stats.total, icon: FileText, color: "text-blue-400" },
          { title: "در انتظار", value: stats.pending, icon: Clock, color: "text-orange-400" },
          { title: "تایید شده", value: stats.approved, icon: CheckCircle2, color: "text-green-400" },
          { title: "رد شده", value: stats.rejected, icon: XCircle, color: "text-red-400" },
          ...(activeTab === 'gold' ? [
            { title: "تحویل داده شد", value: stats.completed, icon: CheckCircle2, color: "text-gold-400" }
          ] : []),
          { 
            title: activeTab === 'deposit' 
              ? "جمع مبلغ واریز" 
              : activeTab === 'rial' 
                ? "جمع مبلغ برداشت" 
                : "کل طلا", 
            value: activeTab === 'deposit' || activeTab === 'rial'
              ? `${toPersianDigits(Number(stats.totalAmount).toLocaleString())} ریال`
              : `${toPersianDigits(Number(stats.totalGold).toFixed(3))} گرم`,
            icon: activeTab === 'deposit' || activeTab === 'rial' ? DollarSign : Coins, 
            color: "text-gold-400" 
          },
        ].map((stat, idx) => (
          <StatsCard key={idx} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      {activeTab === 'deposit' && pendingPurchases.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-black text-blue-300 flex items-center gap-2">
            <Clock size={16} />
            خریدهای در انتظار تسویه ({toPersianDigits(pendingPurchases.length)})
          </h3>
          <div className="space-y-2">
            {pendingPurchases.map((pp) => (
              <div
                key={pp.id}
                className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1 text-slate-200">
                  <p className="font-bold text-white">
                    {pp.request_code} — {pp.user_phone || "کاربر"}
                  </p>
                  <p>
                    {toPersianDigits(String(pp.gold_amount))} گرم | کل{" "}
                    {toPersianDigits(Number(pp.locked_total).toLocaleString())} ریال | کف واریز{" "}
                    {toPersianDigits(Number(pp.deposit_min_amount).toLocaleString())} ریال
                  </p>
                  <p className="text-blue-300">{pp.status_display}
                    {pp.deposit_request_code ? ` — واریز: ${pp.deposit_request_code}` : ""}
                  </p>
                </div>
                <p className="text-slate-400 shrink-0">
                  مهلت: {pp.expires_at_jalali ? toPersianDigits(pp.expires_at_jalali) : "-"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            این واریزها اولویت دارند. پس از تخصیص حساب و تأیید فیش، خرید با قیمت قفل‌شده خودکار تکمیل می‌شود.
          </p>
        </div>
      )}

      {/* تب‌های نوع درخواست */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-2">
          <button
            onClick={() => {
              setActiveTab('rial');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'rial'
                ? 'bg-gold-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <DollarSign size={18} />
            <span className="hidden sm:inline">درخواست‌های برداشت وجه</span>
            <span className="sm:hidden">برداشت وجه</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('gold');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'gold'
                ? 'bg-gold-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Coins size={18} />
            <span className="hidden sm:inline">درخواست‌های برداشت طلا</span>
            <span className="sm:hidden">برداشت طلا</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('deposit');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'deposit'
                ? 'bg-gold-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <ArrowDownCircle size={18} />
            <span className="hidden sm:inline">درخواست‌های واریز</span>
            <span className="sm:hidden">واریز</span>
          </button>
        </div>
      </div>

      {/* نوار جستجو و فیلتر */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* جستجو */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'deposit' ? "جستجو بر اساس نام، شماره موبایل، کد حساب، کد درخواست یا شماره پیگیری..." : "جستجو بر اساس نام، شماره موبایل، کد حساب یا کد درخواست..."}
              value={toPersianDigits(searchQuery)}
              onChange={handleSearchChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 pr-10 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
            {isLoading && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <RefreshCw size={16} className="animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {/* فیلتر وضعیت */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm font-bold focus:outline-none focus:border-gold-500 transition-colors"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="PENDING">در انتظار</option>
            <option value="APPROVED">تایید شده</option>
            <option value="COMPLETED">تکمیل شده</option>
            <option value="REJECTED">رد شده</option>
          </select>
        </div>
      </div>

      {/* جدول درخواست‌ها - دسکتاپ */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کاربر</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کد درخواست</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">مقدار</th>
                {activeTab === 'rial' && (
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کارت بانکی</th>
                )}
                {activeTab === 'deposit' && (
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">شماره پیگیری</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">وضعیت</th>
                {activeTab === 'gold' && (
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">تحویل</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">تاریخ</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={activeTab === 'rial' ? 7 : activeTab === 'deposit' ? 7 : activeTab === 'gold' ? 8 : 6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : (activeTab === 'deposit' ? filteredDepositRequests : filteredWithdrawalRequests).length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'rial' ? 7 : activeTab === 'deposit' ? 7 : activeTab === 'gold' ? 8 : 6} className="px-4 py-12 text-center text-slate-400">
                    درخواستی یافت نشد
                  </td>
                </tr>
              ) : (
                (activeTab === 'deposit' ? filteredDepositRequests : filteredWithdrawalRequests).map((request) => (
                  <tr key={request.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {activeTab === 'deposit' 
                            ? (request as DepositRequest).user_info?.first_name && (request as DepositRequest).user_info?.last_name
                              ? `${(request as DepositRequest).user_info?.first_name} ${(request as DepositRequest).user_info?.last_name}`
                              : (request as DepositRequest).user_info?.phone_number || '-'
                            : (request as WithdrawalRequest).user_info?.first_name && (request as WithdrawalRequest).user_info?.last_name
                              ? `${(request as WithdrawalRequest).user_info?.first_name} ${(request as WithdrawalRequest).user_info?.last_name}`
                              : (request as WithdrawalRequest).user_info?.phone_number || '-'
                          }
                        </p>
                        {(activeTab === 'deposit' ? (request as DepositRequest).user_info?.account_code : (request as WithdrawalRequest).user_info?.account_code) && (
                          <p className="text-xs text-slate-400 mt-1">
                            کد: {toPersianDigits(activeTab === 'deposit' ? (request as DepositRequest).user_info?.account_code || '' : (request as WithdrawalRequest).user_info?.account_code || '')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-200 font-mono dir-ltr">{request.request_code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-white">
                        {activeTab === 'deposit'
                          ? `${toPersianDigits(Number((request as DepositRequest).amount || 0).toLocaleString())} ریال`
                          : (request as WithdrawalRequest).withdrawal_type === 'RIAL'
                            ? `${toPersianDigits(Number((request as WithdrawalRequest).amount || 0).toLocaleString())} ریال`
                            : `${toPersianDigits(Number((request as WithdrawalRequest).amount || 0).toFixed(3))} گرم`
                        }
                      </span>
                    </td>
                    {activeTab === 'rial' && (
                      <td className="px-4 py-4">
                        {(request as WithdrawalRequest).bank_card ? (
                          <div>
                            <p className="text-sm text-slate-200">{(request as WithdrawalRequest).bank_card?.bank_name}</p>
                            <p className="text-xs text-slate-400 font-mono dir-ltr">{(request as WithdrawalRequest).bank_card?.card_number}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                    )}
                    {activeTab === 'deposit' && (
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-200 font-mono dir-ltr">{(request as DepositRequest).tracking_number || '-'}</span>
                      </td>
                    )}
                    <td className="px-4 py-4">
                      {activeTab === 'gold' ? (
                        <div className="inline-block">
                          {getStatusBadge(
                            (request as WithdrawalRequest).status === 'COMPLETED' 
                              ? 'APPROVED' 
                              : (request as WithdrawalRequest).status === 'REJECTED' 
                                ? 'REJECTED' 
                                : (request as WithdrawalRequest).status
                          )}
                        </div>
                      ) : (
                        getStatusBadge(request.status)
                      )}
                    </td>
                    {activeTab === 'gold' && (
                      <td className="px-4 py-4">
                        {(request as WithdrawalRequest).status === 'COMPLETED' ? (
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-gold-500/20 text-gold-400">
                            تحویل داده شد
                          </span>
                        ) : (request as WithdrawalRequest).status === 'APPROVED' ? (
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-orange-500/20 text-orange-400">
                            آماده تحویل
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-slate-500/20 text-slate-400">
                            -
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300">
                        {request.created_at_jalali ? toPersianDigits(request.created_at_jalali) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white"
                        title="مشاهده جزئیات"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* کارت‌های درخواست‌ها - موبایل */}
      <div className="space-y-4 md:hidden">
        {isLoading ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            در حال بارگذاری...
          </div>
        ) : (activeTab === 'deposit' ? filteredDepositRequests : filteredWithdrawalRequests).length === 0 ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-400">
            درخواستی یافت نشد
          </div>
        ) : (
          (activeTab === 'deposit' ? filteredDepositRequests : filteredWithdrawalRequests).map((request) => (
            <div key={request.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-white">
                    {activeTab === 'deposit'
                      ? (() => {
                          const userInfo = (request as DepositRequest).user_info;
                          return userInfo?.first_name && userInfo?.last_name
                            ? `${userInfo.first_name} ${userInfo.last_name}`
                            : userInfo?.phone_number || '-';
                        })()
                      : (() => {
                          const userInfo = (request as WithdrawalRequest).user_info;
                          return userInfo?.first_name && userInfo?.last_name
                            ? `${userInfo.first_name} ${userInfo.last_name}`
                            : userInfo?.phone_number || '-';
                        })()
                    }
                  </p>
                  {(activeTab === 'deposit' ? (request as DepositRequest).user_info?.account_code : (request as WithdrawalRequest).user_info?.account_code) && (
                    <p className="text-xs text-slate-400 mt-1">
                      کد: {toPersianDigits(activeTab === 'deposit' ? (request as DepositRequest).user_info?.account_code || '' : (request as WithdrawalRequest).user_info?.account_code || '')}
                    </p>
                  )}
                </div>
                {getStatusBadge(request.status)}
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">کد درخواست</span>
                  <span className="text-sm text-slate-200 font-mono dir-ltr">{request.request_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">مقدار</span>
                  <span className="text-sm font-bold text-white">
                    {activeTab === 'deposit'
                      ? `${toPersianDigits(Number((request as DepositRequest).amount || 0).toLocaleString())} ریال`
                      : (request as WithdrawalRequest).withdrawal_type === 'RIAL'
                        ? `${toPersianDigits(Number((request as WithdrawalRequest).amount || 0).toLocaleString())} ریال`
                        : `${toPersianDigits(Number((request as WithdrawalRequest).amount || 0).toFixed(3))} گرم`
                    }
                  </span>
                </div>
                {activeTab === 'rial' && (request as WithdrawalRequest).bank_card && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">کارت بانکی</span>
                    <span className="text-sm text-slate-200">{(request as WithdrawalRequest).bank_card?.bank_name}</span>
                  </div>
                )}
                {activeTab === 'deposit' && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">شماره پیگیری</span>
                    <span className="text-sm text-slate-200 font-mono dir-ltr">{(request as DepositRequest).tracking_number}</span>
                  </div>
                )}
                {activeTab === 'gold' && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">وضعیت تایید</span>
                    <div className="inline-block">
                      {getStatusBadge(
                        (request as WithdrawalRequest).status === 'COMPLETED' 
                          ? 'APPROVED' 
                          : (request as WithdrawalRequest).status === 'REJECTED' 
                            ? 'REJECTED' 
                            : (request as WithdrawalRequest).status
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'gold' && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">وضعیت تحویل</span>
                    <span>
                      {(request as WithdrawalRequest).status === 'COMPLETED' ? (
                        <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-gold-500/20 text-gold-400">
                          تحویل داده شد
                        </span>
                      ) : (request as WithdrawalRequest).status === 'APPROVED' ? (
                        <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-orange-500/20 text-orange-400">
                          آماده تحویل
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-slate-500/20 text-slate-400">
                          -
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">تاریخ</span>
                  <span className="text-sm text-slate-300">
                    {request.created_at_jalali ? toPersianDigits(request.created_at_jalali) : '-'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleViewDetails(request)}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Eye size={14} />
                مشاهده جزئیات
              </button>
            </div>
          ))
        )}
      </div>

      {/* مودال جزئیات */}
      <AnimatePresence>
        {isDetailModalOpen && selectedRequest && (
          activeTab === 'deposit' ? (
            <DepositDetailModalNew
              request={selectedRequest as DepositRequest}
              isOpen={isDetailModalOpen}
              isLoading={isProcessing === selectedRequest.id}
              onClose={() => {
                setIsDetailModalOpen(false);
                setSelectedRequest(null);
                setRejectNote("");
              }}
              onSuccess={fetchRequests}
              rejectNote={rejectNote}
              setRejectNote={setRejectNote}
            />
          ) : (
            <WithdrawalDetailModal
              request={selectedRequest as WithdrawalRequest}
              isOpen={isDetailModalOpen}
              isLoading={isProcessing === selectedRequest.id}
              onClose={() => {
                setIsDetailModalOpen(false);
                setSelectedRequest(null);
                setReceiptFile(null);
                setReceiptPreviewUrl(null);
                setReceiptUploadError(null);
                setTrackingNumber("");
                setRejectNote("");
              }}
              onApprove={handleApprove}
              onReject={handleReject}
              onCompleteRial={handleCompleteRialWithdrawal}
              onCompleteGold={handleCompleteGoldWithdrawal}
              receiptFile={receiptFile}
              setReceiptFile={setReceiptFile}
              receiptPreviewUrl={receiptPreviewUrl}
              setReceiptPreviewUrl={setReceiptPreviewUrl}
              receiptUploadError={receiptUploadError}
              setReceiptUploadError={setReceiptUploadError}
              trackingNumber={trackingNumber}
              setTrackingNumber={setTrackingNumber}
              rejectNote={rejectNote}
              setRejectNote={setRejectNote}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}

// کامپوننت مودال جزئیات واریز
function DepositDetailModal({
  request,
  isOpen,
  isLoading,
  onClose,
  onApprove,
  onReject,
  rejectNote,
  setRejectNote,
}: {
  request: DepositRequest;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onApprove: (request: DepositRequest) => void;
  onReject: (request: DepositRequest) => void;
  rejectNote: string;
  setRejectNote: (note: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h3 className="text-xl font-black text-white">
            جزئیات درخواست واریز
          </h3>
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
                  <p className="text-sm font-bold text-white">
                    {request.user_info?.first_name && request.user_info?.last_name
                      ? `${request.user_info.first_name} ${request.user_info.last_name}`
                      : '-'
                    }
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">شماره موبایل</p>
                  <p className="text-sm font-bold text-white dir-ltr text-right tracking-wider">
                    {toPersianDigits(request.user_info?.phone_number || '')}
                  </p>
                </div>
                {request.user_info?.account_code && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">کد حساب</p>
                    <p className="text-sm font-bold text-white dir-ltr text-right">
                      {toPersianDigits(request.user_info.account_code)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* اطلاعات درخواست */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <FileText size={16} />
                اطلاعات درخواست
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">کد درخواست</p>
                  <p className="text-sm font-bold text-white font-mono dir-ltr">{request.request_code}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">مبلغ</p>
                  <p className="text-sm font-bold text-white">
                    {toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">شماره پیگیری</p>
                  <p className="text-sm font-bold text-white font-mono dir-ltr">{request.tracking_number}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">تاریخ واریز</p>
                  <p className="text-sm font-bold text-white">
                    {request.deposit_date_jalali ? toPersianDigits(request.deposit_date_jalali) : '-'}
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">وضعیت</p>
                  <div className="mt-2">
                    {request.status === 'PENDING' && (
                      <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-bold">
                        در انتظار
                      </span>
                    )}
                    {request.status === 'APPROVED' && (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold">
                        تایید شده
                      </span>
                    )}
                    {request.status === 'REJECTED' && (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold">
                        رد شده
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">تاریخ ثبت</p>
                  <p className="text-sm font-bold text-white">
                    {request.created_at_jalali ? toPersianDigits(request.created_at_jalali) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* فیش واریزی */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <FileText size={16} />
                فیش واریزی
              </h4>
              {(request.receipt_image_url || request.receipt_image) && (request.receipt_image_url || request.receipt_image)?.trim() !== '' ? (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <img 
                    src={(request.receipt_image_url || request.receipt_image) || ''} 
                    alt="فیش واریزی" 
                    className="w-full h-auto rounded-lg border border-slate-600"
                    onError={(e) => {
                      console.error('Error loading receipt image:', request.receipt_image_url || request.receipt_image);
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-center text-slate-400 text-sm py-4">خطا در بارگذاری تصویر</div>';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center text-slate-400 text-sm py-4">
                  فیش واریزی آپلود نشده است
                </div>
              )}
            </div>

            {/* یادداشت مدیر */}
            {request.admin_note && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                <p className="text-xs text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={14} />
                  یادداشت مدیر
                </p>
                <p className="text-sm text-red-300">{request.admin_note}</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        {request.status === 'PENDING' && (
          <div className="p-6 border-t border-slate-700 space-y-4 bg-slate-900">
            {/* فیلد یادداشت رد */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">یادداشت رد (اختیاری)</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="در صورت رد درخواست، دلیل را وارد کنید..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                rows={3}
              />
            </div>

            {/* دکمه‌های عملیات */}
            <div className="flex gap-3">
              <button
                onClick={() => onApprove(request)}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    در حال تایید...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    تایید درخواست
                  </>
                )}
              </button>
              <button
                onClick={() => onReject(request)}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    در حال رد...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    رد درخواست
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// کامپوننت مودال جزئیات
function WithdrawalDetailModal({
  request,
  isOpen,
  isLoading,
  onClose,
  onApprove,
  onReject,
  onCompleteRial,
  onCompleteGold,
  receiptFile,
  setReceiptFile,
  receiptPreviewUrl,
  setReceiptPreviewUrl,
  receiptUploadError,
  setReceiptUploadError,
  trackingNumber,
  setTrackingNumber,
  rejectNote,
  setRejectNote,
}: {
  request: WithdrawalRequest;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onApprove: (request: WithdrawalRequest) => void;
  onReject: (request: WithdrawalRequest) => void;
  onCompleteRial: (request: WithdrawalRequest) => void;
  onCompleteGold: (request: WithdrawalRequest) => void;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  receiptPreviewUrl: string | null;
  setReceiptPreviewUrl: (url: string | null) => void;
  receiptUploadError: ImageUploadErrorReason | null;
  setReceiptUploadError: (reason: ImageUploadErrorReason | null) => void;
  trackingNumber: string;
  setTrackingNumber: (value: string) => void;
  rejectNote: string;
  setRejectNote: (note: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h3 className="text-xl font-black text-white">
            جزئیات درخواست {request.withdrawal_type === 'RIAL' ? 'برداشت وجه' : 'برداشت طلا'}
          </h3>
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
                  <p className="text-sm font-bold text-white">
                    {request.user_info.first_name && request.user_info.last_name
                      ? `${request.user_info.first_name} ${request.user_info.last_name}`
                      : '-'
                    }
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">شماره موبایل</p>
                  <p className="text-sm font-bold text-white dir-ltr text-right tracking-wider">
                    {toPersianDigits(request.user_info.phone_number)}
                  </p>
                </div>
                {request.user_info.account_code && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">کد حساب</p>
                    <p className="text-sm font-bold text-white dir-ltr text-right">
                      {toPersianDigits(request.user_info.account_code)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* اطلاعات درخواست */}
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <FileText size={16} />
                اطلاعات درخواست
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">کد درخواست</p>
                  <p className="text-sm font-bold text-white font-mono dir-ltr">{request.request_code}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">مبلغ کل درخواست</p>
                  <p className="text-sm font-bold text-white">
                    {request.withdrawal_type === 'RIAL'
                      ? `${toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال`
                      : `${toPersianDigits(Number(request.amount || 0).toFixed(3))} گرم`
                    }
                  </p>
                </div>
                {/* مبلغ پرداخت شده — فقط برداشت طلا (در صورت نیاز) */}
                {request.withdrawal_type === 'GOLD' && request.paid_amount !== undefined && request.paid_amount > 0 && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">مبلغ پرداخت شده</p>
                    <p className="text-sm font-bold text-green-400">
                      {toPersianDigits(Number(request.paid_amount || 0).toFixed(3))} گرم
                    </p>
                  </div>
                )}
                {/* باقی‌مانده — فقط برداشت طلا */}
                {request.withdrawal_type === 'GOLD' && request.remaining_amount !== undefined && request.remaining_amount > 0 && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-yellow-500/50">
                    <p className="text-xs text-slate-400 mb-1">باقی‌مانده</p>
                    <p className="text-sm font-bold text-yellow-400">
                      {toPersianDigits(Number(request.remaining_amount || 0).toFixed(3))} گرم
                    </p>
                  </div>
                )}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">وضعیت</p>
                  <div className="mt-2">
                    {request.status === 'PENDING' && (
                      <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-bold">
                        {request.withdrawal_type === 'RIAL' ? 'در انتظار واریز' : 'در انتظار'}
                      </span>
                    )}
                    {request.status === 'APPROVED' && (
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">
                        {request.withdrawal_type === 'GOLD' ? 'آماده تحویل' : 'تایید شده'}
                      </span>
                    )}
                    {request.status === 'COMPLETED' && (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold">
                        {request.withdrawal_type === 'GOLD' ? 'تحویل داده شد' : 'واریز انجام شد'}
                      </span>
                    )}
                    {request.status === 'REJECTED' && (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold">
                        رد شده
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">تاریخ ثبت</p>
                  <p className="text-sm font-bold text-white">
                    {request.created_at_jalali ? toPersianDigits(request.created_at_jalali) : '-'}
                  </p>
                </div>
                {request.completed_at_jalali && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">
                      {request.withdrawal_type === 'GOLD' ? 'تاریخ تحویل' : 'تاریخ تکمیل'}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {toPersianDigits(request.completed_at_jalali)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* آدرس تحویل (فقط برای برداشت طلا) */}
            {request.withdrawal_type === 'GOLD' && request.gold_pickup_address && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <Building2 size={16} />
                  آدرس مراجعه حضوری
                </h4>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-sm text-white whitespace-pre-line leading-relaxed">
                    {request.gold_pickup_address}
                  </p>
                </div>
              </div>
            )}

            {/* اطلاعات کارت بانکی (فقط برای برداشت وجه) */}
            {request.withdrawal_type === 'RIAL' && request.bank_card && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <Building2 size={16} />
                  اطلاعات کارت بانکی
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">نام بانک</p>
                    <p className="text-sm font-bold text-white">{request.bank_card.bank_name}</p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">شماره کارت</p>
                    <p className="text-sm font-bold text-white font-mono dir-ltr">{request.bank_card.card_number}</p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 md:col-span-2">
                    <p className="text-xs text-slate-400 mb-1">شماره شبا</p>
                    <p className="text-sm font-bold text-white font-mono dir-ltr">{request.bank_card.sheba_number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* فیش واریزی (برداشت ریالی تکمیل‌شده) */}
            {request.withdrawal_type === 'RIAL' && request.receipt_image && request.receipt_image.trim() !== '' && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  فیش واریزی
                </h4>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <img 
                    src={request.receipt_image} 
                    alt="فیش واریزی" 
                    className="w-full h-auto rounded-lg border border-slate-600 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(request.receipt_image || '', '_blank')}
                    onError={(e) => {
                      console.error('Error loading receipt image:', request.receipt_image);
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-center text-slate-400 text-sm py-4">خطا در بارگذاری تصویر</div>';
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* یادداشت مدیر */}
            {request.admin_note && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                <p className="text-xs text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={14} />
                  یادداشت مدیر
                </p>
                <p className="text-sm text-red-300">{request.admin_note}</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        {request.status === 'PENDING' && (
          <div className="p-6 border-t border-slate-700 space-y-4 bg-slate-900">
            {request.withdrawal_type === 'RIAL' && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">فیش واریزی (الزامی)</label>
                  <ImageUploadZone
                    purpose="document"
                    variant="dark"
                    file={receiptFile}
                    previewUrl={receiptPreviewUrl}
                    emptyHint="انتخاب فایل فیش واریزی"
                    onFileChange={(file, url) => {
                      setReceiptFile(file);
                      setReceiptPreviewUrl(url);
                      if (file) setReceiptUploadError(null);
                    }}
                    onError={(msg) => {
                      setReceiptFile(null);
                      setReceiptPreviewUrl(null);
                      setReceiptUploadError("general");
                      toast.error(msg, { duration: 5000 });
                    }}
                  />
                  {receiptUploadError && (
                    <ImageCompressHelp reason={receiptUploadError} variant="dark" compact />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">شماره پیگیری واریز (اختیاری)</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(toEnglishDigits(e.target.value))}
                    placeholder="شماره پیگیری بانکی..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors dir-ltr text-right font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-2">یادداشت رد (اختیاری)</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="در صورت رد درخواست، دلیل را وارد کنید..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-3 flex-wrap">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                بستن
              </button>
              <button
                onClick={() => onReject(request)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    رد درخواست
                  </>
                )}
              </button>
              {request.withdrawal_type === 'RIAL' ? (
                <button
                  onClick={() => onCompleteRial(request)}
                  disabled={isLoading || !receiptFile}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      تأیید واریز و تکمیل
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => onApprove(request)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      تایید درخواست
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        {request.status !== 'PENDING' && (
          <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-900">
            {request.withdrawal_type === 'GOLD' && request.status === 'APPROVED' && (
              <button
                onClick={() => onCompleteGold(request)}
                disabled={isLoading}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    ثبت تحویل حضوری
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              بستن
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
