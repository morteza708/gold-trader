"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Wallet, TrendingUp, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";

const STORAGE_KEY = "opalbox_onboarding_seen_v1";

interface WelcomeOnboardingModalProps {
  onDismiss?: () => void;
}

export default function WelcomeOnboardingModal({ onDismiss }: WelcomeOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setIsOpen(false);
    onDismiss?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-black mb-1">به OpalBox خوش آمدید!</h2>
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
            <Link href="/dashboard/wallet?tab=deposit" onClick={handleClose}>
              <Button variant="primary" className="w-full justify-center">
                <Wallet size={16} className="ml-2" />
                رفتن به کیف پول
              </Button>
            </Link>
            <button
              onClick={handleClose}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft size={14} />
              بعداً یادآوری کن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}
