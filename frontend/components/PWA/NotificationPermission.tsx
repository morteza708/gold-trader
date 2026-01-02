"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";

export default function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("مرورگر شما از اعلان‌ها پشتیبانی نمی‌کند");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("اعلان‌ها فعال شد");
        
        // نمایش یک اعلان تست
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification("گلد تریدر", {
              body: "اعلان‌ها با موفقیت فعال شد",
              icon: "/icons/web-app-manifest-192x192.png",
              badge: "/icons/web-app-manifest-192x192.png",
              tag: "notification-permission",
            });
          });
        }
      } else if (result === "denied") {
        toast.error("اعلان‌ها مسدود شده است. لطفاً از تنظیمات مرورگر آن را فعال کنید");
      } else {
        toast("اعلان‌ها رد شد", { icon: "ℹ️" });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("خطا در درخواست مجوز اعلان");
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Bell className="w-4 h-4" />
        <span>اعلان‌ها فعال است</span>
      </div>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors text-sm font-medium"
    >
      <BellOff className="w-4 h-4" />
      <span>فعال‌سازی اعلان‌ها</span>
    </button>
  );
}

