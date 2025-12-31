"use client";

import { useEffect } from "react";
import { ShieldCheck, Scale, AlertTriangle, FileText } from "lucide-react";

export default function TermsPage() {
  // تنظیم title صفحه
  useEffect(() => {
    document.title = "قوانین و مقررات | پلتفرم معاملات طلا";
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* هدر صفحه */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
           <div className="w-16 h-16 bg-gold-50 text-gold-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Scale size={32} />
           </div>
           <h1 className="text-2xl font-black text-gray-800 mb-2">قوانین و مقررات استفاده</h1>
           <p className="text-gray-500 text-sm max-w-lg mx-auto">
             لطفاً جهت استفاده از خدمات گلد تریدر، قوانین زیر را به دقت مطالعه فرمایید. ثبت‌نام شما به منزله پذیرش تمامی این قوانین است.
           </p>
           <p className="text-xs text-gray-400 mt-4 font-bold">آخرین بروزرسانی: ۲۰ آذر ۱۴۰۳</p>
        </div>
      </div>

      {/* باکس قوانین */}
      <div className="space-y-6">
        
        {/* ماده ۱ */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
           <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="text-green-500" size={20} />
              ماده ۱: شرایط عمومی و احراز هویت
           </h3>
           <div className="space-y-3 text-sm text-gray-600 leading-7 text-justify">
              <p>۱-۱. کاربران جهت استفاده از خدمات سایت باید دارای سن قانونی (۱۸ سال تمام) باشند.</p>
              <p>۱-۲. احراز هویت شامل ثبت شماره موبایل به نام کاربر، کارت ملی هوشمند و کارت بانکی معتبر الزامی است.</p>
              <p>۱-۳. هر کاربر تنها مجاز به داشتن یک حساب کاربری است و اجاره دادن حساب به اشخاص ثالث اکیداً ممنوع و پیگرد قانونی دارد.</p>
           </div>
        </div>

        {/* ماده ۲ */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
           <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <FileText className="text-blue-500" size={20} />
              ماده ۲: شرایط خرید و فروش
           </h3>
           <div className="space-y-3 text-sm text-gray-600 leading-7 text-justify">
              <p>۲-۱. مبنای قیمت‌گذاری طلا، نرخ لحظه‌ای مظنه بازار تهران می‌باشد که در داشبورد نمایش داده می‌شود.</p>
              <p>۲-۲. پس از ثبت سفارش خرید یا فروش، امکان لغو آن وجود ندارد چرا که معامله به صورت آنی در بازار پوشش داده می‌شود.</p>
              <p>۲-۳. تسویه حساب ریالی در روزهای کاری طبق سیکل پایا (۳:۴۵ بامداد، ۱۰:۴۵، ۱۳:۴۵ و ۱۸:۴۵) انجام می‌گردد.</p>
           </div>
        </div>

        {/* ماده ۳ */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm border-l-4 border-l-red-400">
           <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              ماده ۳: سلب مسئولیت و ریسک
           </h3>
           <div className="space-y-3 text-sm text-gray-600 leading-7 text-justify">
              <p>۳-۱. بازار طلا دارای نوسانات ذاتی است. کاربر با آگاهی کامل از ریسک کاهش یا افزایش قیمت اقدام به معامله می‌کند.</p>
              <p>۳-۲. در صورت بروز اختلال در شبکه بانکی یا اینترنت کشور، گلد تریدر مسئولیتی در قبال تاخیر در تراکنش‌ها ندارد، هرچند تمام تلاش خود را برای پیگیری انجام می‌دهد.</p>
           </div>
        </div>

      </div>
    </div>
  );
}
