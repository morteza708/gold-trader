"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  CreditCard, Search, Eye, CheckCircle2, 
  XCircle, Clock, ArrowDownCircle, ArrowUpCircle,
  TrendingUp, DollarSign, AlertCircle, Download,
  User, Calendar, Building2, FileText, RefreshCw, Coins, Upload
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import StatsCard from "@/components/admin/StatsCard";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { adminWalletAPI, WithdrawalRequest, DepositRequest } from "@/lib/api/auth";
import { useDebounce } from "@/hooks/useDebounce";
import DepositDetailModalNew from "@/components/admin/DepositDetailModalNew";

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
  const [rejectNote, setRejectNote] = useState("");

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
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'deposit') {
        const params: any = {};
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const data = await adminWalletAPI.getDepositRequests(params);
        setDepositRequests(data);
      } else {
        const params: any = {
          type: activeTab === 'rial' ? 'RIAL' : 'GOLD',
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const data = await adminWalletAPI.getWithdrawalRequests(params);
        setWithdrawalRequests(data);
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error(activeTab === 'deposit' ? "خطا در دریافت درخواست‌های واریز" : "خطا در دریافت درخواست‌های برداشت");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, statusFilter]);

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
        await adminWalletAPI.approveDeposit((request as DepositRequest).id);
        toast.success("درخواست واریز با موفقیت تایید شد");
      } else {
        await adminWalletAPI.approveWithdrawal((request as WithdrawalRequest).id);
        toast.success("درخواست با موفقیت تایید شد");
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

  // آپلود فیش واریزی
  const handleUploadReceipt = async (request: WithdrawalRequest) => {
    if (!receiptFile) {
      toast.error("لطفا فایل فیش واریزی را انتخاب کنید");
      return;
    }

    setIsProcessing(request.id);
    try {
      await adminWalletAPI.uploadReceipt(request.id, receiptFile);
      toast.success("فیش واریزی با موفقیت آپلود شد");
      setReceiptFile(null);
      await fetchRequests();
      if (selectedRequest?.id === request.id) {
        const updated = await adminWalletAPI.getWithdrawalRequestDetail(request.id);
        setSelectedRequest(updated);
      }
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      toast.error(error.response?.data?.error || "خطا در آپلود فیش واریزی");
    } finally {
      setIsProcessing(null);
    }
  };

  // تسویه درخواست برداشت طلا
  const handleCompleteGoldWithdrawal = async (request: WithdrawalRequest) => {
    setIsProcessing(request.id);
    try {
      await adminWalletAPI.completeGoldWithdrawal(request.id);
      toast.success("درخواست با موفقیت تسویه شد");
      setIsDetailModalOpen(false);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error completing gold withdrawal:', error);
      toast.error(error.response?.data?.error || "خطا در تسویه درخواست");
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
            { title: "تسویه شده", value: stats.completed, icon: CheckCircle2, color: "text-gold-400" }
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
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">تسویه</th>
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
                            تسویه شده
                          </span>
                        ) : (request as WithdrawalRequest).status === 'APPROVED' ? (
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-orange-500/20 text-orange-400">
                            تسویه نشده
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
                    <span className="text-xs text-slate-400">وضعیت تسویه</span>
                    <span>
                      {(request as WithdrawalRequest).status === 'COMPLETED' ? (
                        <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-gold-500/20 text-gold-400">
                          تسویه شده
                        </span>
                      ) : (request as WithdrawalRequest).status === 'APPROVED' ? (
                        <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-orange-500/20 text-orange-400">
                          تسویه نشده
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
                setRejectNote("");
              }}
              onApprove={handleApprove}
              onReject={handleReject}
              onUploadReceipt={handleUploadReceipt}
              onCompleteGold={handleCompleteGoldWithdrawal}
              receiptFile={receiptFile}
              setReceiptFile={setReceiptFile}
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
  onUploadReceipt,
  onCompleteGold,
  receiptFile,
  setReceiptFile,
  rejectNote,
  setRejectNote,
}: {
  request: WithdrawalRequest;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onApprove: (request: WithdrawalRequest) => void;
  onReject: (request: WithdrawalRequest) => void;
  onUploadReceipt: (request: WithdrawalRequest) => void;
  onCompleteGold: (request: WithdrawalRequest) => void;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
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
                  <p className="text-xs text-slate-400 mb-1">مقدار</p>
                  <p className="text-sm font-bold text-white">
                    {request.withdrawal_type === 'RIAL'
                      ? `${toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال`
                      : `${toPersianDigits(Number(request.amount || 0).toFixed(3))} گرم`
                    }
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
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">
                        تایید شده
                      </span>
                    )}
                    {request.status === 'COMPLETED' && (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold">
                        تکمیل شده
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
                    <p className="text-xs text-slate-400 mb-1">تاریخ تسویه</p>
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

            {/* فیش‌های واریزی مرتبط (برای درخواست‌های تایید شده خودکار) */}
            {request.status === 'APPROVED' && request.deposit_receipts_info && request.deposit_receipts_info.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  فیش‌های واریزی مرتبط
                </h4>
                <div className="space-y-4">
                  {request.deposit_receipts_info.map((receiptInfo, idx) => (
                    <div key={receiptInfo.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <div className="mb-4 pb-4 border-b border-slate-700">
                        <p className="text-xs text-slate-400 mb-2">اطلاعات واریزکننده</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">نام و نام خانوادگی</p>
                            <p className="text-sm font-bold text-white">{receiptInfo.depositor_info.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">شماره موبایل</p>
                            <p className="text-sm font-bold text-white dir-ltr text-right tracking-wider">
                              {toPersianDigits(receiptInfo.depositor_info.phone_number)}
                            </p>
                          </div>
                          {receiptInfo.depositor_info.account_code && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">کد حساب</p>
                              <p className="text-sm font-bold text-white dir-ltr text-right">
                                {toPersianDigits(receiptInfo.depositor_info.account_code)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500 mb-1">کد درخواست واریز</p>
                            <p className="text-sm font-bold text-white font-mono dir-ltr">{receiptInfo.deposit_request_code}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4 pb-4 border-b border-slate-700">
                        <p className="text-xs text-slate-400 mb-2">اطلاعات فیش</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">مبلغ</p>
                            <p className="text-sm font-bold text-white">
                              {toPersianDigits(Number(receiptInfo.amount).toLocaleString())} ریال
                            </p>
                          </div>
                          {receiptInfo.tracking_number && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">شماره پیگیری</p>
                              <p className="text-sm font-bold text-white font-mono dir-ltr">{receiptInfo.tracking_number}</p>
                            </div>
                          )}
                          {receiptInfo.deposit_date_jalali && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">تاریخ واریز</p>
                              <p className="text-sm font-bold text-white">
                                {toPersianDigits(receiptInfo.deposit_date_jalali)}
                              </p>
                            </div>
                          )}
                          {receiptInfo.created_at_jalali && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">تاریخ ثبت</p>
                              <p className="text-sm font-bold text-white">
                                {toPersianDigits(receiptInfo.created_at_jalali)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {receiptInfo.receipt_image_url && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">عکس فیش</p>
                          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <img 
                              src={receiptInfo.receipt_image_url} 
                              alt={`فیش واریزی ${idx + 1}`}
                              className="w-full h-auto rounded-lg border border-slate-600 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(receiptInfo.receipt_image_url || '', '_blank')}
                              onError={(e) => {
                                console.error('Error loading receipt image:', receiptInfo.receipt_image_url);
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* فیش واریزی (فقط برای برداشت وجه) */}
            {request.withdrawal_type === 'RIAL' && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  فیش واریزی
                </h4>
                {request.receipt_image && request.receipt_image.trim() !== '' ? (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <img 
                      src={request.receipt_image} 
                      alt="فیش واریزی" 
                      className="w-full h-auto rounded-lg border border-slate-600"
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
                ) : request.status === 'APPROVED' || request.status === 'COMPLETED' ? (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setReceiptFile(file);
                        }}
                        className="hidden"
                        id="receipt-upload"
                      />
                      <label
                        htmlFor="receipt-upload"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold text-white cursor-pointer transition-colors"
                      >
                        <Upload size={16} />
                        انتخاب فایل فیش
                      </label>
                      {receiptFile && (
                        <span className="text-sm text-slate-300">{receiptFile.name}</span>
                      )}
                    </div>
                    {receiptFile && (
                      <button
                        onClick={() => onUploadReceipt(request)}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 rounded-lg text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            در حال آپلود...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            آپلود فیش واریزی
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
                    فیش واریزی آپلود نشده است
                  </div>
                )}
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
            {/* فیلد یادداشت رد */}
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
            
            <div className="flex justify-end gap-3">
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
                    در حال تسویه...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    تسویه درخواست
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
