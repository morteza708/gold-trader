"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Edit2, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = searchParams.get("mobile");
  const { verifyOTP, login } = useAuth();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(120); 
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

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
      toast.success("کد جدید ارسال شد");
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        const errorMessage = error.response?.data?.error || error.response?.data?.phone_number?.[0];
        if (errorMessage?.includes('ثبت نشده') || errorMessage?.includes('وجود ندارد')) {
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

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 4 || !mobile) return;
    
    setIsLoading(true);
    const englishMobile = toEnglishDigits(mobile);
    const englishOtp = toEnglishDigits(otp);

    try {
      await verifyOTP(englishMobile, englishOtp);
      // verifyOTP خودش redirect می‌کند بر اساس وضعیت کاربر
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.otp_code?.[0];
        if (errorMessage?.includes('اشتباه') || errorMessage?.includes('نامعتبر')) {
          toast.error("کد وارد شده اشتباه است");
        } else if (errorMessage?.includes('منقضی')) {
          toast.error("کد تایید منقضی شده است. لطفا کد جدید دریافت کنید.");
        } else {
          toast.error(errorMessage || "کد تایید نامعتبر است");
        }
      } else {
        toast.error("خطا در تایید کد. لطفا دوباره تلاش کنید.");
      }
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* هدر: نمایش شماره فارسی */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-gray-800 mb-3">کد تایید را وارد کنید</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>
            کد ۴ رقمی به <span className="font-bold text-gray-800 mx-1 dir-ltr">{mobile ? toPersianDigits(mobile) : ""}</span> ارسال شد
          </span>
          <Link href="/auth/login" className="text-gold-600 hover:text-gold-700 hover:bg-gold-50 p-1.5 rounded-lg transition-all" title="ویرایش شماره">
            <Edit2 size={16} />
          </Link>
        </div>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-10">
        
        {/* اینپوت OTP */}
        <div className="relative w-full h-16" onClick={() => inputRef.current?.focus()}>
          <div className="absolute inset-0 flex justify-between gap-4 ltr" dir="ltr">
            {[0, 1, 2, 3].map((index) => {
              const digit = otp[index];
              const isActive = index === otp.length; 
              return (
                <div
                  key={index}
                  className={`
                    flex-1 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black transition-all duration-200 shadow-sm
                    ${isActive 
                        ? "border-gold-500 ring-4 ring-gold-500/10 bg-white scale-110 z-10 shadow-gold-500/20" 
                        : "border-gray-200 bg-gray-50"
                    }
                    ${digit ? "border-gray-800 text-gray-900 bg-white" : "text-gray-300"}
                  `}
                >
                  {/* نمایش عدد به صورت فارسی */}
                  {digit ? toPersianDigits(digit) : "-"}
                </div>
              );
            })}
          </div>

          <input
            ref={inputRef}
            value={otp}
            onChange={(e) => {
              // ۱. تبدیل ورودی فارسی به انگلیسی برای ذخیره در استیت
              let val = toEnglishDigits(e.target.value);
              // ۲. فیلتر کردن غیر عدد
              val = val.replace(/[^0-9]/g, "").slice(0, 4);
              setOtp(val);
              if (val.length === 4) handleVerify(); 
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text tracking-[2em] text-center"
            type="tel"
            autoComplete="one-time-code"
          />
        </div>

        {/* بخش تایمر و ارسال مجدد */}
        <div className="flex flex-col items-center justify-center gap-3">
          {timeLeft > 0 ? (
            <div className="flex flex-col items-center">
               <span className="text-xs text-gray-400 mb-1">زمان باقی‌مانده</span>
               {/* تایمر بزرگ و فارسی */}
               <span className="text-2xl font-black text-gray-700 tracking-wider">
                 {formatTime(timeLeft)}
               </span>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
               <span className="text-xs text-red-400 mb-1">کد را دریافت نکردید؟</span>
               {/* دکمه متنی ارسال مجدد */}
               <button 
                type="button" 
                onClick={handleResend}
                className="text-gold-600 font-bold text-lg hover:text-gold-700 transition-colors flex items-center gap-2 border-b-2 border-gold-500/20 hover:border-gold-500 pb-0.5"
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
          disabled={isLoading || otp.length < 4}
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
    <Suspense fallback={
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-gray-800 mb-3">کد تایید را وارد کنید</h1>
          <p className="text-gray-500 text-sm">در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
