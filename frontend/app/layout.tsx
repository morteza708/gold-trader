import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";

// 1. فراخوانی فونت لوکال
const iranYekan = localFont({
  src: [
    {
      path: "../fonts/IRANYekanXVF.woff2", // مسیر نسبت به پوشه app
      style: "normal",
    },
  ],
  variable: "--font-iran-yekan", // نام متغیری که در globals.css استفاده کردیم
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    template: "%s | پلتفرم معاملات طلا",
    default: "پلتفرم معاملات طلا",
  },
  description: "سامانه امن خرید و فروش طلای آب‌شده",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. تنظیم زبان فارسی و جهت راست‌چین
    <html lang="fa" dir="rtl">
      <body
        className={`
          ${iranYekan.variable} /* تزریق متغیر فونت به صفحه */
          font-sans             /* استفاده از فونت (که در CSS به ایران‌یکان وصل کردیم) */
          antialiased           /* بهبود نمایش لبه‌های فونت */
          bg-gray-50            /* رنگ پس‌زمینه کلی سایت (خاکستری خیلی روشن) */
          text-gray-900         /* رنگ متن کلی سایت (تیره) */
        `}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* 2. اضافه کردن کامپوننت نمایش پیام‌ها */}
        <Toaster 
           position="top-center" 
           toastOptions={{
             style: {
               background: '#333',
               color: '#fff',
               fontFamily: 'var(--font-iran-yekan)', // هماهنگی فونت
             },
             success: {
               style: { background: '#10B981' }, // سبز برای موفقیت
             },
             error: {
               style: { background: '#EF4444' }, // قرمز برای خطا
             },
           }} 
        />
      </body>
    </html>
  );
}
