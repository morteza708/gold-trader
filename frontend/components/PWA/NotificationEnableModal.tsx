"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { brand } from "@/lib/brand";
import {
  ensurePushSubscription,
  getLocalPushSubscription,
  isPushSupported,
} from "@/lib/pwa/push";

const DISMISS_KEY = "notification-enable-dismissed";
/** اگر کاربر «بعداً» زد، تا چند روز دوباره نشان نده */
const DISMISS_DAYS = 3;

type Props = {
  /** تأخیر اولیه تا با InstallPrompt تداخل کمتری داشته باشد */
  delayMs?: number;
};

function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (!Number.isFinite(ts)) return false;
  const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return days < DISMISS_DAYS;
}

export default function NotificationEnableModal({ delayMs = 1800 }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  const evaluate = useCallback(async () => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      setOpen(false);
      return;
    }

    const perm = Notification.permission;
    setPermission(perm);

    if (perm === "granted") {
      try {
        const sub = await getLocalPushSubscription();
        if (sub) {
          setOpen(false);
          return;
        }
      } catch {
        /* fall through — نشان بده تا دوباره subscribe شود */
      }
    }

    if (wasRecentlyDismissed()) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void evaluate();
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [delayMs, evaluate]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setOpen(false);
  };

  const enable = async () => {
    if (!isPushSupported()) {
      toast.error("مرورگر شما از اعلان‌ها پشتیبانی نمی‌کند");
      return;
    }

    setBusy(true);
    try {
      let result = Notification.permission;
      if (result !== "granted") {
        result = await Notification.requestPermission();
      }
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
      if (sub === "subscribed") {
        toast.success("اعلان‌های دستگاه فعال شد");
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(brand.name, {
            body: "اعلان‌ها با موفقیت فعال شد",
            icon: "/web-app-manifest-192x192.png",
            badge: "/web-app-manifest-192x192.png",
            tag: "notification-permission",
          });
        } catch {
          /* تست نوتیف اختیاری */
        }
        localStorage.removeItem(DISMISS_KEY);
        setOpen(false);
      } else if (sub === "denied") {
        toast.error("اعلان‌ها مسدود است؛ از تنظیمات مرورگر فعال کنید");
      } else {
        toast.success("اجازه اعلان داده شد");
        setOpen(false);
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("خطا در فعال‌سازی اعلان");
    } finally {
      setBusy(false);
    }
  };

  if (permission === "unsupported") return null;

  const isDenied = permission === "denied";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="بستن"
            onClick={dismiss}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-enable-title"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-l from-gold-500 to-gold-400" />

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
                    {isDenied ? <BellOff className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2
                      id="notif-enable-title"
                      className="text-lg font-black text-gray-900"
                    >
                      فعال‌سازی اعلان‌ها
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">{brand.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="بستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                {isDenied ? (
                  <>
                    اعلان‌های مرورگر برای این سایت مسدود شده است. برای دریافت هشدار معاملات،
                    واریز و برداشت، از تنظیمات مرورگر اجازه اعلان را فعال کنید.
                  </>
                ) : (
                  <>
                    با فعال‌کردن اعلان‌ها، از وضعیت معاملات، واریز، برداشت و پیام‌های مهم
                    حتی وقتی داخل سایت نیستید مطلع می‌شوید.
                  </>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                {!isDenied && (
                  <button
                    type="button"
                    onClick={enable}
                    disabled={busy}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-lg shadow-gold-500/25 disabled:opacity-50 transition-colors"
                  >
                    {busy ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    فعال کردن اعلان‌ها
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismiss}
                  disabled={busy}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-gray-300 disabled:opacity-50 transition-colors"
                >
                  بعداً
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
