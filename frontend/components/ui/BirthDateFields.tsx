"use client";

import { toEnglishDigits, toPersianDigits } from "@/lib/utils/numberUtils";
import {
  JalaliBirthParts,
  PERSIAN_MONTHS,
} from "@/lib/utils/jalaliBirthDate";

type Props = {
  value: JalaliBirthParts;
  onChange: (next: JalaliBirthParts) => void;
  error?: string;
  disabled?: boolean;
  /** استایل فشرده‌تر برای پروفایل داشبورد */
  dense?: boolean;
  className?: string;
};

const fieldBase = (error?: string, disabled?: boolean, dense?: boolean) =>
  `
  w-full bg-gray-50 text-gray-900 border-2 rounded-xl outline-none transition-all duration-300
  text-center font-bold
  ${dense ? "px-2 py-2.5 text-sm" : "px-3 py-3"}
  ${disabled ? "opacity-60 cursor-not-allowed" : ""}
  ${
    error
      ? "border-red-300 focus:border-red-500 bg-red-50"
      : "border-gray-200 focus:border-gold-500 focus:bg-white hover:border-gray-300"
  }
`.trim();

export default function BirthDateFields({
  value,
  onChange,
  error,
  disabled = false,
  dense = false,
  className = "",
}: Props) {
  const setPart = (key: keyof JalaliBirthParts, raw: string) => {
    onChange({ ...value, [key]: raw });
  };

  const handleDay = (raw: string) => {
    const digits = toEnglishDigits(raw).replace(/\D/g, "").slice(0, 2);
    setPart("day", digits);
  };

  const handleYear = (raw: string) => {
    const digits = toEnglishDigits(raw).replace(/\D/g, "").slice(0, 4);
    setPart("year", digits);
  };

  return (
    <div className={`w-full ${className}`}>
      <label className={`block font-bold text-gray-700 mb-2 ${dense ? "text-xs" : "text-sm"}`}>
        تاریخ تولد
      </label>

      {/* RTL: روز | ماه | سال */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div>
          <span className="block text-[11px] text-gray-500 mb-1 font-medium text-center">روز</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="bday-day"
            disabled={disabled}
            value={value.day ? toPersianDigits(value.day) : ""}
            onChange={(e) => handleDay(e.target.value)}
            placeholder={toPersianDigits("01")}
            maxLength={2}
            className={fieldBase(error, disabled, dense)}
            aria-label="روز تولد"
          />
        </div>

        <div>
          <span className="block text-[11px] text-gray-500 mb-1 font-medium text-center">ماه</span>
          <select
            disabled={disabled}
            value={value.month}
            onChange={(e) => setPart("month", e.target.value)}
            className={`${fieldBase(error, disabled, dense)} appearance-none cursor-pointer`}
            aria-label="ماه تولد"
          >
            <option value="">ماه</option>
            {PERSIAN_MONTHS.map((m) => (
              <option key={m.value} value={String(m.value)}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-[11px] text-gray-500 mb-1 font-medium text-center">سال</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="bday-year"
            disabled={disabled}
            value={value.year ? toPersianDigits(value.year) : ""}
            onChange={(e) => handleYear(e.target.value)}
            placeholder={toPersianDigits("1370")}
            maxLength={4}
            className={`${fieldBase(error, disabled, dense)} tracking-wider`}
            aria-label="سال تولد"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}
