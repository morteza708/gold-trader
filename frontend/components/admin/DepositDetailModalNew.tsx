"use client";

import { useState, useEffect } from "react";
import { 
  XCircle, User, FileText, AlertCircle, RefreshCw, 
  CheckCircle2, CreditCard, Building2, Plus, Calculator,
  Trash2, Check, ChevronDown, ChevronUp
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { 
  adminWalletAPI, 
  depositAccountsAPI,
  DepositRequest, 
  WithdrawalRequest,
  DepositAccount,
  DepositAccountAssignment
} from "@/lib/api/auth";

interface DepositDetailModalNewProps {
  request: DepositRequest;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rejectNote: string;
  setRejectNote: (note: string) => void;
}

export default function DepositDetailModalNew({
  request,
  isOpen,
  isLoading,
  onClose,
  onSuccess,
  rejectNote,
  setRejectNote,
}: DepositDetailModalNewProps) {
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [depositAccounts, setDepositAccounts] = useState<DepositAccount[]>([]);
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<Set<number>>(new Set());
  const [assignments, setAssignments] = useState<Array<{
    account_type: 'WITHDRAWAL' | 'DEPOSIT_ACCOUNT' | 'CUSTOM';
    withdrawal_request_id?: number;
    deposit_account_id?: number;
    custom_bank_name?: string;
    custom_owner_name?: string;
    custom_card_number?: string;
    custom_sheba_number?: string;
    amount: number;
    order: number;
  }>>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showCustomAccountForm, setShowCustomAccountForm] = useState(false);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [customAccount, setCustomAccount] = useState({
    bank_name: '',
    owner_name: '',
    card_number: '',
    sheba_number: '',
    amount: 0,
  });

  // محاسبه مبلغ باقی‌مانده
  const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
  const remainingAmount = Math.max(0, Number(request.amount) - totalAssigned); // اگر منفی شد، صفر می‌شود

  // بارگذاری داده‌ها
  useEffect(() => {
    if (isOpen && request.status === 'PENDING') {
      loadData();
    }
  }, [isOpen, request.id, request.status]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      // بارگذاری درخواست‌های برداشت
      const withdrawals = await adminWalletAPI.getDepositWithdrawalRequests(request.id);
      setWithdrawalRequests(withdrawals);

      // بارگذاری حساب‌های پیش‌فرض
      const accounts = await depositAccountsAPI.getAllAccounts();
      setDepositAccounts(accounts.filter(a => a.is_active));
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error("خطا در بارگذاری داده‌ها");
    } finally {
      setIsLoadingData(false);
    }
  };

  // انتخاب/لغو انتخاب درخواست برداشت
  const toggleWithdrawal = (withdrawalId: number, withdrawalAmount: number, remainingAmount?: number) => {
    const newSelected = new Set(selectedWithdrawals);
    if (newSelected.has(withdrawalId)) {
      newSelected.delete(withdrawalId);
      // حذف از assignments
      setAssignments(prev => prev.filter(a => a.withdrawal_request_id !== withdrawalId));
    } else {
      newSelected.add(withdrawalId);
      // محاسبه باقی‌مانده فعلی (قبل از اضافه کردن این assignment)
      const currentTotalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
      const currentRemaining = Math.max(0, Number(request.amount) - currentTotalAssigned);
      
      // استفاده از باقی‌مانده برداشت (اگر موجود باشد) یا مبلغ کل
      // این برای حالتی است که برداشت ناقص است و باید فقط باقی‌مانده تخصیص داده شود
      const withdrawalRemaining = remainingAmount !== undefined && remainingAmount > 0 
        ? remainingAmount 
        : withdrawalAmount;
      
      // محاسبه مبلغ تخصیص یافته: حداقل بین باقی‌مانده برداشت و باقی‌مانده درخواست واریز
      const assignmentAmount = Math.min(withdrawalRemaining, currentRemaining);
      
      // اضافه کردن به assignments
      setAssignments(prev => [...prev, {
        account_type: 'WITHDRAWAL',
        withdrawal_request_id: withdrawalId,
        amount: assignmentAmount, // استفاده از مبلغ محاسبه شده
        order: prev.length + 1,
      }]);
    }
    setSelectedWithdrawals(newSelected);
  };

  // اضافه کردن حساب پیش‌فرض
  const addDepositAccount = (account: DepositAccount) => {
    if (remainingAmount <= 0) {
      toast.error("مبلغ کامل شده است");
      return;
    }
    const amount = Math.min(remainingAmount, Number(request.amount));
    setAssignments(prev => [...prev, {
      account_type: 'DEPOSIT_ACCOUNT',
      deposit_account_id: account.id,
      amount: amount,
      order: prev.length + 1,
    }]);
  };

  // اضافه کردن حساب سفارشی
  const addCustomAccount = () => {
    if (!customAccount.bank_name || !customAccount.card_number || customAccount.amount <= 0) {
      toast.error("لطفا تمام فیلدها را پر کنید");
      return;
    }
    if (customAccount.amount > remainingAmount) {
      toast.error("مبلغ بیشتر از باقی‌مانده است");
      return;
    }
    setAssignments(prev => [...prev, {
      account_type: 'CUSTOM',
      custom_bank_name: customAccount.bank_name,
      custom_owner_name: customAccount.owner_name,
      custom_card_number: customAccount.card_number,
      custom_sheba_number: customAccount.sheba_number,
      amount: customAccount.amount,
      order: prev.length + 1,
    }]);
    setCustomAccount({
      bank_name: '',
      owner_name: '',
      card_number: '',
      sheba_number: '',
      amount: 0,
    });
    setShowCustomAccountForm(false);
  };

  // حذف assignment
  const removeAssignment = (index: number) => {
    const assignment = assignments[index];
    if (assignment.withdrawal_request_id) {
      const newSelected = new Set(selectedWithdrawals);
      newSelected.delete(assignment.withdrawal_request_id);
      setSelectedWithdrawals(newSelected);
    }
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  // ثبت حساب‌ها
  const handleAssignAccounts = async () => {
    if (assignments.length === 0) {
      toast.error("لطفا حداقل یک حساب انتخاب کنید");
      return;
    }
    // حذف validation باقی‌مانده - اجازه می‌دهیم partial payment انجام شود
    // if (remainingAmount > 0) {
    //   toast.error(`مبلغ ${toPersianDigits(remainingAmount.toLocaleString())} ریال باقی مانده است`);
    //   return;
    // }

    setIsAssigning(true);
    try {
      await adminWalletAPI.assignDepositAccounts(request.id, assignments);
      toast.success("حساب‌ها با موفقیت ثبت شد و پیامک به کاربر ارسال شد");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error assigning accounts:', error);
      toast.error(error.response?.data?.error || "خطا در ثبت حساب‌ها");
    } finally {
      setIsAssigning(false);
    }
  };

  // رد درخواست
  const handleReject = async () => {
    if (!rejectNote.trim()) {
      toast.error("لطفا دلیل رد را وارد کنید");
      return;
    }
    try {
      await adminWalletAPI.rejectDeposit(request.id, rejectNote);
      toast.success("درخواست با موفقیت رد شد");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error rejecting deposit:', error);
      toast.error(error.response?.data?.error || "خطا در رد درخواست");
    }
  };

  // تایید درخواست (بعد از آپلود فیش‌ها)
  const handleApprove = async () => {
    try {
      const result = await adminWalletAPI.approveDepositNewFlow(request.id);
      toast.success(result.message || "درخواست با موفقیت تایید شد");
      if (result.auto_approved_count > 0) {
        toast.success(`${result.auto_approved_count} درخواست برداشت به صورت خودکار تایید شد`);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error approving deposit:', error);
      toast.error(error.response?.data?.error || "خطا در تایید درخواست");
    }
  };

  // تایید وقتی برای هر تخصیص، جمع فیش‌ها ≥ مبلغ تخصیص باشد
  const assignmentsCovered = !!(request.assignments && request.assignments.length > 0 &&
    request.assignments.every((assignment) => {
      const remaining = Number(assignment.remaining_amount);
      if (!Number.isNaN(remaining) && assignment.remaining_amount !== undefined && assignment.remaining_amount !== null) {
        return remaining <= 0;
      }
      const assignmentReceipts = (request.receipts || []).filter(
        (r) => r.account_assignment === assignment.id || (r as any).account_assignment_info?.id === assignment.id
      );
      const total = assignmentReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      return total >= Number(assignment.amount);
    }));

  const canApprove = request.status === 'PENDING' &&
                     assignmentsCovered &&
                     !!(request.receipts && request.receipts.length > 0) &&
                     request.receipts.every(r => r.status === 'PENDING' || r.status === 'APPROVED');

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
        className="bg-slate-800 w-full max-w-4xl rounded-3xl border border-slate-700 shadow-2xl relative z-60 max-h-[90vh] overflow-hidden flex flex-col"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">کد درخواست</p>
                  <p className="text-sm font-bold text-white font-mono dir-ltr">{request.request_code}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">مبلغ درخواستی</p>
                  <p className="text-sm font-bold text-white">
                    {toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال
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
              </div>
            </div>

            {/* بخش انتخاب حساب‌ها (فقط برای PENDING) */}
            {request.status === 'PENDING' && (
              <>
                {/* ماشین حساب */}
                <div className="bg-gold-500/10 border border-gold-500/30 p-4 rounded-xl">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-gold-400" />
                      <span className="text-sm font-bold text-gold-400">ماشین حساب</span>
                    </div>
                    <div className="text-right w-full md:w-auto md:pr-4">
                      <p className="text-xs text-slate-400 mb-1">مبلغ تخصیص یافته</p>
                      <p className="text-lg font-black text-gold-400">
                        {toPersianDigits(totalAssigned.toLocaleString())} ریال
                      </p>
                    </div>
                    <div className="text-right w-full md:w-auto border-t md:border-t-0 md:border-r border-gold-500/30 pt-4 md:pt-0 md:pr-4 md:pl-4">
                      <p className="text-xs text-slate-400 mb-1">باقی‌مانده</p>
                      <p className={`text-lg font-black ${remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                        {toPersianDigits(remainingAmount.toLocaleString())} ریال
                      </p>
                    </div>
                  </div>
                </div>

                {/* لیست درخواست‌های برداشت */}
                {isLoadingData ? (
                  <div className="text-center py-8">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-400">در حال بارگذاری...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                        <CreditCard size={16} />
                        درخواست‌های برداشت در انتظار
                      </h4>
                      {withdrawalRequests.length === 0 ? (
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
                          درخواست برداشتی یافت نشد
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {withdrawalRequests.map((wr) => (
                            <label
                              key={wr.id}
                              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedWithdrawals.has(wr.id)
                                  ? 'bg-gold-500/20 border-gold-500'
                                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedWithdrawals.has(wr.id)}
                                onChange={() => toggleWithdrawal(wr.id, Number(wr.amount), wr.remaining_amount)}
                                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500 focus:ring-gold-500 focus:ring-2 cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-white">
                                    {wr.user_info?.first_name && wr.user_info?.last_name
                                      ? `${wr.user_info.first_name} ${wr.user_info.last_name}`
                                      : wr.user_info?.phone_number || '-'
                                    }
                                  </p>
                                  <div className="text-left">
                                    {wr.remaining_amount !== undefined && wr.remaining_amount > 0 && wr.remaining_amount < Number(wr.amount) ? (
                                      <>
                                        <p className="text-sm font-bold text-gold-400">
                                          {toPersianDigits(Number(wr.amount).toLocaleString())} ریال
                                        </p>
                                        <p className="text-xs text-orange-400 mt-1">
                                          باقی‌مانده: {toPersianDigits(Number(wr.remaining_amount).toLocaleString())} ریال
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-sm font-bold text-gold-400">
                                        {toPersianDigits(Number(wr.amount).toLocaleString())} ریال
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {wr.bank_card ? `${wr.bank_card.bank_name} - ${wr.bank_card.card_number.slice(-4)}` : 'کارت ثبت نشده'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* حساب‌های پیش‌فرض */}
                    {depositAccounts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                          <Building2 size={16} />
                          حساب‌های پیش‌فرض
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {depositAccounts.map((account) => (
                            <button
                              key={account.id}
                              onClick={() => addDepositAccount(account)}
                              disabled={remainingAmount <= 0}
                              className="p-4 rounded-xl border border-slate-700 bg-slate-900 hover:border-gold-500 hover:bg-gold-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-right"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-bold text-white">{account.bank_name}</p>
                                <Plus size={16} className="text-gold-400" />
                              </div>
                              <p className="text-xs text-slate-400">{account.card_number.slice(-4)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* افزودن حساب سفارشی */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                          <Plus size={16} />
                          حساب سفارشی
                        </h4>
                        {!showCustomAccountForm && (
                          <button
                            onClick={() => setShowCustomAccountForm(true)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2"
                          >
                            <Plus size={16} />
                            افزودن حساب جدید
                          </button>
                        )}
                      </div>
                      {showCustomAccountForm && (
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              inputMode="text"
                              placeholder="نام بانک"
                              value={customAccount.bank_name}
                              onChange={(e) => setCustomAccount(prev => ({ ...prev, bank_name: e.target.value }))}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
                            />
                            <input
                              type="text"
                              inputMode="text"
                              placeholder="نام صاحب حساب"
                              value={customAccount.owner_name}
                              onChange={(e) => setCustomAccount(prev => ({ ...prev, owner_name: e.target.value }))}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
                            />
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="شماره کارت (16 رقم)"
                                value={toPersianDigits(customAccount.card_number)}
                                onChange={(e) => {
                                  const english = toEnglishDigits(e.target.value);
                                  const cleaned = english.replace(/\D/g, '').slice(0, 16);
                                  setCustomAccount(prev => ({ ...prev, card_number: cleaned }));
                                }}
                                maxLength={16}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors dir-ltr text-right w-full"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">IR</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="شماره شبا (24 رقم)"
                                value={toPersianDigits(customAccount.sheba_number)}
                                onChange={(e) => {
                                  const english = toEnglishDigits(e.target.value);
                                  const cleaned = english.replace(/\D/g, '').slice(0, 24);
                                  setCustomAccount(prev => ({ ...prev, sheba_number: cleaned }));
                                }}
                                maxLength={24}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors dir-ltr text-right w-full"
                              />
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="مبلغ"
                                value={customAccount.amount ? toPersianDigits(customAccount.amount.toLocaleString()) : ''}
                                onChange={(e) => {
                                  const english = toEnglishDigits(e.target.value);
                                  const cleaned = english.replace(/\D/g, '');
                                  const numValue = cleaned ? Number(cleaned) : 0;
                                  setCustomAccount(prev => ({ ...prev, amount: numValue }));
                                }}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors dir-ltr text-right w-full"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">ریال</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={addCustomAccount}
                              className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 rounded-xl text-sm font-bold text-white transition-colors"
                            >
                              افزودن
                            </button>
                            <button
                              onClick={() => {
                                setShowCustomAccountForm(false);
                                setCustomAccount({
                                  bank_name: '',
                                  owner_name: '',
                                  card_number: '',
                                  sheba_number: '',
                                  amount: 0,
                                });
                              }}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white transition-colors"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* لیست حساب‌های تخصیص یافته */}
                    {assignments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          حساب‌های تخصیص یافته
                        </h4>
                        <div className="space-y-2">
                          {assignments.map((assignment, index) => {
                            let accountDisplay = '';
                            if (assignment.account_type === 'WITHDRAWAL' && assignment.withdrawal_request_id) {
                              const wr = withdrawalRequests.find(w => w.id === assignment.withdrawal_request_id);
                              accountDisplay = wr ? `${wr.user_info?.first_name || wr.user_info?.phone_number} - ${wr.bank_card?.card_number.slice(-4) || 'N/A'}` : 'نامشخص';
                            } else if (assignment.account_type === 'DEPOSIT_ACCOUNT' && assignment.deposit_account_id) {
                              const account = depositAccounts.find(a => a.id === assignment.deposit_account_id);
                              accountDisplay = account ? `${account.bank_name} - ${account.card_number.slice(-4)}` : 'نامشخص';
                            } else if (assignment.account_type === 'CUSTOM') {
                              accountDisplay = `${assignment.custom_bank_name} - ${assignment.custom_card_number?.slice(-4) || 'N/A'}`;
                            }
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-900"
                              >
                                <div>
                                  <p className="text-sm font-bold text-white">{accountDisplay}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {assignment.account_type === 'WITHDRAWAL' ? 'درخواست برداشت' :
                                     assignment.account_type === 'DEPOSIT_ACCOUNT' ? 'حساب پیش‌فرض' :
                                     'حساب سفارشی'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="text-sm font-bold text-gold-400">
                                    {toPersianDigits(assignment.amount.toLocaleString())} ریال
                                  </p>
                                  <button
                                    onClick={() => removeAssignment(index)}
                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* نمایش پوشش فیش نسبت به هر تخصیص (وقتی حساب‌ها قبلاً تخصیص شده‌اند) */}
            {request.status === 'PENDING' && request.assignments && request.assignments.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <Calculator size={16} />
                  پوشش فیش‌ها نسبت به تخصیص‌ها
                </h4>
                <div className="space-y-2">
                  {request.assignments.map((assignment) => {
                    const remaining = Number(assignment.remaining_amount ?? assignment.amount);
                    const uploaded = Number(assignment.receipts_total ?? 0);
                    const covered = remaining <= 0;
                    return (
                      <div
                        key={assignment.id}
                        className={`p-4 rounded-xl border ${
                          covered
                            ? 'border-green-500/40 bg-green-500/10'
                            : 'border-yellow-500/30 bg-yellow-500/5'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {assignment.account_display || `حساب #${assignment.id}`}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              تخصیص: {toPersianDigits(Number(assignment.amount).toLocaleString())} ریال
                              {assignment.receipts_count !== undefined && (
                                <> — {toPersianDigits(String(assignment.receipts_count))} فیش</>
                              )}
                            </p>
                          </div>
                          <p className={`text-xs font-bold ${covered ? 'text-green-400' : 'text-yellow-300'}`}>
                            {covered
                              ? 'کامل'
                              : `مانده ${toPersianDigits(remaining.toLocaleString())}`}
                          </p>
                        </div>
                        {uploaded > 0 && !covered && (
                          <p className="text-[11px] text-slate-400 mt-2">
                            آپلود شده: {toPersianDigits(uploaded.toLocaleString())} ریال
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* نمایش assignments موجود (اگر قبلا ثبت شده) */}
            {request.status !== 'PENDING' && request.assignments && request.assignments.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  حساب‌های تخصیص یافته
                </h4>
                <div className="space-y-2">
                  {request.assignments.map((assignment, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-slate-700 bg-slate-900"
                    >
                      <p className="text-sm font-bold text-white">{assignment.account_display || 'نامشخص'}</p>
                      <p className="text-sm font-bold text-gold-400 mt-2">
                        {toPersianDigits(Number(assignment.amount).toLocaleString())} ریال
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* نمایش فیش‌های واریزی */}
            {request.receipts && request.receipts.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  فیش‌های واریزی ({request.receipts.length})
                </h4>
                <div className="space-y-3">
                  {request.receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white mb-1">
                            {receipt.account_assignment_info?.account_display || 'حساب نامشخص'}
                          </p>
                          <div className="space-y-1 text-xs text-slate-400">
                            <p>مبلغ: {toPersianDigits(Number(receipt.amount).toLocaleString())} ریال</p>
                            <p>شماره پیگیری: {toPersianDigits(receipt.tracking_number)}</p>
                            {receipt.deposit_date_jalali && (
                              <p>تاریخ واریز: {toPersianDigits(receipt.deposit_date_jalali)}</p>
                            )}
                            <p className={`font-bold ${
                              receipt.status === 'APPROVED' ? 'text-green-400' :
                              receipt.status === 'REJECTED' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              وضعیت: {
                                receipt.status === 'APPROVED' ? 'تایید شده' :
                                receipt.status === 'REJECTED' ? 'رد شده' :
                                'در انتظار تایید'
                              }
                            </p>
                          </div>
                        </div>
                        {receipt.receipt_image_url && (
                          <div className="ml-4">
                            <img
                              src={receipt.receipt_image_url}
                              alt="فیش واریزی"
                              className="w-24 h-24 object-cover rounded-lg border border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(receipt.receipt_image_url, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                      {receipt.admin_note && (
                        <div className="bg-red-500/10 border border-red-500/30 p-2 rounded-lg">
                          <p className="text-xs text-red-400">یادداشت: {receipt.admin_note}</p>
                        </div>
                      )}
                    </div>
                  ))}
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
            {/* اگر حساب‌ها تخصیص داده نشده‌اند - نمایش فرم تخصیص */}
            {(!request.assignments || request.assignments.length === 0) && (
              <>
                {/* فیلد یادداشت رد (Collapsible) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRejectNote(!showRejectNote)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
                  >
                    <span className="text-xs text-slate-400 flex items-center gap-2">
                      <AlertCircle size={14} />
                      یادداشت رد (اختیاری)
                    </span>
                    {showRejectNote ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </button>
                  {showRejectNote && (
                    <div className="mt-2">
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="در صورت رد درخواست، دلیل را وارد کنید..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                        rows={2}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAssignAccounts}
                    disabled={isAssigning || isLoading || assignments.length === 0 || remainingAmount > 0}
                    className="flex-1 px-4 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs md:text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {isAssigning ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>در حال ثبت...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span className="hidden md:inline">ثبت حساب‌ها و ارسال پیامک</span>
                        <span className="md:hidden">ثبت و ارسال</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isLoading || !rejectNote.trim()}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
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
              </>
            )}

            {/* اگر حساب‌ها تخصیص داده شده‌اند و فیش‌ها آپلود شده‌اند - نمایش دکمه تایید */}
            {canApprove && (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      در حال تایید...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      تایید درخواست و شارژ کیف پول
                    </>
                  )}
                </button>
                <button
                  onClick={handleReject}
                  disabled={isLoading || !rejectNote.trim()}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
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
            )}

            {/* اگر حساب‌ها تخصیص داده شده‌اند اما فیش‌ها هنوز آپلود نشده‌اند */}
            {request.assignments && request.assignments.length > 0 && !canApprove && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  در انتظار تکمیل فیش‌های واریزی توسط کاربر...
                </p>
                <p className="text-xs text-yellow-300 mt-2">
                  {request.receipts && request.receipts.length > 0
                    ? `${toPersianDigits(String(request.receipts.length))} فیش آپلود شده — برای تایید، جمع فیش هر حساب باید مبلغ تخصیص را پوشش دهد`
                    : 'هنوز هیچ فیشی آپلود نشده است'
                  }
                </p>
                {request.assignments?.some(a => Number(a.remaining_amount ?? a.amount) > 0) && (
                  <ul className="mt-2 space-y-1">
                    {request.assignments
                      .filter(a => Number(a.remaining_amount ?? a.amount) > 0)
                      .map(a => (
                        <li key={a.id} className="text-xs text-yellow-200/90">
                          {a.account_display || `حساب #${a.id}`}: مانده {toPersianDigits(Number(a.remaining_amount ?? a.amount).toLocaleString())} ریال
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

