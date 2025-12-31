"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";
import toast from "react-hot-toast";
import { toEnglishDigits, validateMobile } from "@/lib/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
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
      router.push(`/auth/verify?mobile=${englishMobile}`);
    } catch (error: any) {
      // بررسی نوع خطا
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.phone_number?.[0];
        if (errorMessage?.includes('ثبت نشده') || errorMessage?.includes('وجود ندارد')) {
          toast.error("شماره موبایل شما در سیستم ثبت نشده است. لطفا با پشتیبانی تماس بگیرید.");
        } else {
          toast.error(errorMessage || "خطا در ارسال کد تایید");
        }
      } else if (error.response?.status === 404) {
        toast.error("شماره موبایل شما در سیستم ثبت نشده است. لطفا با پشتیبانی تماس بگیرید.");
      } else {
        toast.error("خطا در ارسال کد تایید. لطفا دوباره تلاش کنید.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500">
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-800 mb-2">ورود به حساب کاربری</h1>
        <p className="text-gray-500 text-sm">
          برای استفاده از خدمات، شماره موبایل خود را وارد کنید
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        <Input
          label="شماره موبایل"
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
          icon={<Smartphone size={20} />}
          type="tel"
          dir="ltr"
          className="text-center text-lg font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal"
        />

        <Button 
          variant="primary" 
          className="w-full justify-between group"
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

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1">
          بازگشت به صفحه اصلی
        </Link>
      </div>

    </div>
  );
}
