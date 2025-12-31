import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  href?: string; // اگر لینک باشد
  onClick?: () => void; // اگر دکمه معمولی باشد
  variant?: "primary" | "outline"; // نوع دکمه
  className?: string;
  disabled?: boolean; // غیرفعال کردن دکمه
  type?: "button" | "submit" | "reset"; // نوع دکمه HTML
}

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
}: ButtonProps) {
  // کلاس‌های پایه (مشترک)
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95";
  
  // استایل بر اساس نوع (Variant)
  const variants = {
    primary: disabled 
      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none" 
      : "bg-gold-500 hover:bg-gold-600 text-white shadow-lg shadow-gold-500/30",
    outline: disabled
      ? "border-2 border-gray-200 text-gray-400 bg-transparent cursor-not-allowed"
      : "border-2 border-gray-200 hover:border-gold-500 hover:text-gold-600 text-gray-600 bg-transparent",
  };

  const finalClass = `${baseStyles} ${variants[variant]} ${className}`;

  // اگر لینک بود از Link استفاده کن، اگر نه button
  if (href) {
    return <Link href={href} className={finalClass}>{children}</Link>;
  }

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={finalClass}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
