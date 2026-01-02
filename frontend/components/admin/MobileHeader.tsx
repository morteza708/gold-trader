"use client";

import { LogOut, Menu } from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";

interface MobileHeaderProps {
  onMenuClick: () => void;
  onLogoutClick: () => void;
}

export default function MobileHeader({ onMenuClick, onLogoutClick }: MobileHeaderProps) {
  return (
    <div className="md:hidden h-16 bg-slate-950 border-b border-slate-800 flex items-center px-4 sticky top-0 z-40" dir="ltr">
      {/* سمت چپ: آیکون خروج */}
      <button 
        onClick={onLogoutClick}
        className="text-red-400 hover:text-red-300 transition-colors p-2 shrink-0"
        title="خروج از سیستم"
      >
        <LogOut size={20} />
      </button>
      
      {/* وسط: عنوان */}
      <span className="font-bold text-white flex-1 text-center" dir="rtl">داشبورد مدیریت</span>
      
      {/* سمت راست: Notification و منو */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-white">
          <NotificationBell />
        </div>
        <button onClick={onMenuClick} className="text-white p-2">
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
}

