"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { brand } from "@/lib/brand";
import {
  ensurePushSubscription,
  isPushSupported,
  unsubscribeFromPush,
} from "@/lib/pwa/push";

type Props = {
  /** فقط آیکون برای هدر (بدون متن پهن) */
  compact?: boolean;
  className?: string;
};

export default function NotificationPermission({ compact = false, className = "" }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [busy, setBusy] = useState(false);
  const [pushReady, setPushReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission === "granted") {
      try {
        const result = await ensurePushSubscription();
        setPushReady(result === "subscribed");
      } catch {
        setPushReady(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    if (!isPushSupported()) {
      toast.error("مرورگر شما از اعلان‌ها پشتیبانی نمی‌کند");
      return;
    }

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error(
          result === "denied"
            ? "اعلان‌ها مسدود است؛ از تنظیمات مرورگر فعال کنید"
            : "اجازه اعلان داده نشد"
        );
        return;
      }

      const sub = await ensurePushSubscription();
      setPushReady(sub === "subscribed");

      if (sub === "subscribed") {
        toast.success("اعلان‌های دستگاه فعال شد");
      } else if (sub === "skipped") {
        toast.success("اجازه اعلان داده شد");
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(brand.name, {
        body: "اعلان‌ها با موفقیت فعال شد",
        icon: "/web-app-manifest-192x192.png",
        badge: "/web-app-manifest-192x192.png",
        tag: "notification-permission",
      });
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("خطا در فعال‌سازی اعلان");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setPushReady(false);
      toast.success("اعلان این دستگاه غیرفعال شد");
    } catch {
      toast.error("خطا در غیرفعال‌سازی");
    } finally {
      setBusy(false);
    }
  };

  if (permission === "unsupported") {
    return null;
  }

  if (permission === "granted") {
    if (compact) {
      return (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className={`p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50 ${className}`}
          title="اعلان‌ها فعال است — برای قطع کلیک کنید"
          aria-label="قطع اعلان دستگاه"
        >
          {busy ? <RefreshCw size={20} className="animate-spin" /> : <Bell size={20} />}
        </button>
      );
    }

    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-sm text-emerald-800 font-bold">
          <Bell className="w-4 h-4 shrink-0" />
          <span>
            {pushReady
              ? "اعلان‌های این دستگاه فعال است"
              : "اجازه اعلان داده شده — در حال آماده‌سازی"}
          </span>
        </div>
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="text-xs font-bold text-emerald-700/80 hover:text-emerald-900 disabled:opacity-50"
        >
          قطع
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className={`p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50 ${className}`}
        title="فعال‌سازی اعلان‌ها"
        aria-label="فعال‌سازی اعلان‌ها"
      >
        {busy ? <RefreshCw size={20} className="animate-spin" /> : <BellOff size={20} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-white rounded-2xl hover:bg-gold-600 transition-colors text-sm font-bold disabled:opacity-50 ${className}`}
    >
      {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
      <span>فعال‌سازی اعلان‌های دستگاه</span>
    </button>
  );
}
