"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Edit2, RotateCcw, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import toast from "react-hot-toast";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { OTP_LENGTH } from "@/lib/utils/otpAutofill";
import { useAuth } from "@/contexts/AuthContext";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = searchParams.get("mobile");
  const { verifyOTP, login } = useAuth();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [isLoading, setIsLoading] = useState(false);
  const [webOtpSession, setWebOtpSession] = useState(0);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return toPersianDigits(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
  };

  const handleResend = async () => {
    if (!mobile) {
      toast.error("شماره موبایل یافت نشد");
      return;
    }

    const englishMobile = toEnglishDigits(mobile);
    setIsLoading(true);

    try {
      await login(englishMobile);
      setTimeLeft(120);
      setOtp("");
      setWebOtpSession((prev) => prev + 1);
      toast.success("کد جدید ارسال شد");
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        const errorMessage = error.response?.data?.error || error.response?.data?.phone_number?.[0];
        if (errorMessage?.includes("ثبت نشده") || errorMessage?.includes("وجود ندارد")) {
          toast.error("شماره موبایل شما در سیستم ثبت نشده است.");
        } else {
          toast.error(errorMessage || "خطا در ارسال مجدد کد");
        }
      } else {
        toast.error("خطا در ارسال مجدد کد");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent, codeOverride?: string) => {
    e?.preventDefault();
    const code = codeOverride ?? otp;
    if (code.length !== OTP_LENGTH || !mobile || isLoading) return;

    setIsLoading(true);
    const englishMobile = toEnglishDigits(mobile);
    const englishOtp = toEnglishDigits(code);

    try {
      const response = await verifyOTP(englishMobile, englishOtp);

      if (response.user.role !== "SUPER_ADMIN" && response.user.role !== "SITE_ADMIN") {
        toast.error("شما دسترسی به پنل مدیریت ندارید. لطفا از پنل کاربری استفاده کنید.");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        router.push("/auth/login");
        return;
      }

      router.push("/adminpanel");
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.otp_code?.[0];
        if (errorMessage?.includes("اشتباه") || errorMessage?.includes("نامعتبر")) {
          toast.error("کد وارد شده اشتباه است");
        } else if (errorMessage?.includes("منقضی")) {
          toast.error("کد تایید منقضی شده است. لطفا کد جدید دریافت کنید.");
        } else {
          toast.error(errorMessage || "کد تایید نامعتبر است");
        }
      } else {
        toast.error("خطا در تایید کد. لطفا دوباره تلاش کنید.");
      }
      setOtp("");
      setWebOtpSession((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gold-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gold-500/30">
            <ShieldCheck className="text-gold-500" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">کد تایید را وارد کنید</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <span>
              کد ۴ رقمی به{" "}
              <span className="font-bold text-white mx-1 dir-ltr">
                {mobile ? toPersianDigits(mobile) : ""}
              </span>{" "}
              ارسال شد
            </span>
            <Link
              href="/adminpanel/login"
              className="text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 p-1.5 rounded-lg transition-all"
              title="ویرایش شماره"
            >
              <Edit2 size={16} />
            </Link>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl border border-slate-700 p-6 shadow-2xl">
          <form onSubmit={handleVerify} className="flex flex-col gap-10">
            <OtpCodeInput
              value={otp}
              onChange={setOtp}
              onComplete={(code) => handleVerify(undefined, code)}
              webOtpSession={webOtpSession}
              disabled={isLoading}
              variant="dark"
            />

            <div className="flex flex-col items-center justify-center gap-3">
              {timeLeft > 0 ? (
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 mb-1">زمان باقی‌مانده</span>
                  <span className="text-2xl font-black text-white tracking-wider">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <span className="text-xs text-red-400 mb-1">کد را دریافت نکردید؟</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-gold-500 font-bold text-lg hover:text-gold-400 transition-colors flex items-center gap-2 border-b-2 border-gold-500/20 hover:border-gold-500 pb-0.5 disabled:opacity-50"
                  >
                    <RotateCcw size={18} />
                    ارسال مجدد کد
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              className="w-full justify-center h-12 text-lg bg-gold-500 hover:bg-gold-600"
              disabled={isLoading || otp.length < OTP_LENGTH}
              type="submit"
            >
              {isLoading ? "در حال بررسی..." : "تایید و ورود به پنل مدیریت"}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/adminpanel/login" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            بازگشت به صفحه لاگین
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-gold-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gold-500/30">
              <ShieldCheck className="text-gold-500" size={32} />
            </div>
            <p className="text-slate-400">در حال بارگذاری...</p>
          </div>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
