"use client";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { toPersianDigits } from "@/lib/utils/numberUtils";

export default function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return <span className="text-xs text-gray-500">...</span>;

  // فرمت ساعت (با ثانیه)
  const timeStr = time.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // فرمت ۲۴ ساعته
  });

  // نام روز هفته
  const dayName = time.toLocaleDateString("fa-IR", { weekday: "long" });

  // تاریخ (۱۴۰۴/۰۹/۱۹)
  const dateStr = time.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="flex items-center justify-center gap-3 text-gold-50 bg-white/10 px-6 py-2 rounded-full border border-white/5 backdrop-blur-md shadow-lg">
      <Clock size={18} className="text-gold-400 animate-pulse" />
      
      {/* ساعت */}
      <span className="text-xl font-black tracking-widest pt-1 dir-ltr" style={{ color: 'var(--color-gold-500)' }}>{toPersianDigits(timeStr)}</span>
      
      <span className="opacity-40 text-sm">|</span>
      
      {/* روز و تاریخ */}
      <div className="flex items-center gap-1 text-sm font-medium pt-0.5">
        <span>{dayName}</span>
        <span className="text-gold-500 dir-ltr" style={{ color: 'var(--color-gray-900)' }}>({toPersianDigits(dateStr)})</span>
      </div>
    </div>
  );
}
