import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import ServiceWorkerRegistration from "@/components/PWA/ServiceWorkerRegistration";
import InstallPrompt from "@/components/PWA/InstallPrompt";

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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/android/android-launchericon-48-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/android/android-launchericon-96-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/android/android-launchericon-192-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/android/android-launchericon-512-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/ios/180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/ios/152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/ios/120.png", sizes: "120x120", type: "image/png" },
      { url: "/icons/ios/76.png", sizes: "76x76", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "گلد تریدر",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#D4AF37",
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
        {/* Service Worker Registration */}
        <ServiceWorkerRegistration />
        {/* PWA Install Prompt */}
        <InstallPrompt />
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
