"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  Wallet,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Clock,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { brand } from "@/lib/brand";
import { toPersianDigits } from "@/lib/utils/numberUtils";

/** نسخه را با تغییر محتوا بالا ببرید تا کاربران قبلی یک‌بار راهنمای جدید را ببینند */
const STORAGE_PREFIX = "opalbox_onboarding_seen_v2_user_";
const SESSION_PREFIX = "opalbox_onboarding_session_dismiss_v2_user_";

function seenKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function sessionKey(userId: number | string) {
  return `${SESSION_PREFIX}${userId}`;
}

type Step = {
  id: string;
  icon: LucideIcon;
  iconWrap: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: Sparkles,
    iconWrap: "bg-gold-50 text-gold-600",
    title: "به جمع ما خوش آمدید",
    body: "با چند گام کوتاه، مسیر خرید و فروش طلا در این پلتفرم را می‌شناسید. هر مرحله را با آرامش بخوانید و ادامه دهید.",
  },
  {
    id: "wallet",
    icon: Wallet,
    iconWrap: "bg-blue-50 text-blue-600",
    title: "شارژ کیف پول",
    body: "از بخش کیف پول، مبلغ را واریز و فیش را ثبت کنید. پس از تأیید مدیر، موجودی ریالی شما افزایش می‌یابد.",
  },
  {
    id: "zero-buy",
    icon: Clock,
    iconWrap: "bg-amber-50 text-amber-700",
    title: "خرید حتی با موجودی صفر",
    body: "اگر موجودی کافی ندارید، باز هم می‌توانید خرید ثبت کنید. تا پایان مهلت اعلام‌شده فرصت دارید کیف پول را شارژ و معامله را تسویه کنید.",
  },
  {
    id: "trade",
    icon: TrendingUp,
    iconWrap: "bg-emerald-50 text-emerald-600",
    title: "فروش و برداشت",
    body: "طلای خود را با قیمت زنده بفروشید یا برای برداشت ریالی و دریافت حضوری طلا درخواست بدهید.",
  },
  {
    id: "reygiri",
    icon: FlaskConical,
    iconWrap: "bg-violet-50 text-violet-600",
    title: "استعلام ریگیری",
    body: "با شماره پاکت روی انگ، عیار طلا را از بخش ریگیری استعلام کنید و از نتیجه مطمئن شوید.",
  },
];

interface WelcomeOnboardingModalProps {
  onDismiss?: () => void;
}

export default function WelcomeOnboardingModal({ onDismiss }: WelcomeOnboardingModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    if (user.role === "SUPER_ADMIN" || user.role === "SITE_ADMIN") return;

    try {
      const permanentlySeen = localStorage.getItem(seenKey(user.id)) === "1";
      const dismissedThisSession = sessionStorage.getItem(sessionKey(user.id)) === "1";
      if (!permanentlySeen && !dismissedThisSession) {
        const timer = window.setTimeout(() => {
          setStepIndex(0);
          setIsOpen(true);
        }, 400);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setStepIndex(0);
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
    dismissThisSession();
    setIsOpen(false);
    onDismiss?.();
  };

  const isLast = stepIndex >= STEPS.length - 1;
  const isFirst = stepIndex <= 0;
  const step = STEPS[stepIndex];
  const Icon = step.icon;

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
          <p className="text-slate-400 text-[11px] font-bold mb-1">
            راهنمای شروع · {toPersianDigits(stepIndex + 1)} از {toPersianDigits(STEPS.length)}
          </p>
          <h2 id="onboarding-title" className="text-xl font-black mb-1">
            به {brand.name} خوش آمدید
          </h2>
          <p className="text-slate-300 text-sm">مسیر معامله را در چند گام کوتاه بشناسید</p>

          <div className="flex items-center gap-1.5 mt-5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-6 bg-gold-400"
                    : i < stepIndex
                      ? "w-3 bg-gold-400/50"
                      : "w-3 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          <div
            key={step.id}
            className="min-h-[140px] animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="flex gap-4 items-start">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${step.iconWrap}`}
              >
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-base leading-7">{step.title}</p>
                <p className="text-gray-500 text-sm mt-2 leading-7">{step.body}</p>
              </div>
            </div>
          </div>

          {!isLast ? (
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={isFirst}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1"
              >
                <ArrowRight size={16} />
                قبلی
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                className="flex-[1.4] py-3 rounded-2xl text-sm font-black text-white bg-gold-500 hover:bg-gold-600 transition-colors flex items-center justify-center gap-1"
              >
                بعدی
                <ArrowLeft size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link href="/dashboard/wallet?tab=deposit" onClick={handleCloseForever}>
                  <Button variant="primary" className="w-full justify-center">
                    <Wallet size={16} className="ml-2" />
                    شارژ کیف پول
                  </Button>
                </Link>
                <Link href="/dashboard/reygiri" onClick={handleCloseForever}>
                  <Button
                    variant="outline"
                    className="w-full justify-center border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    <FlaskConical size={16} className="ml-2" />
                    استعلام ریگیری
                  </Button>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowRight size={14} />
                بازگشت به مرحله قبل
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1 mt-3 pt-2 border-t border-gray-50">
            <button
              type="button"
              onClick={handleRemindLater}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
            >
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
