import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import ServiceWorkerRegistration from "@/components/PWA/ServiceWorkerRegistration";
import InstallPrompt from "@/components/PWA/InstallPrompt";
import { brand } from "@/lib/brand";

const iranYekan = localFont({
  src: [
    {
      path: "../fonts/IRANYekanXVF.woff2",
      style: "normal",
    },
  ],
  variable: "--font-iran-yekan",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default: brand.name,
  },
  description: brand.tagline,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon1.png", sizes: "96x96", type: "image/png" },
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.name,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: brand.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`
          ${iranYekan.variable}
          font-sans
          antialiased
          bg-gray-50
          text-gray-900
        `}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#333",
              color: "#fff",
              fontFamily: "var(--font-iran-yekan)",
            },
            success: {
              style: { background: "#10B981" },
            },
            error: {
              style: { background: "#EF4444" },
            },
          }}
        />
      </body>
    </html>
  );
}
