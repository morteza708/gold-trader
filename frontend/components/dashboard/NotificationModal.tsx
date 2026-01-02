"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, Trash2, Bell, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsAPI, Notification } from "@/lib/api/notifications";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import toast from "react-hot-toast";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
  anchorElement?: HTMLElement | null;
}

export default function NotificationModal({
  isOpen,
  onClose,
  onNotificationRead,
  anchorElement,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // دریافت اعلان‌ها
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsAPI.getNotifications({ limit: 50 });
      setNotifications(data);
    } catch (error: any) {
      toast.error("خطا در دریافت اعلان‌ها");
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // محاسبه موقعیت مودال بر اساس anchor element (فقط در دسکتاپ)
  useEffect(() => {
    if (isOpen && anchorElement && window.innerWidth >= 768) {
      const updatePosition = () => {
        const rect = anchorElement.getBoundingClientRect();
        const modalWidth = 384; // w-96 = 384px
        const maxModalHeight = Math.min(window.innerHeight * 0.8, 600); // حداکثر ارتفاع
        const spacing = 8; // فاصله از زنگوله
        const padding = 16; // padding از لبه‌های صفحه
        
        // محاسبه موقعیت افقی (چپ)
        // مودال باید در سمت راست زنگوله قرار گیرد (در RTL layout)
        // ابتدا سعی می‌کنیم مودال را در سمت راست زنگوله قرار دهیم
        let left = rect.right + spacing;
        
        // اگر مودال از راست صفحه خارج می‌شود
        if (left + modalWidth > window.innerWidth - padding) {
          // مودال را در سمت چپ زنگوله قرار بده
          left = rect.left - modalWidth - spacing;
          // اگر باز هم از چپ خارج می‌شود، مودال را در سمت راست صفحه قرار بده
          if (left < padding) {
            left = window.innerWidth - modalWidth - padding;
          }
        }
        
        // بررسی نهایی: مطمئن شو که مودال در viewport است
        if (left < padding) {
          left = padding;
        }
        if (left + modalWidth > window.innerWidth - padding) {
          left = window.innerWidth - modalWidth - padding;
        }
        
        // محاسبه موقعیت عمودی (پایین)
        let top = rect.bottom + spacing;
        
        // بررسی اینکه آیا مودال از پایین صفحه خارج می‌شود
        const availableSpaceBelow = window.innerHeight - top - padding;
        const availableSpaceAbove = rect.top - padding;
        
        if (availableSpaceBelow < maxModalHeight && availableSpaceBelow < availableSpaceAbove) {
          // اگر فضای پایین کافی نیست و فضای بالا بیشتر است، بالای زنگوله قرار بده
          if (availableSpaceAbove >= maxModalHeight) {
            // اگر فضای بالا کافی است، بالای زنگوله قرار بده
            top = rect.top - maxModalHeight - spacing;
          } else {
            // اگر فضای بالا هم کافی نیست، در بالای صفحه قرار بده
            top = padding;
          }
        }
        
        // اطمینان از اینکه مودال از بالا خارج نمی‌شود
        if (top < padding) {
          top = padding;
        }
        
        // محاسبه max-height بر اساس فضای باقی‌مانده (با در نظر گیری padding)
        const availableHeight = window.innerHeight - top - padding;
        const calculatedMaxHeight = Math.max(200, Math.min(availableHeight, maxModalHeight)); // حداقل 200px
        
        setModalPosition({
          top,
          left,
          maxHeight: calculatedMaxHeight,
        });
      };
      
      updatePosition();
      
      // به‌روزرسانی موقعیت هنگام scroll یا resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setModalPosition(null);
    }
  }, [isOpen, anchorElement]);

  // بارگذاری اعلان‌ها وقتی modal باز می‌شود
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // علامت‌گذاری به عنوان خوانده شده
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      
      // به‌روزرسانی local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );

      // به‌روزرسانی count
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error: any) {
      toast.error("خطا در به‌روزرسانی اعلان");
      console.error("Error marking notification as read:", error);
    }
  };

  // علامت‌گذاری همه به عنوان خوانده شده
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationsAPI.markAllAsRead();
      
      // به‌روزرسانی local state
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );

      toast.success("همه اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند");
      
      // به‌روزرسانی count
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error: any) {
      toast.error("خطا در به‌روزرسانی اعلان‌ها");
      console.error("Error marking all as read:", error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // حذف اعلان
  const handleDelete = async (notificationId: number) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      
      // حذف از local state
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      
      toast.success("اعلان حذف شد");
      
      // به‌روزرسانی count
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error: any) {
      toast.error("خطا در حذف اعلان");
      console.error("Error deleting notification:", error);
    }
  };

  // نمایش آیکون بر اساس نوع اعلان
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "DEPOSIT_APPROVED":
      case "WITHDRAWAL_APPROVED":
      case "WITHDRAWAL_COMPLETED":
      case "ORDER_EXECUTED":
        return "✅";
      case "DEPOSIT_REJECTED":
      case "WITHDRAWAL_REJECTED":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  // نمایش رنگ بر اساس نوع اعلان
  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "DEPOSIT_APPROVED":
      case "WITHDRAWAL_APPROVED":
      case "WITHDRAWAL_COMPLETED":
      case "ORDER_EXECUTED":
        return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
      case "DEPOSIT_REJECTED":
      case "WITHDRAWAL_REJECTED":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - در موبایل کامل، در دسکتاپ شفاف‌تر */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 z-40 ${
              modalPosition
                ? 'bg-black/20 md:bg-black/10' // در دسکتاپ: شفاف‌تر
                : 'bg-black/50' // در موبایل: کامل
            }`}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 flex flex-col ${
              modalPosition
                ? 'absolute w-96' // در دسکتاپ: absolute و زیر زنگوله
                : 'fixed top-4 right-4 left-4 md:left-auto md:w-96 max-h-[80vh]' // در موبایل: fixed و center
            }`}
            style={
              modalPosition
                ? {
                    top: `${modalPosition.top}px`,
                    left: `${modalPosition.left}px`,
                    maxHeight: `${modalPosition.maxHeight}px`,
                  }
                : undefined
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  اعلان‌ها
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={isMarkingAll}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    title="علامت‌گذاری همه به عنوان خوانده شده"
                  >
                    <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                  <BellOff className="w-12 h-12 mb-2 opacity-50" />
                  <p>هیچ اعلانی وجود ندارد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border ${
                        notification.is_read
                          ? "bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-700"
                          : getNotificationColor(notification.type)
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3
                                className={`font-semibold text-sm ${
                                  notification.is_read
                                    ? "text-gray-600 dark:text-gray-400"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {notification.title}
                              </h3>
                              <p
                                className={`text-sm mt-1 ${
                                  notification.is_read
                                    ? "text-gray-500 dark:text-gray-500"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {notification.created_at_jalali}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                  title="علامت‌گذاری به عنوان خوانده شده"
                                >
                                  <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notification.id)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

