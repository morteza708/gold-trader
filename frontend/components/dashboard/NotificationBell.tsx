"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsAPI, Notification } from "@/lib/api/notifications";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import NotificationModal from "./NotificationModal";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bellRef = useRef<HTMLButtonElement>(null);

  // دریافت تعداد اعلان‌های خوانده نشده
  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // بارگذاری اولیه
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Polling هر 30 ثانیه
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // به‌روزرسانی count وقتی modal بسته می‌شود
  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchUnreadCount(); // به‌روزرسانی count
  };

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setIsModalOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="اعلان‌ها"
      >
        <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        
        {!isLoading && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : toPersianDigits(unreadCount)}
          </motion.span>
        )}
      </button>

      <NotificationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onNotificationRead={fetchUnreadCount}
        anchorElement={bellRef.current}
      />
    </>
  );
}

