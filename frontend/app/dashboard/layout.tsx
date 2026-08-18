"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, User, Wallet as WalletIcon, History, Info, FileText, Bell, Menu as MenuIcon, X, Zap, LogOut,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { useTradesStatus } from "@/hooks/useTradesStatus";
import { walletAPI, Wallet } from "@/lib/api/auth";
import NotificationPermission from "@/components/PWA/NotificationPermission";
import NotificationBell from "@/components/dashboard/NotificationBell";
import BrandLogo from "@/components/brand/BrandLogo";

// آواتار پیش‌فرض (آیکون کاربر)
export const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="%23d4af37" offset="0%"/>
          <stop stop-color="%23f2d479" offset="100%"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#g)"/>
      <circle cx="64" cy="50" r="26" fill="#fff" opacity="0.92"/>
      <path d="M25 110c6-22 25-32 39-32s33 10 39 32" fill="#fff" opacity="0.92"/>
    </svg>`
  );

// تعریف آیتم‌های منو
const menuItems = [
  { name: "خانه", href: "/dashboard", icon: Home },
  { name: "معامله هوشمند", href: "/dashboard/trade", icon: Zap }, // آیکون رعد برای معامله سریع
  { name: "معاملات من", href: "/dashboard/history", icon: History },
  { name: "کیف پول", href: "/dashboard/wallet", icon: WalletIcon },
  { name: "پروفایل", href: "/dashboard/profile", icon: User },
  { divider: true }, // خط جداکننده
  { name: "قوانین و مقررات", href: "/dashboard/terms", icon: FileText },
  { name: "درباره ما", href: "/dashboard/about", icon: Info },
];

// کامپوننت نوار وضعیت معاملات
function TradesStatusBar() {
  const { status: tradesStatus, loading } = useTradesStatus(5000);

  if (loading) {
    return null; // یا می‌توانید یک loading state نمایش دهید
  }

  if (tradesStatus?.trades_enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500/20 to-green-600/10 text-green-700 dark:text-green-400 text-center text-xs font-bold py-2.5 border-b border-green-500/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-green-500/5 animate-pulse"></div>
        <div className="relative z-10 flex items-center justify-center gap-2">
          <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
          <span>بازار باز است. معاملات انجام می‌شود.</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-red-500 to-red-600 text-white text-center text-xs font-bold py-3 border-b border-red-600 shadow-lg relative z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
      <div className="relative z-10 flex items-center justify-center gap-2">
        <AlertCircle size={16} className="animate-pulse" />
        <span>معاملات غیرفعال است. در حال حاضر امکان ثبت معامله وجود ندارد. لطفاً بعداً تلاش کنید.</span>
      </div>
    </motion.div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // دریافت موجودی کیف پول
  useEffect(() => {
    walletAPI.getWallet()
      .then(setWallet)
      .catch(() => {
        // خطا را نادیده می‌گیریم
      });
  }, []);

  // کامپوننت آیتم منو (برای جلوگیری از تکرار)
  const MenuItem = ({ item }: { item: any }) => {
    if (item.divider) return <div className="my-4 border-t border-gray-100/50 mx-4"></div>;
    
    const isActive = pathname === item.href;
    return (
      <Link href={item.href}>
        <div className={`
          relative flex items-center gap-3 px-4 py-3 mx-3 rounded-xl transition-all duration-300 group
          ${isActive 
            ? "bg-gold-50 text-gold-700 shadow-sm" // استایل فعال
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900" // استایل غیرفعال
          }
        `}>
          {isActive && (
            <motion.div 
              layoutId="activeTab"
              className="absolute left-0 w-1 h-6 bg-gold-500 rounded-r-full"
            />
          )}
          <item.icon size={20} className={isActive ? "text-gold-600" : "text-gray-400 group-hover:text-gold-500 transition-colors"} />
          
          {/* تغییر اصلی اینجاست: استفاده از font-bold برای حالت فعال */}
          <span className={`text-sm text-gray-500 ${isActive ? "font-black text-gold-600" : "font-black text-gray-500"}`}>
            {item.name}
          </span>
          
        </div>
      </Link>
    );
  };


  return (
    <ProtectedRoute requireProfileCompleted={true}>
      <div className="min-h-screen bg-gray-50/50 flex flex-col md:flex-row font-sans">
      
      {/* --- 1. سایدبار دسکتاپ (ثابت سمت راست) --- */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-l border-gray-200 h-screen sticky top-0 z-30 shadow-sm">
        
        {/* اطلاعات کاربر در بالای سایدبار */}
        <div className="p-6 text-center border-b border-gray-100">
           <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-3 overflow-hidden border-2 border-gold-500 p-1">
              <img 
                src={user?.avatar || DEFAULT_AVATAR}
                alt="User" 
                className="w-full h-full rounded-full object-cover" 
              />
           </div>
           <h3 className="font-bold text-gray-800">
             {user?.first_name && user?.last_name 
               ? `${user.first_name} ${user.last_name}` 
               : user?.phone_number ? toPersianDigits(user.phone_number) : 'کاربر'
             }
           </h3>
           {user?.phone_number && (
             <p className="text-xs text-gray-400 mt-1 dir-ltr">
               {toPersianDigits(user.phone_number)}
             </p>
           )}
           
           <div className="mt-4 flex justify-center gap-2">
              <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded-full border border-green-100">احراز شده</span>
              {user?.customer_profile?.account_code && (
                <span className="bg-gold-50 text-gold-600 text-[10px] px-2 py-0.5 rounded-full border border-gold-100">
                  {toPersianDigits(user.customer_profile.account_code)}
                </span>
              )}
           </div>
        </div>

        {/* لیست منو */}
        <div className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item, idx) => (
            <MenuItem key={idx} item={item} />
          ))}
        </div>

        {/* دکمه خروج */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            خروج از حساب
          </button>
        </div>
      </aside>

      {/* --- 2. بدنه اصلی صفحه --- */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0"> {/* پدینگ پایین برای موبایل نویگیشن */}
        
        {/* هدر (دسکتاپ و موبایل) */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 px-4 h-16 flex items-center justify-between">
          
          {/* سمت راست: منوی همبرگری (موبایل) یا خوش‌آمدگویی (دسکتاپ) */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <MenuIcon size={24} />
            </button>
            <h2 className="hidden md:block text-lg font-bold text-gray-700">
              سلام {user?.first_name || 'کاربر'} عزیز، <span className="text-gray-400 font-normal text-sm">به پنل کاربری خوش آمدید 👋</span>
            </h2>
          </div>

          {/* وسط: علامت برند */}
          <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
            <Link href="/dashboard" className="flex items-center" aria-label="داشبورد">
              <BrandLogo variant="mark" size={32} showName={false} priority />
            </Link>
          </div>

          {/* سمت چپ: نوتیفیکیشن و موجودی سریع */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* موجودی سریع (فقط دسکتاپ) */}
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[10px] text-gray-400">موجودی کیف پول</span>
              <span className="text-sm font-bold text-gray-800">
                {wallet ? toPersianDigits(Number(wallet.gold_balance || 0).toFixed(3)) : '۰.۰۰۰'} 
                <span className="text-gold-500 text-xs"> گرم</span>
              </span>
            </div>

            <button className="relative p-2 text-gray-500 hover:text-gold-600 hover:bg-gold-50 rounded-xl transition-colors">
               <WalletIcon size={20} />
            </button>
            
            <NotificationBell />
          </div>
        </header>
        {/* --- نوار وضعیت بازار --- */}
        <TradesStatusBar />

        {/* محتوای متغیر صفحات */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {children}
        </div>

      </main>

      {/* --- 3. سایدبار موبایل (Off-canvas) --- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay تاریک */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
            />
            {/* پنل کشویی */}
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-50 md:hidden shadow-2xl flex flex-col"
            >
              {/* هدر سایدبار موبایل */}
              <div className="p-4 flex items-center justify-between border-b border-gray-100">
                <span className="font-bold text-gray-800">منوی کاربری</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-400 hover:text-red-500"><X size={24} /></button>
              </div>

              {/* پروفایل موبایل */}
              <div className="p-6 text-center bg-gray-50 mx-4 mt-4 rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-full mx-auto mb-2 overflow-hidden border border-gold-300 p-0.5">
                      <img 
                        src={user?.avatar || DEFAULT_AVATAR}
                        alt="User" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : 'کاربر'
                    }
                  </h3>
                  {user?.phone_number && (
                    <p className="text-xs text-gray-400 mt-0.5 dir-ltr">
                      {toPersianDigits(user.phone_number)}
                    </p>
                  )}
                  {user?.customer_profile?.account_code && (
                    <p className="text-xs text-gold-600 font-bold mt-1">
                      کد حساب: {toPersianDigits(user.customer_profile.account_code)}
                    </p>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                {menuItems.map((item, idx) => (
                  <MenuItem key={idx} item={item} />
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- 4. منوی اپلیکیشنی پایین (Mobile Bottom Navigation) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 md:hidden pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          
          {[
             { name: "خانه", href: "/dashboard", icon: Home },
             { name: "معاملات", href: "/dashboard/history", icon: History },
             { name: "معامله هوشمند", href: "/dashboard/trade", icon: Zap, isFab: true }, // دکمه ویژه وسط
             { name: "کیف پول", href: "/dashboard/wallet", icon: WalletIcon },
             { name: "پروفایل", href: "/dashboard/profile", icon: User },
          ].map((item, idx) => {
             const isActive = pathname === item.href;
             
             // دکمه وسط (FAB) برجسته
             if (item.isFab) {
                return (
                  <Link key={idx} href={item.href} className="relative -top-5">
                    <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center text-gold-500 shadow-lg shadow-gray-900/30 border-4 border-gray-50 transform active:scale-95 transition-transform">
                      <item.icon size={24} fill="currentColor" />
                    </div>
                  </Link>
                );
             }

             return (
                <Link key={idx} href={item.href} className="flex flex-col items-center justify-center w-full h-full gap-1">
                   <item.icon 
                      size={20} 
                      className={isActive ? "text-gold-600" : "text-gray-400"} 
                      // پر شدن آیکون وقتی اکتیو است (برای زیبایی)
                      fill={isActive ? "currentColor" : "none"} 
                      fillOpacity={0.2}
                   />
                   <span className={`text-[10px] font-medium ${isActive ? "text-gold-600" : "text-gray-400"}`}>
                     {item.name}
                   </span>
                </Link>
             );
          })}

        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
