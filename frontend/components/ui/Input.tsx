import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode; // آیکون سمت راست اینپوت
}

export default function Input({ 
  label, 
  error, 
  icon, 
  className = "", 
  ...props 
}: InputProps) {
  return (
    <div className="w-full">
      {/* لیبل */}
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* نگهدارنده اینپوت و آیکون */}
      <div className="relative group">
        {/* اینپوت */}
        <input
          className={`
            w-full bg-gray-50 text-gray-900 border-2 rounded-xl px-4 py-3 outline-none transition-all duration-300
            ${icon ? "pr-12" : ""} /* اگر آیکون داشت، از راست فاصله بده */
            ${error 
              ? "border-red-300 focus:border-red-500 bg-red-50" 
              : "border-gray-200 focus:border-gold-500 focus:bg-white hover:border-gray-300"
            }
            ${className}
          `}
          {...props}
        />

        {/* آیکون (Absolute) */}
        {icon && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-red-400" : "text-gray-400 group-focus-within:text-gold-500"}`}>
            {icon}
          </div>
        )}
      </div>

      {/* متن خطا */}
      {error && (
        <p className="text-xs text-red-500 mt-1 font-medium animate-pulse">
          {error}
        </p>
      )}
    </div>
  );
}
