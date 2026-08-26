"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  COMPRESS_IMAGE_TOOLS,
  MAX_IMAGE_SIZE_LABEL,
  type ImageUploadErrorReason,
} from "@/lib/utils/imageUpload";

interface ImageCompressHelpProps {
  reason?: ImageUploadErrorReason;
  compact?: boolean;
  variant?: "light" | "dark";
}

export default function ImageCompressHelp({
  reason = "general",
  compact = false,
  variant = "light",
}: ImageCompressHelpProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={`mt-3 rounded-2xl border p-4 text-right space-y-3 ${
        isDark
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={18}
          className={`shrink-0 mt-0.5 ${isDark ? "text-amber-400" : "text-amber-600"}`}
        />
        <div className="space-y-1">
          <p className={`text-sm font-bold ${isDark ? "text-amber-200" : "text-amber-900"}`}>
            {reason === "size"
              ? "حجم عکس بیشتر از حد مجاز است"
              : reason === "format"
                ? "فرمت عکس پشتیبانی نمی‌شود"
                : "راهنمای آماده‌سازی تصویر"}
          </p>
          <p className={`text-xs leading-relaxed ${isDark ? "text-amber-200/80" : "text-amber-800/90"}`}>
            صفحه را نبندید. حجم/فرمت را اصلاح کنید و دوباره آپلود کنید.
          </p>
        </div>
      </div>

      {!compact && (
        <ul
          className={`text-xs space-y-1.5 list-disc pr-5 leading-relaxed ${
            isDark ? "text-amber-100/80" : "text-amber-900/90"
          }`}
        >
          <li>
            فرمت‌های مجاز: <strong>JPG، PNG، WebP، HEIC/HEIF (عکس آیفون)</strong>
          </li>
          <li>
            حداکثر حجم: <strong>{MAX_IMAGE_SIZE_LABEL}</strong>
          </li>
          <li>
            در آیفون: Settings → Camera → Formats → گزینه{" "}
            <strong>Most Compatible</strong>
          </li>
        </ul>
      )}

      <div>
        <p className={`text-xs font-bold mb-2 ${isDark ? "text-amber-200" : "text-amber-900"}`}>
          سایت‌های معتبر برای کاهش حجم عکس:
        </p>
        <div className="space-y-2">
          {COMPRESS_IMAGE_TOOLS.map((tool) => (
            <a
              key={tool.url}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                isDark
                  ? "bg-slate-900 border-amber-500/30 hover:border-amber-400"
                  : "bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50"
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {tool.name}
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  {tool.note}
                </p>
              </div>
              <ExternalLink
                size={14}
                className={`shrink-0 ${isDark ? "text-amber-400" : "text-amber-600"}`}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
