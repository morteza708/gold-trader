"use client";

import {
  Phone,
  MessageCircle,
  Send,
  Mail,
  Clock,
  Headphones,
  ExternalLink,
} from "lucide-react";
import { SupportInfo, SupportChannelType } from "@/lib/api/support";
import { toPersianDigits } from "@/lib/utils/numberUtils";

const CHANNEL_ICONS: Record<SupportChannelType, typeof Phone> = {
  phone: Phone,
  phone_secondary: Phone,
  landline: Phone,
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
};

const CHANNEL_COLORS: Record<SupportChannelType, string> = {
  phone: "bg-emerald-500 hover:bg-emerald-600",
  phone_secondary: "bg-teal-500 hover:bg-teal-600",
  landline: "bg-slate-600 hover:bg-slate-700",
  whatsapp: "bg-green-600 hover:bg-green-700",
  telegram: "bg-sky-500 hover:bg-sky-600",
  email: "bg-indigo-500 hover:bg-indigo-600",
};

interface SupportHubPanelProps {
  info: SupportInfo;
  variant?: "light" | "dark";
  compact?: boolean;
}

export default function SupportHubPanel({
  info,
  variant = "light",
  compact = false,
}: SupportHubPanelProps) {
  const isDark = variant === "dark";
  const canCall = info.is_online || !info.hours_enabled;

  const isCallChannel = (type: SupportChannelType) =>
    type === "phone" || type === "phone_secondary" || type === "landline";

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl p-4 border ${
          info.is_online
            ? isDark
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-emerald-50 border-emerald-200"
            : isDark
              ? "bg-orange-500/10 border-orange-500/30"
              : "bg-orange-50 border-orange-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              info.is_online ? "bg-emerald-500 text-white" : "bg-orange-400 text-white"
            }`}
          >
            <Headphones size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-black text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                پشتیبانی {info.status_label}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  info.is_online
                    ? "bg-emerald-500 text-white"
                    : "bg-orange-400 text-white"
                }`}
              >
                {info.is_online ? "● آنلاین" : "● آفلاین"}
              </span>
            </div>
            <p className={`text-xs mt-2 leading-6 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              {info.message}
            </p>
            {!info.is_online && info.next_open_label && (
              <p className={`text-[11px] mt-2 flex items-center gap-1 ${isDark ? "text-orange-300" : "text-orange-700"}`}>
                <Clock size={12} />
                شروع پاسخگویی بعدی: {toPersianDigits(info.next_open_label)}
              </p>
            )}
          </div>
        </div>
      </div>

      {info.channels.length > 0 ? (
        <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {info.channels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.type];
            const disabled =
              !channel.url || (isCallChannel(channel.type) && !canCall);
            return (
              <a
                key={channel.type}
                href={disabled ? undefined : channel.url || undefined}
                target={channel.type === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  disabled
                    ? isDark
                      ? "bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed"
                      : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                    : isDark
                      ? "bg-slate-800 border-slate-700 hover:border-gold-500/50"
                      : "bg-white border-gray-100 hover:border-gold-300 hover:shadow-md"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    disabled ? "bg-gray-400" : CHANNEL_COLORS[channel.type]
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {channel.label}
                  </p>
                  <p
                    className={`text-sm font-black truncate dir-ltr text-right ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {toPersianDigits(channel.value)}
                  </p>
                </div>
                {!disabled && (
                  <ExternalLink size={16} className={isDark ? "text-slate-500" : "text-gray-400"} />
                )}
              </a>
            );
          })}
        </div>
      ) : (
        <p className={`text-sm text-center py-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          کانال تماسی تنظیم نشده است.
        </p>
      )}

      {info.hours_enabled && info.hours_summary.length > 0 && (
        <div
          className={`rounded-2xl p-4 border ${
            isDark ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-100"
          }`}
        >
          <p className={`text-xs font-bold mb-3 flex items-center gap-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
            <Clock size={14} />
            ساعات پاسخگویی
          </p>
          <div className="space-y-2">
            {info.hours_summary.map((row) => (
              <div key={row.day} className="flex justify-between text-xs">
                <span className={isDark ? "text-slate-400" : "text-gray-500"}>{row.day_label}</span>
                <span
                  className={`font-bold dir-ltr ${
                    row.hours_label === "تعطیل"
                      ? isDark
                        ? "text-orange-400"
                        : "text-orange-600"
                      : isDark
                        ? "text-white"
                        : "text-gray-800"
                  }`}
                >
                  {toPersianDigits(row.hours_label)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
