import { ShieldCheck, Zap, Wallet } from "lucide-react"; // آیکون‌های جدید
import Button from "../ui/Button";
import HeroVisual from "./HeroVisual";

export default function HeroSection() {
  return (
    <section className="relative py-12 lg:py-20 overflow-hidden">
      <div className="container-custom relative z-10">
        
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* ستون متن */}
          <div className="text-center lg:text-right order-2 lg:order-1 flex flex-col items-center lg:items-start">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs text-black font-bold bg-gold-50 rounded-full border border-gold-200 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
              </span>
              سامانه هوشمند معاملات طلا
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.2] mb-6">
              آینده سرمایه‌گذاری
              <br className="hidden sm:block" />
              <span className="block sm:inline mt-2 sm:mt-0">در دستان <span className="text-gold-500 relative inline-block">
                شماست
                <svg className="absolute w-full h-2 bottom-1 right-0 text-gold-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
              </span></span>
            </h1>

            <p className="text-base sm:text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
              بدون اجرت و مالیات، طلای آب‌شده بخرید. ما امنیت دارایی شما را با ضمانت بانکی و تحویل فیزیکی تضمین می‌کنیم.
            </p>

            <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-3 mb-10">
              <Button href="/auth/login" variant="primary" className="w-full sm:w-auto justify-center">
                شروع سرمایه‌گذاری
              </Button>
              <Button href="#features" variant="outline" className="w-full sm:w-auto justify-center">
                مشاهده خدمات
              </Button>
            </div>

             {/* --- شروع بخش کارت‌های ویژگی (اصلاح شده) --- */}
            <div className="w-full grid grid-cols-3 gap-4 lg:gap-12 border-t border-gray-100 pt-10 mt-2">
                
                {/* کارت ۱: امنیت */}
                <div className="flex flex-col items-center justify-center text-center gap-3 group cursor-default">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors shadow-sm">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">امنیت تضمینی</h4>
                        <p className="text-xs text-gray-500 mt-1">ضمانت بانکی دارایی</p>
                    </div>
                </div>

                {/* کارت ۲: سرعت */}
                <div className="flex flex-col items-center justify-center text-center gap-3 group cursor-default">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors shadow-sm">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">تسویه آنی</h4>
                        <p className="text-xs text-gray-500 mt-1">واریز زیر ۳ دقیقه</p>
                    </div>
                </div>

                {/* کارت ۳: کارمزد */}
                <div className="flex flex-col items-center justify-center text-center gap-3 group cursor-default">
                    <div className="w-12 h-12 bg-gold-50 rounded-2xl flex items-center justify-center text-gold-600 group-hover:bg-gold-100 transition-colors shadow-sm">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm md:text-base">بدون اجرت</h4>
                        <p className="text-xs text-gray-500 mt-1">خرید به قیمت بازار</p>
                    </div>
                </div>

            </div>
            {/* --- پایان بخش کارت‌ها --- */}


          </div>

          {/* ستون تصویر */}
          <div className="order-1 lg:order-2 px-4 lg:px-0">
            <HeroVisual />
          </div>

        </div>
      </div>
    </section>
  );
}
