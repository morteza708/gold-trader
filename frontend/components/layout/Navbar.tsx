"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LogIn, ShieldCheck } from "lucide-react";
import Button from "../ui/Button";
import BrandLogo from "@/components/brand/BrandLogo";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "خانه", href: "/" },
    { name: "قیمت‌ها", href: "/prices" },
    { name: "وبلاگ", href: "/blog" },
    { name: "درباره ما", href: "/about" },
    { name: "تماس با ما", href: "/contact" },
  ];

  return (
    <>
      <nav className="w-full py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100/50">
        <div className="container-custom flex items-center justify-between h-14">
          
          <div className="flex md:hidden flex-1 justify-start">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -mr-2 text-gray-600 hover:text-gold-500 transition-colors"
            >
              <Menu size={28} />
            </button>
          </div>

          <div className="flex-1 md:flex-none flex justify-center md:justify-start">
            <Link href="/" className="flex items-center">
              <BrandLogo variant="mark" size={40} showName priority />
            </Link>
          </div>

          {/* --- منوی دسکتاپ (وسط) --- */}
          <div className="hidden md:flex items-center gap-8 mx-auto bg-gray-50/50 px-6 py-2 rounded-full border border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gold-600 transition-colors relative group"
              >
                {link.name}
                {/* خط زیرین هاور */}
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-gold-500 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          {/* --- دکمه ورود (دسکتاپ و موبایل) --- */}
          <div className="flex-1 md:flex-none flex justify-end items-center gap-2">
            {/* حالت دسکتاپ: دکمه‌های کامل */}
            <div className="hidden md:flex items-center gap-2">
              <Button href="/auth/login" variant="primary" className="!py-2 !px-6 !text-sm !rounded-lg">
                ورود / ثبت‌نام
              </Button>
              <Link 
                href="/adminpanel/login" 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gold-600 bg-gray-50 hover:bg-gold-50 rounded-lg border border-gray-200 hover:border-gold-200 transition-colors"
                title="ورود به پنل مدیریت"
              >
                <ShieldCheck size={18} />
                <span className="hidden lg:inline">پنل مدیریت</span>
              </Link>
            </div>

            {/* حالت موبایل: فقط آیکون ورود کاربر (بدون پس‌زمینه) */}
            <div className="md:hidden">
              <Link href="/auth/login" className="p-2 -ml-2 text-gray-600 hover:text-gold-500 transition-colors">
                <User size={24} />
              </Link>
            </div>
          </div>

        </div>
      </nav>

      {/* --- منوی کشویی موبایل (Overlay) --- */}
      {/* وقتی state true باشد نمایش داده می‌شود */}
      <div className={`fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"}`} onClick={() => setIsMobileMenuOpen(false)}>
        {/* پنل سفید منو */}
        <div 
          className={`absolute top-0 right-0 w-[280px] h-full bg-white shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
          onClick={(e) => e.stopPropagation()} // جلوگیری از بسته شدن با کلیک روی خود منو
        >
          <div className="p-6 flex flex-col h-full">
            {/* سربرگ منو */}
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg text-gray-800">منوی خدمات</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            {/* لینک‌ها */}
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gold-50 text-gray-600 hover:text-gold-600 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-300"></span>
                  {link.name}
                </Link>
              ))}
            </div>

            {/* فوتر منو */}
            <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">
               <Button href="/auth/login" variant="primary" className="w-full justify-center">
                  <LogIn size={18} />
                  ورود به حساب کاربری
               </Button>
               <Link 
                 href="/adminpanel/login"
                 className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 hover:bg-gold-50 text-gray-700 hover:text-gold-600 rounded-xl border border-gray-200 hover:border-gold-200 transition-colors font-medium text-sm"
               >
                  <ShieldCheck size={18} />
                  ورود به پنل مدیریت
               </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
