"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, CreditCard, Banknote, 
  Settings, LogOut, Menu, X, ShieldCheck, Phone
} from "lucide-react";
import MobileHeader from "@/components/admin/MobileHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/dashboard/NotificationBell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  // صفحات لاگین و verify را از layout مستثنی می‌کنیم
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/verify";
  
  if (isLoginPage) {
    return <>{children}</>;
  }

  const menuItems = [
    { name: "اتاق فرمان", href: "/admin", icon: LayoutDashboard },
    { name: "مدیریت کاربران", href: "/admin/users", icon: Users },
    { name: "تراکنش‌های مالی", href: "/admin/finance", icon: CreditCard },
    { name: "مانیتورینگ معاملات", href: "/admin/trades", icon: Banknote },
    { name: "تایید شماره موبایل", href: "/admin/mobile-verification", icon: Phone },
    { name: "تنظیمات سیستم", href: "/admin/settings", icon: Settings },
  ];

  // آیتم‌های Bottom Navigation (فقط 5 آیتم اصلی)
  const bottomNavItems = [
    { name: "اتاق فرمان", href: "/admin", icon: LayoutDashboard },
    { name: "کاربران", href: "/admin/users", icon: Users },
    { name: "معاملات", href: "/admin/trades", icon: Banknote },
    { name: "مالی", href: "/admin/finance", icon: CreditCard },
    { name: "تایید موبایل", href: "/admin/mobile-verification", icon: Phone },
  ];

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex">
      
      {/* سایدبار (دسکتاپ + موبایل) */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-slate-950 border-l border-slate-800 transition-transform duration-300
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
           <div className="flex items-center gap-2 font-black text-gold-500 text-xl">
              <ShieldCheck /> پنل مدیریت
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X /></button>
        </div>

        <nav className="p-4 space-y-2">
           {menuItems.map((item) => {
             const isActive = pathname === item.href;
             return (
               <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                 <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-gold-600 text-white shadow-lg shadow-gold-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
                    <item.icon size={20} />
                    <span className="font-bold text-sm">{item.name}</span>
                 </div>
               </Link>
             )
           })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
           <button 
             onClick={logout}
             className="flex items-center gap-2 text-red-400 hover:text-red-300 w-full px-4 py-2 transition-colors text-sm font-bold"
           >
              <LogOut size={18} /> خروج از مدیریت
           </button>
        </div>
      </aside>

      {/* محتوای اصلی */}
      <main className="flex-1 md:pr-64 min-w-0 flex flex-col">
         {/* هدر موبایل */}
         <MobileHeader 
           onMenuClick={() => setIsSidebarOpen(true)}
           onLogoutClick={logout}
         />

         {/* هدر دسکتاپ */}
         <div className="hidden md:flex items-center justify-between h-16 bg-slate-950 border-b border-slate-800 px-8 sticky top-0 z-40">
           <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold text-white">پنل مدیریت</h2>
           </div>
           <div className="flex items-center gap-4">
             <NotificationBell />
           </div>
         </div>

         <div className="p-4 md:p-8 flex-1 overflow-y-auto pb-20 md:pb-8">
            {children}
         </div>
      </main>

      {/* Bottom Navigation Bar - موبایل */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/95 backdrop-blur-lg border-t border-slate-800">
        <div className="grid grid-cols-5 h-16">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <div className={`p-2 rounded-lg transition-all ${
                  isActive 
                    ? "bg-gold-500/20 text-gold-400" 
                    : "text-slate-400"
                }`}>
                  <item.icon size={20} />
                </div>
                <span className={`text-[10px] font-bold ${
                  isActive ? "text-gold-400" : "text-slate-400"
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Overlay موبایل */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"></div>}
      </div>
    </ProtectedRoute>
  );
}
