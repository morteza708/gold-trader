"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Phone,
  FileText,
  Headphones,
  Globe,
  Landmark,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toPersianDigits } from "@/lib/utils/numberUtils";

const STORAGE_PREFIX = "opalbox_admin_setup_seen_v1_user_";
const SESSION_PREFIX = "opalbox_admin_setup_session_dismiss_v1_user_";

function seenKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function sessionKey(userId: number | string) {
  return `${SESSION_PREFIX}${userId}`;
}

type SetupStep = {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const STEPS: SetupStep[] = [
  {
    id: "intro",
    icon: ShieldCheck,
    title: "راه‌اندازی اولیه اتاق فرمان",
    body: "قبل از باز شدن معاملات برای کاربران، این موارد را در تنظیمات تکمیل کنید. هر مرحله کوتاه است و می‌توانید مستقیم به همان بخش بروید.",
  },
  {
    id: "banks",
    icon: CreditCard,
    title: "تعریف کارت‌های بانکی",
    body: "حساب‌هایی که کاربر برای شارژ کیف پول به آن‌ها واریز می‌کند را ثبت کنید. بدون این حساب‌ها، واریز کاربر ممکن نیست.",
    ctaLabel: "رفتن به تعریف کارت",
    ctaHref: "/adminpanel/settings?tab=financial",
  },
  {
    id: "sms",
    icon: Phone,
    title: "شماره موبایل پیامک",
    body: "شماره‌هایی که اعلان واریز، برداشت و رخدادهای مهم را با پیامک دریافت می‌کنند در بخش عمومی ثبت کنید.",
    ctaLabel: "رفتن به تنظیمات عمومی",
    ctaHref: "/adminpanel/settings?tab=general",
  },
  {
    id: "invoice",
    icon: FileText,
    title: "مشخصات فاکتور",
    body: "نام تجاری، شناسه ملی و آدرس روی فاکتور را کامل کنید تا فاکتورهای صادرشده رسمی و درست باشند.",
    ctaLabel: "رفتن به مشخصات فاکتور",
    ctaHref: "/adminpanel/settings?tab=invoice",
  },
  {
    id: "support",
    icon: Headphones,
    title: "مرکز پشتیبانی",
    body: "تلفن، واتساپ، تلگرام و در صورت نیاز بله یا روبیکا را تنظیم کنید تا دکمه پشتیبانی در پنل کاربر فعال شود.",
    ctaLabel: "رفتن به پشتیبانی",
    ctaHref: "/adminpanel/settings?tab=support",
  },
  {
    id: "pages",
    icon: Globe,
    title: "صفحات سایت",
    body: "متن «درباره ما» و «تماس با ما» را تکمیل و منتشر کنید تا صفحه عمومی سایت آماده باشد.",
    ctaLabel: "رفتن به صفحات سایت",
    ctaHref: "/adminpanel/pages",
  },
  {
    id: "treasury",
    icon: Landmark,
    title: "ورود طلا به خزانه",
    body: "برای باز شدن امن معاملات، موجودی فیزیکی طلای شرکت را در بخش خزانه ثبت کنید. بدون ثبت ورودی طلا، پوشش خزانه کامل نمی‌شود و ریسک معامله بالا می‌رود.",
    ctaLabel: "رفتن به ورود و خروج خزانه",
    ctaHref: "/adminpanel/treasury?tab=vault",
  },
];

interface AdminSetupOnboardingModalProps {
  onDismiss?: () => void;
}

export default function AdminSetupOnboardingModal({
  onDismiss,
}: AdminSetupOnboardingModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (user.role !== "SUPER_ADMIN" && user.role !== "SITE_ADMIN") return;

    try {
      const permanentlySeen = localStorage.getItem(seenKey(user.id)) === "1";
      const dismissedThisSession = sessionStorage.getItem(sessionKey(user.id)) === "1";
      if (!permanentlySeen && !dismissedThisSession) {
        const timer = window.setTimeout(() => {
          setStepIndex(0);
          setIsOpen(true);
        }, 450);
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

  const goToHref = () => {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-setup-title"
        className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-300"
      >
        <div className="bg-slate-950 p-6 text-white relative border-b border-slate-800">
          <button
            type="button"
            onClick={handleRemindLater}
            className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-400"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
          <p className="text-slate-500 text-[11px] font-bold mb-1">
            چک‌لیست راه‌اندازی · {toPersianDigits(stepIndex + 1)} از{" "}
            {toPersianDigits(STEPS.length)}
          </p>
          <h2 id="admin-setup-title" className="text-xl font-black mb-1 text-gold-400">
            راه‌اندازی اولیه
          </h2>
          <p className="text-slate-400 text-sm">موارد ضروری قبل از شروع معاملات کاربران</p>

          <div className="flex items-center gap-1.5 mt-5 flex-wrap" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-5 bg-gold-400"
                    : i < stepIndex
                      ? "w-2.5 bg-gold-400/40"
                      : "w-2.5 bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          <div
            key={step.id}
            className="min-h-[150px] animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-2xl bg-gold-500/15 text-gold-400 flex items-center justify-center shrink-0">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="font-black text-white text-base leading-7">{step.title}</p>
                <p className="text-slate-400 text-sm mt-2 leading-7">{step.body}</p>
              </div>
            </div>

            {step.ctaHref && step.ctaLabel && (
              <Link
                href={step.ctaHref}
                onClick={goToHref}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-black transition-colors"
              >
                {step.ctaLabel}
                <ArrowLeft size={16} />
              </Link>
            )}
          </div>

          {!isLast ? (
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={isFirst}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1"
              >
                <ArrowRight size={16} />
                قبلی
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                className="flex-[1.4] py-3 rounded-2xl text-sm font-black text-slate-900 bg-white hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
              >
                بعدی
                <ArrowLeft size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={handleCloseForever}
                className="w-full py-3.5 rounded-2xl text-sm font-black text-white bg-gold-500 hover:bg-gold-600 transition-colors"
              >
                متوجه شدم، شروع می‌کنم
              </button>
              {STEPS[stepIndex]?.ctaHref && (
                <Link
                  href={STEPS[stepIndex].ctaHref!}
                  onClick={goToHref}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-center text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 transition-colors"
                >
                  ثبت ورود طلا در خزانه
                </Link>
              )}
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowRight size={14} />
                بازگشت به مرحله قبل
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleRemindLater}
              className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
            >
              بعداً یادآوری کن
            </button>
            <button
              type="button"
              onClick={handleCloseForever}
              className="w-full text-xs text-slate-600 hover:text-slate-400 py-1 transition-colors"
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
