"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";
import toast from "react-hot-toast";
import { toEnglishDigits, validateMobile } from "@/lib/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobile) {
      toast.error("لطفا شماره موبایل را وارد کنید");
      return;
    }

    const englishMobile = toEnglishDigits(mobile);
    
    if (!validateMobile(englishMobile)) {
      toast.error("شماره موبایل نامعتبر است");
      return;
    }

    setIsLoading(true);

    try {
      await login(englishMobile);
      toast.success("کد تایید ارسال شد");
      router.push(`/adminpanel/verify?mobile=${englishMobile}`);
    } catch (error: any) {
      // بررسی نوع خطا
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.phone_number?.[0];
        if (errorMessage?.includes('ثبت نشده') || errorMessage?.includes('وجود ندارد')) {
          toast.error("شماره موبایل شما در سیستم ثبت نشده است. فقط مدیران تایید شده می‌توانند وارد شوند.");
        } else {
          toast.error(errorMessage || "خطا در ارسال کد تایید");
        }
      } else if (error.response?.status === 404) {
        toast.error("شماره موبایل شما در سیستم ثبت نشده است. فقط مدیران تایید شده می‌توانند وارد شوند.");
      } else {
        toast.error("خطا در ارسال کد تایید. لطفا دوباره تلاش کنید.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        
        {/* لوگو و عنوان */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gold-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gold-500/30">
            <ShieldCheck className="text-gold-500" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">ورود به پنل مدیریت</h1>
          <p className="text-slate-400 text-sm">
            برای دسترسی به پنل مدیریت، شماره موبایل خود را وارد کنید
          </p>
        </div>

        {/* فرم لاگین */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl border border-slate-700 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="w-full">
              <label className="block text-sm font-bold text-slate-300 mb-2">
                شماره موبایل مدیر
              </label>
              <div className="relative group">
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="مثلا: ۰۹۱۲..."
                  value={mobile}
                  onChange={(e) => {
                     // ۱. تبدیل فارسی به انگلیسی
                     let val = toEnglishDigits(e.target.value);
                     // ۲. حذف هر چیزی غیر از عدد
                     val = val.replace(/[^0-9]/g, ''); 
                     setMobile(val);
                  }}
                  maxLength={11}
                  className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-3 pr-12 text-center text-lg font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 text-white focus:text-white focus:border-gold-500 focus:outline-none transition-all duration-300"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold-500 transition-colors">
                  <Smartphone size={20} />
                </div>
              </div>
            </div>

            <Button 
              variant="primary" 
              className="w-full justify-between group bg-gold-500 hover:bg-gold-600"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                   <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                   در حال ارسال...
                </span>
              ) : (
                <>
                  <span>دریافت کد تایید</span>
                  <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                </>
              )}
            </Button>

          </form>

          <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              ⚠️ فقط مدیران تایید شده می‌توانند وارد شوند
            </p>
          </div>
        </div>

        {/* لینک بازگشت */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-1">
            بازگشت به صفحه اصلی
          </Link>
        </div>

      </div>
    </div>
  );
}

