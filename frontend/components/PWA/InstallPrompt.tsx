"use client";

import { useState, useEffect } from "react";
import { Download, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // تشخیص مرورگر و پلتفرم
    const userAgent = navigator.userAgent.toLowerCase();
    const isFirefoxBrowser = userAgent.includes('firefox');
    const isChromeBrowser = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isEdgeBrowser = userAgent.includes('edg');
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    setIsFirefox(isFirefoxBrowser);
    setIsChrome(isChromeBrowser || isEdgeBrowser);
    setIsSafari(isSafariBrowser);
    setIsIOS(isIOSDevice);

    // بررسی اینکه آیا اپ نصب شده است
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // بررسی در iOS
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // بررسی اینکه آیا کاربر قبلاً prompt را dismiss کرده
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // اگر کمتر از 7 روز گذشته باشد، prompt را نشان نده
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // برای Chrome/Edge: گوش دادن به beforeinstallprompt event
    if (isChromeBrowser || isEdgeBrowser) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        console.log("beforeinstallprompt event received");
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      // بررسی دستی برای Chrome (اگر event فوراً trigger نشد)
      // Chrome ممکن است event را با تاخیر trigger کند
      const checkInstallability = async () => {
        try {
          // بررسی اینکه آیا Service Worker فعال است
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            console.log("Service Worker is ready:", registration);
          }

          // بررسی manifest
          const manifestLink = document.querySelector('link[rel="manifest"]');
          if (manifestLink) {
            console.log("Manifest link found:", manifestLink);
          }

          // برای Chrome، اگر بعد از 5 ثانیه event نیامد، بررسی کنیم
          setTimeout(() => {
            if (!deferredPrompt && !isInstalled) {
              console.log("Chrome: beforeinstallprompt event not received after 5 seconds");
              console.log("Chrome: Checking PWA installability requirements...");
              
              // بررسی شرایط PWA
              const checks = {
                hasManifest: !!document.querySelector('link[rel="manifest"]'),
                hasServiceWorker: 'serviceWorker' in navigator,
                isHTTPS: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
              };
              
              console.log("PWA Requirements check:", checks);
              
              // اگر همه شرایط برقرار است اما event نیامد، ممکن است کاربر قبلاً dismiss کرده باشد
              if (checks.hasManifest && checks.hasServiceWorker && checks.isHTTPS) {
                console.log("Chrome: All PWA requirements met, but beforeinstallprompt not fired");
                console.log("Chrome: This might mean the user already dismissed the prompt or the app is already installable");
              }
            }
          }, 5000);
        } catch (error) {
          console.error("Error checking installability:", error);
        }
      };

      checkInstallability();

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    // برای Firefox: نمایش prompt دستی (Firefox از beforeinstallprompt پشتیبانی نمی‌کند)
    if (isFirefoxBrowser) {
      // بررسی اینکه آیا Service Worker فعال است
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then(() => {
            console.log("Firefox: Service Worker ready, showing install prompt");
            // در Firefox، می‌توانیم prompt را نشان دهیم
            // اما باید دستورالعمل نصب را نمایش دهیم
            setTimeout(() => {
              setShowPrompt(true);
            }, 2000); // 2 ثانیه تاخیر برای UX بهتر
          })
          .catch((error) => {
            console.error("Firefox: Service Worker not ready:", error);
          });
      } else {
        console.log("Firefox: Service Worker not supported");
      }
    }

    // برای Safari/iOS: نمایش prompt دستی (Safari از beforeinstallprompt پشتیبانی نمی‌کند)
    if (isSafariBrowser || isIOSDevice) {
      console.log("Safari/iOS detected, showing install prompt");
      // در Safari/iOS، کاربر باید از دکمه "Add to Home Screen" استفاده کند
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000); // 2 ثانیه تاخیر برای UX بهتر
    }
  }, [deferredPrompt, isInstalled]);

  const handleInstall = async () => {
    // برای Safari/iOS: نمایش دستورالعمل نصب
    if ((isSafari || isIOS) && !deferredPrompt) {
      toast(
        <div className="text-sm">
          <p className="font-bold mb-1">نحوه نصب در Safari/iOS:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>روی دکمه Share (اشتراک‌گذاری) در پایین صفحه کلیک کنید</li>
            <li>گزینه "Add to Home Screen" (افزودن به صفحه اصلی) را انتخاب کنید</li>
            <li>روی "Add" (افزودن) کلیک کنید</li>
          </ol>
        </div>,
        { duration: 10000, icon: "ℹ️" }
      );
      handleDismiss();
      return;
    }

    // برای Firefox: نمایش دستورالعمل نصب
    if (isFirefox && !deferredPrompt) {
      toast(
        <div className="text-sm">
          <p className="font-bold mb-1">نحوه نصب در Firefox:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>روی منوی Firefox (☰) کلیک کنید</li>
            <li>گزینه "نصب" یا "Install" را انتخاب کنید</li>
            <li>یا از آیکون نصب در نوار آدرس استفاده کنید</li>
          </ol>
        </div>,
        { duration: 8000, icon: "ℹ️" }
      );
      handleDismiss();
      return;
    }

    // برای Chrome/Edge: استفاده از beforeinstallprompt
    if (!deferredPrompt) {
      console.warn("deferredPrompt is null");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        toast.success("نصب اپلیکیشن شروع شد");
        setIsInstalled(true);
      } else {
        toast("نصب لغو شد", { icon: "ℹ️" });
        // ذخیره زمان dismiss برای 7 روز
        localStorage.setItem("pwa-install-dismissed", Date.now().toString());
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error("Error installing PWA:", error);
      toast.error("خطا در نصب اپلیکیشن");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // برای Firefox/Safari/iOS: نمایش prompt حتی بدون deferredPrompt
  // برای Chrome/Edge: فقط اگر deferredPrompt وجود داشته باشد
  if (isInstalled || !showPrompt) {
    return null;
  }

  if (!isFirefox && !isSafari && !isIOS && !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
      >
        <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gold-400/20 to-gold-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gold-300/10 to-transparent rounded-full blur-2xl"></div>
          
          <div className="relative p-5">
            <div className="flex items-start gap-4">
              {/* App Icon with better design */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-gold-500/30 ring-2 ring-gold-400/20">
                  G
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold-400 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-black text-gray-900 text-base mb-1 flex items-center gap-2">
                      نصب اپلیکیشن
                      <span className="text-xs bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full font-bold">
                        جدید
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {isSafari || isIOS ? (
                        <>
                          برای نصب اپلیکیشن <span className="font-bold text-gold-600">گلد تریدر</span> در Safari/iOS، از دکمه Share (اشتراک‌گذاری) و سپس "Add to Home Screen" استفاده کنید.
                        </>
                      ) : isFirefox ? (
                        <>
                          برای نصب اپلیکیشن <span className="font-bold text-gold-600">گلد تریدر</span> در Firefox، از منوی مرورگر (☰) گزینه "نصب" را انتخاب کنید.
                        </>
                      ) : (
                        <>
                          برای دسترسی سریع‌تر و تجربه بهتر، اپلیکیشن <span className="font-bold text-gold-600">گلد تریدر</span> را نصب کنید
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all shrink-0"
                    aria-label="بستن"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleInstall}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl hover:from-gold-600 hover:to-gold-700 transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-gold-500/30 hover:shadow-gold-500/40 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    {(isSafari || isIOS || isFirefox) ? "راهنمای نصب" : "نصب اپلیکیشن"}
                  </button>
                </div>
                
                {/* Benefits list */}
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gold-500 rounded-full"></span>
                      دسترسی سریع
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gold-500 rounded-full"></span>
                      بدون نیاز به مرورگر
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

