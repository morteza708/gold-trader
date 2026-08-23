"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Wallet, TrendingUp, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_PREFIX = "opalbox_onboarding_seen_v1_user_";
const SESSION_PREFIX = "opalbox_onboarding_session_dismiss_user_";

function seenKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function sessionKey(userId: number | string) {
  return `${SESSION_PREFIX}${userId}`;
}

interface WelcomeOnboardingModalProps {
  onDismiss?: () => void;
}

export default function WelcomeOnboardingModal({ onDismiss }: WelcomeOnboardingModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // فقط برای مشتری؛ ادمین نیازی به این راهنما ندارد
    if (user.role === "SUPER_ADMIN" || user.role === "SITE_ADMIN") return;

    try {
      const permanentlySeen = localStorage.getItem(seenKey(user.id)) === "1";
      const dismissedThisSession = sessionStorage.getItem(sessionKey(user.id)) === "1";
      if (!permanentlySeen && !dismissedThisSession) {
        // کمی تأخیر تا داشبورد رندر شود و حس «اولین ورود» بهتر باشد
        const timer = window.setTimeout(() => setIsOpen(true), 400);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // اگر storage در دسترس نبود، یک‌بار در این نشست نشان بده
      setIsOpen(true);
    }
  }, [user?.id, user?.role]);

  const markSeenForever = () => {
    if (!user?.id) return;
    try {
      localStorage.setItem(seenKey(user.id), "1");
    } catch {
      // ignore
    }
  };

  const dismissThisSession = () => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem(sessionKey(user.id), "1");
    } catch {
      // ignore
    }
  };

  const handleCloseForever = () => {
    markSeenForever();
    setIsOpen(false);
    onDismiss?.();
  };

  const handleRemindLater = () => {
    // فقط این نشست؛ دفعه بعد (مثلاً ورود بعدی) دوباره نشان داده می‌شود
    dismissThisSession();
    setIsOpen(false);
    onDismiss?.();
  };

  if (!mounted || !isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300"
      >
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white relative">
          <button
            type="button"
            onClick={handleRemindLater}
            className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
          <h2 id="onboarding-title" className="text-xl font-black mb-1">
            به OpalBox خوش آمدید!
          </h2>
          <p className="text-slate-300 text-sm">برای شروع معامله، این مراحل را دنبال کنید</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">۱. شارژ کیف پول</p>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                از بخش کیف پول، درخواست واریز ثبت کنید. پس از تایید مدیر، موجودی ریالی شما افزایش می‌یابد.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">۲. خرید و فروش طلا</p>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                با موجودی ریالی می‌توانید طلا بخرید یا طلای خود را بفروشید. قیمت‌ها به‌صورت زنده به‌روز می‌شوند.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link href="/dashboard/wallet?tab=deposit" onClick={handleCloseForever}>
              <Button variant="primary" className="w-full justify-center">
                <Wallet size={16} className="ml-2" />
                رفتن به کیف پول
              </Button>
            </Link>
            <button
              type="button"
              onClick={handleRemindLater}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft size={14} />
              بعداً یادآوری کن
            </button>
            <button
              type="button"
              onClick={handleCloseForever}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
            >
              دیگر نشان نده
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
