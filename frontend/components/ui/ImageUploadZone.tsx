"use client";

import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IMAGE_FILE_ACCEPT,
  MAX_IMAGE_SIZE_LABEL,
  prepareImageForUpload,
  type ImageUploadPurpose,
} from "@/lib/utils/imageUpload";

export function UploadSuccessCheck({ size = 40 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className="flex items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <motion.div
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.25 }}
      >
        <CheckCircle2 size={Math.round(size * 0.55)} strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  );
}

interface ImageUploadZoneProps {
  purpose: ImageUploadPurpose;
  file: File | null;
  previewUrl?: string | null;
  onFileChange: (file: File | null, previewUrl: string | null) => void;
  onError?: (message: string) => void;
  label?: string;
  emptyHint?: string;
  variant?: "light" | "dark";
  error?: boolean;
  className?: string;
  inputId?: string;
  disabled?: boolean;
}

export default function ImageUploadZone({
  purpose,
  file,
  previewUrl,
  onFileChange,
  onError,
  label,
  emptyHint = "انتخاب تصویر",
  variant = "light",
  error = false,
  className = "",
  inputId,
  disabled = false,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isDark = variant === "dark";
  const hasFile = !!file;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setIsProcessing(true);
    setPreviewFailed(false);
    try {
      const prepared = await prepareImageForUpload(selected, purpose);
      if (!prepared.ok || !prepared.file) {
        onFileChange(null, null);
        onError?.(prepared.message || "فایل نامعتبر است");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const url = URL.createObjectURL(prepared.file);
      onFileChange(prepared.file, url);
    } finally {
      setIsProcessing(false);
    }
  };

  const borderClass = error
    ? isDark
      ? "border-red-500/60"
      : "border-red-300"
    : hasFile
      ? isDark
        ? "border-green-500/50"
        : "border-green-400"
      : isDark
        ? "border-slate-600 hover:border-slate-500"
        : "border-gray-300 hover:border-gold-400";

  const bgClass = isDark ? "bg-slate-900/50" : "bg-white hover:bg-gold-50/20";

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={inputId}
          className={`block text-xs font-bold mb-2 ${isDark ? "text-slate-400" : "text-gray-600"}`}
        >
          {label}
        </label>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        className="hidden"
        disabled={disabled || isProcessing}
        onChange={handleSelect}
      />

      <button
        type="button"
        disabled={disabled || isProcessing}
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded-xl border-2 border-dashed p-5 transition-colors text-center ${borderClass} ${!hasFile ? bgClass : isDark ? "bg-slate-900/80" : "bg-green-50/40"} disabled:opacity-60`}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-2"
            >
              <RefreshCw size={28} className={`animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} />
              <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                در حال پردازش تصویر...
              </span>
            </motion.div>
          ) : hasFile ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-1"
            >
              <UploadSuccessCheck size={44} />
              <div className="space-y-1">
                <p className={`text-sm font-black ${isDark ? "text-green-400" : "text-green-700"}`}>
                  تصویر با موفقیت انتخاب شد
                </p>
                <p className={`text-xs font-mono truncate max-w-[240px] mx-auto ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  {file?.name}
                </p>
              </div>

              {previewUrl && !previewFailed ? (
                <div className="w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-green-200/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="پیش‌نمایش"
                    className="w-full max-h-28 object-contain bg-gray-50"
                    onError={() => setPreviewFailed(true)}
                  />
                </div>
              ) : previewUrl && previewFailed ? (
                <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  پیش‌نمایش در این دستگاه نمایش داده نمی‌شود؛ آپلود مشکلی ندارد.
                </p>
              ) : null}

              <span className={`text-xs font-bold underline-offset-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                برای تغییر تصویر دوباره کلیک کنید
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-2"
            >
              <UploadCloud size={28} className={isDark ? "text-slate-500" : "text-gray-400"} />
              <p className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-gray-700"}`}>{emptyHint}</p>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                حداکثر {MAX_IMAGE_SIZE_LABEL}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
