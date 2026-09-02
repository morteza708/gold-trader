"use client";

import { useState } from "react";
import {
  Headphones,
  Phone,
  MessageCircle,
  Send,
  Mail,
  Clock,
  Save,
  RefreshCw,
  Power,
} from "lucide-react";
import toast from "react-hot-toast";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { systemSettingsAPI } from "@/lib/api/auth";
import {
  DEFAULT_SUPPORT_HOURS,
  SupportInfo,
  SupportSettings,
} from "@/lib/api/support";
import SupportHubPanel from "@/components/support/SupportHubPanel";

const DAY_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  sat: "شنبه",
  sun: "یکشنبه",
  mon: "دوشنبه",
  tue: "سه‌شنبه",
  wed: "چهارشنبه",
  thu: "پنجشنبه",
  fri: "جمعه",
};

export function buildSupportSettingsFromApi(data: {
  support_enabled?: boolean;
  support_phone?: string;
  support_phone_secondary?: string;
  support_landline?: string;
  whatsapp_number?: string;
  telegram_username?: string;
  support_email?: string;
  support_hours_enabled?: boolean;
  support_hours?: SupportSettings["support_hours"];
  support_offline_message?: string;
  support_online_message?: string;
  support_show_floating_button?: boolean;
  support_show_on_public_site?: boolean;
  support_preview?: SupportInfo;
}): SupportSettings {
  return {
    support_enabled: data.support_enabled ?? true,
    support_phone: data.support_phone || "",
    support_phone_secondary: data.support_phone_secondary || "",
    support_landline: data.support_landline || "",
    whatsapp_number: data.whatsapp_number || "",
    telegram_username: data.telegram_username || "",
    support_email: data.support_email || "",
    support_hours_enabled: data.support_hours_enabled ?? false,
    support_hours: DAY_ORDER.reduce(
      (acc, day) => ({
        ...acc,
        [day]: {
          ...DEFAULT_SUPPORT_HOURS[day],
          ...(data.support_hours?.[day] || {}),
        },
      }),
      {} as SupportSettings["support_hours"]
    ),
    support_offline_message: data.support_offline_message || "",
    support_online_message: data.support_online_message || "",
    support_show_floating_button: data.support_show_floating_button ?? true,
    support_show_on_public_site: data.support_show_on_public_site ?? true,
    support_preview: data.support_preview,
  };
}

interface SupportSettingsTabProps {
  settings: SupportSettings;
  onChange: (settings: SupportSettings) => void;
}

export default function SupportSettingsTab({ settings, onChange }: SupportSettingsTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<SupportInfo | undefined>(settings.support_preview);

  const updateHours = (
    day: (typeof DAY_ORDER)[number],
    patch: Partial<{ enabled: boolean; start: string; end: string }>
  ) => {
    onChange({
      ...settings,
      support_hours: {
        ...settings.support_hours,
        [day]: { ...settings.support_hours[day], ...patch },
      },
    });
  };

  const handleSave = async () => {
    if (settings.support_enabled) {
      const hasChannel =
        settings.support_phone ||
        settings.support_phone_secondary ||
        settings.support_landline ||
        settings.whatsapp_number ||
        settings.telegram_username ||
        settings.support_email;
      if (!hasChannel) {
        toast.error("حداقل یک کانال تماس (تلفن، واتساپ، تلگرام یا ایمیل) را وارد کنید");
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await systemSettingsAPI.updateSettings({
        support_enabled: settings.support_enabled,
        support_phone: settings.support_phone,
        support_phone_secondary: settings.support_phone_secondary,
        support_landline: settings.support_landline,
        whatsapp_number: settings.whatsapp_number,
        telegram_username: settings.telegram_username,
        support_email: settings.support_email,
        support_hours_enabled: settings.support_hours_enabled,
        support_hours: settings.support_hours,
        support_offline_message: settings.support_offline_message,
        support_online_message: settings.support_online_message,
        support_show_floating_button: settings.support_show_floating_button,
        support_show_on_public_site: settings.support_show_on_public_site,
      });
      const next = buildSupportSettingsFromApi(result.settings);
      onChange(next);
      setPreview(next.support_preview);
      toast.success("تنظیمات پشتیبانی ذخیره شد");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در ذخیره تنظیمات پشتیبانی");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Headphones size={24} />
          مرکز پشتیبانی (Support Hub)
        </h2>
        {preview && (
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
              preview.is_online
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${preview.is_online ? "bg-emerald-400" : "bg-orange-400"}`} />
            پیش‌نمایش: {preview.status_label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Power size={16} />
                فعال بودن پشتیبانی
              </span>
              <input
                type="checkbox"
                checked={settings.support_enabled}
                onChange={(e) => onChange({ ...settings, support_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-300">دکمه شناور در داشبورد کاربر</span>
              <input
                type="checkbox"
                checked={settings.support_show_floating_button}
                onChange={(e) =>
                  onChange({ ...settings, support_show_floating_button: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-300">نمایش در صفحه تماس عمومی</span>
              <input
                type="checkbox"
                checked={settings.support_show_on_public_site}
                onChange={(e) =>
                  onChange({ ...settings, support_show_on_public_site: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500"
              />
            </label>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-4">
            <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
              <Phone size={16} />
              کانال‌های تماس
            </p>
            {[
              { key: "support_phone" as const, label: "موبایل پشتیبانی (اصلی)", icon: Phone },
              { key: "support_phone_secondary" as const, label: "موبایل پشتیبانی (دوم)", icon: Phone },
              { key: "support_landline" as const, label: "تلفن ثابت", icon: Phone },
              { key: "whatsapp_number" as const, label: "واتساپ (خالی = همان موبایل اصلی)", icon: MessageCircle },
              { key: "telegram_username" as const, label: "تلگرام (بدون @)", icon: Send },
              { key: "support_email" as const, label: "ایمیل پشتیبانی", icon: Mail },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <Icon size={12} />
                  {label}
                </label>
                <input
                  type="text"
                  value={settings[key]}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      [key]: key === "support_email" ? e.target.value : toEnglishDigits(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm dir-ltr text-right font-mono focus:outline-none focus:border-gold-500"
                  placeholder={key === "telegram_username" ? "opalbox_support" : "09123456789"}
                />
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Clock size={16} />
                محدودیت ساعات پاسخگویی
              </span>
              <input
                type="checkbox"
                checked={settings.support_hours_enabled}
                onChange={(e) =>
                  onChange({ ...settings, support_hours_enabled: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500"
              />
            </label>

            {settings.support_hours_enabled && (
              <div className="space-y-3">
                {DAY_ORDER.map((day) => {
                  const slot = settings.support_hours[day];
                  return (
                    <div
                      key={day}
                      className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center bg-slate-800/80 p-3 rounded-lg"
                    >
                      <label className="flex items-center gap-2 col-span-1">
                        <input
                          type="checkbox"
                          checked={slot.enabled}
                          onChange={(e) => updateHours(day, { enabled: e.target.checked })}
                          className="rounded border-slate-600 bg-slate-700 text-gold-500"
                        />
                        <span className="text-xs font-bold text-white w-14">{DAY_LABELS[day]}</span>
                      </label>
                      <input
                        type="time"
                        value={slot.start}
                        disabled={!slot.enabled}
                        onChange={(e) => updateHours(day, { start: e.target.value })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white disabled:opacity-40"
                      />
                      <span className="text-center text-slate-500 text-xs">تا</span>
                      <input
                        type="time"
                        value={slot.end}
                        disabled={!slot.enabled}
                        onChange={(e) => updateHours(day, { end: e.target.value })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white disabled:opacity-40"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">پیام داخل ساعت کاری</label>
              <textarea
                value={settings.support_online_message}
                onChange={(e) =>
                  onChange({ ...settings, support_online_message: e.target.value })
                }
                rows={2}
                placeholder="تیم پشتیبانی آماده پاسخگویی به شماست."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">پیام خارج از ساعت کاری</label>
              <textarea
                value={settings.support_offline_message}
                onChange={(e) =>
                  onChange({ ...settings, support_offline_message: e.target.value })
                }
                rows={2}
                placeholder="در حال حاضر خارج از ساعات پاسخگویی هستیم..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save size={16} />
                  ذخیره پشتیبانی
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-sm font-bold text-slate-400 mb-4">پیش‌نمایش کاربر</p>
          {preview ? (
            <SupportHubPanel info={preview} variant="dark" />
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">
              پس از ذخیره، پیش‌نمایش به‌روز می‌شود.
            </p>
          )}
          {preview?.hours_summary?.length ? (
            <p className="text-[11px] text-slate-500 mt-4 leading-5">
              زمان سرور: {toPersianDigits(new Date().toLocaleString("fa-IR"))} — Asia/Tehran
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
