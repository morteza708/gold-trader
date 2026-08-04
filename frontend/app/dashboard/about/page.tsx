"use client";

import { useEffect } from "react";
import { MapPin, Phone, Mail, Award, Users, Building } from "lucide-react";
import { brand, pageTitle } from "@/lib/brand";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AboutPage() {
  useEffect(() => {
    document.title = pageTitle("درباره ما");
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-12 text-center text-white relative overflow-hidden shadow-xl mb-8">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className="relative z-10">
            <div className="flex justify-center mb-4 md:mb-6">
              <BrandLogo variant="mark" size={80} showName={false} />
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black mb-4 leading-tight">
              {brand.name}؛ سرمایه‌گذاری امن در طلا
            </h1>
            
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed px-2">
               ما با حذف واسطه‌ها و ارائه پلتفرم آنلاین، امکان خرید و فروش طلای آب‌شده را با کمترین کارمزد و بالاترین امنیت برای همه ایرانیان فراهم کرده‌ایم.
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
         
         {/* ماموریت ما */}
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Award size={20}/></div>
            <h3 className="font-bold text-gray-800 mb-2">ماموریت ما</h3>
            <p className="text-sm text-gray-500 leading-6 text-justify">
               ایجاد بستری شفاف برای حفظ ارزش دارایی مردم در برابر تورم از طریق سرمایه‌گذاری خرد و کلان در طلا، با ضمانت بازخرید همیشگی.
            </p>
         </div>

         {/* تیم ما */}
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Users size={20}/></div>
            <h3 className="font-bold text-gray-800 mb-2">تیم متخصص</h3>
            <p className="text-sm text-gray-500 leading-6 text-justify">
               تیم {brand.name} متشکل از کارشناسان بازار طلا، توسعه‌دهندگان نرم‌افزار و متخصصان امنیت سایبری است تا تجربه‌ای بی‌نقص را رقم بزنند.
            </p>
         </div>
      </div>

      {/* اطلاعات تماس */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
         <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Building className="text-gold-500" size={20} />
            ارتباط با ما
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="flex flex-col items-center text-center gap-3 p-4 bg-gray-50 rounded-2xl">
               <MapPin size={24} className="text-gray-400" />
               <span className="font-bold text-gray-700 text-sm">آدرس دفتر مرکزی</span>
               <span className="text-xs text-gray-500">تهران، بازار بزرگ، سرای زرگرها، پلاک ۱۱۰</span>
            </div>
            
            <div className="flex flex-col items-center text-center gap-3 p-4 bg-gray-50 rounded-2xl">
               <Phone size={24} className="text-gray-400" />
               <span className="font-bold text-gray-700 text-sm">تلفن پشتیبانی</span>
               <span className="text-xs text-gray-500 dir-ltr font-mono">۰۲۱ - ۸۸ ۸۸ ۸۸ ۸۸</span>
            </div>

            <div className="flex flex-col items-center text-center gap-3 p-4 bg-gray-50 rounded-2xl">
               <Mail size={24} className="text-gray-400" />
               <span className="font-bold text-gray-700 text-sm">پست الکترونیک</span>
               <span className="text-xs text-gray-500 font-mono">info@goldtrader.ir</span>
            </div>
         </div>

         {/* نقشه گوگل */}
         <div className="mt-8 rounded-2xl overflow-hidden h-48 bg-gray-200 relative border border-gray-300">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm font-bold bg-gray-100">
               <MapPin size={32} className="mb-2 opacity-50 block mx-auto" />
               [نقشه گوگل مپ در اینجا قرار می‌گیرد]
            </div>
         </div>
      </div>

    </div>
  );
}
