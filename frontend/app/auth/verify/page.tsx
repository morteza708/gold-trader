"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Edit2, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import toast from "react-hot-toast";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { OTP_LENGTH } from "@/lib/utils/otpAutofill";
import { useAuth } from "@/contexts/AuthContext";

function VerifyForm() {
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
      await verifyOTP(englishMobile, englishOtp);
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-gray-800 mb-3">کد تایید را وارد کنید</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>
            کد ۴ رقمی به{" "}
            <span className="font-bold text-gray-800 mx-1 dir-ltr">
              {mobile ? toPersianDigits(mobile) : ""}
            </span>{" "}
            ارسال شد
          </span>
          <Link
            href="/auth/login"
            className="text-gold-600 hover:text-gold-700 hover:bg-gold-50 p-1.5 rounded-lg transition-all"
            title="ویرایش شماره"
          >
            <Edit2 size={16} />
          </Link>
        </div>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-10">
        <OtpCodeInput
          value={otp}
          onChange={setOtp}
          onComplete={(code) => handleVerify(undefined, code)}
          webOtpSession={webOtpSession}
          disabled={isLoading}
          variant="light"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          {timeLeft > 0 ? (
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">زمان باقی‌مانده</span>
              <span className="text-2xl font-black text-gray-700 tracking-wider">
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
                className="text-gold-600 font-bold text-lg hover:text-gold-700 transition-colors flex items-center gap-2 border-b-2 border-gold-500/20 hover:border-gold-500 pb-0.5 disabled:opacity-50"
              >
                <RotateCcw size={18} />
                ارسال مجدد کد
              </button>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          className="w-full justify-center h-12 text-lg"
          disabled={isLoading || otp.length < OTP_LENGTH}
          type="submit"
        >
          {isLoading ? "در حال بررسی..." : "تایید و ادامه"}
        </Button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-gray-800 mb-3">کد تایید را وارد کنید</h1>
            <p className="text-gray-500 text-sm">در حال بارگذاری...</p>
          </div>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
