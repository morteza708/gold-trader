"use client";

import { useState } from "react";
import {
  XCircle, User, FileText, AlertCircle, RefreshCw,
  CheckCircle2, ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { adminWalletAPI, DepositRequest } from "@/lib/api/auth";

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
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const canApprove =
    request.status === "PENDING" &&
    !!(request.receipts && request.receipts.length > 0) &&
    request.receipts.every((r) => r.status === "PENDING" || r.status === "APPROVED");

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
      toast.error(error.response?.data?.error || "خطا در رد درخواست");
    }
  };

  const handleApprove = async () => {
    try {
      const result = await adminWalletAPI.approveDepositNewFlow(request.id);
      toast.success(result.message || "درخواست با موفقیت تایید شد");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "خطا در تایید درخواست");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-800 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl relative z-60 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h3 className="text-xl font-black text-white">بررسی واریز</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
              <User size={16} />
              اطلاعات کاربر
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">نام</p>
                <p className="text-sm font-bold text-white">
                  {request.user_info?.first_name && request.user_info?.last_name
                    ? `${request.user_info.first_name} ${request.user_info.last_name}`
                    : "-"}
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">موبایل</p>
                <p className="text-sm font-bold text-white dir-ltr text-right">
                  {toPersianDigits(request.user_info?.phone_number || "")}
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

          <div>
            <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
              <FileText size={16} />
              جزئیات واریز
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">کد درخواست</p>
                <p className="text-sm font-bold text-white font-mono dir-ltr">{request.request_code}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">مبلغ</p>
                <p className="text-sm font-bold text-gold-400">
                  {toPersianDigits(Number(request.amount || 0).toLocaleString())} ریال
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">وضعیت</p>
                <span className="inline-block bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-bold">
                  {request.status === "PENDING" ? "در انتظار تأیید" : request.status}
                </span>
              </div>
            </div>
          </div>

          {request.receipts && request.receipts.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-4">فیش واریزی</h4>
              <div className="space-y-3">
                {request.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
                  >
                    <p className="text-sm font-bold text-white">
                      {receipt.account_assignment_info?.account_display || "حساب واریز"}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                      <p>مبلغ: {toPersianDigits(Number(receipt.amount).toLocaleString())} ریال</p>
                      {receipt.tracking_number && (
                        <p className="dir-ltr text-right">پیگیری: {receipt.tracking_number}</p>
                      )}
                      {receipt.deposit_date_jalali && (
                        <p>تاریخ: {toPersianDigits(receipt.deposit_date_jalali)}</p>
                      )}
                    </div>
                    {receipt.receipt_image_url && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(receipt.receipt_image_url!)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300"
                      >
                        <Eye size={14} />
                        مشاهده تصویر فیش
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

        {request.status === "PENDING" && (
          <div className="p-6 border-t border-slate-700 space-y-4 bg-slate-900">
            <div>
              <button
                type="button"
                onClick={() => setShowRejectNote(!showRejectNote)}
                className="w-full flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
              >
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle size={14} />
                  یادداشت رد (در صورت رد درخواست)
                </span>
                {showRejectNote ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showRejectNote && (
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="دلیل رد درخواست..."
                  className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500 resize-none"
                  rows={2}
                />
              )}
            </div>

            <div className="flex gap-3">
              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  تأیید و شارژ کیف پول
                </button>
              )}
              <button
                onClick={handleReject}
                disabled={isLoading || !rejectNote.trim()}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={16} />
                رد درخواست
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="فیش واریزی"
            className="max-w-full max-h-[90vh] rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
