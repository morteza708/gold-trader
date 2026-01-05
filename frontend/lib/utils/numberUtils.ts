/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export const toPersianDigits = (n: number | string | null | undefined): string => {
  if (n === undefined || n === null) return "";
  return n.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
};

/**
 * تبدیل اعداد فارسی/عربی به انگلیسی
 */
export const toEnglishDigits = (str: string): string => {
  return str
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
};

/**
 * فرمت کردن عدد با کاما (برای پول)
 */
export const formatNumber = (num: string | number): string => {
  const numStr = typeof num === "number" ? num.toString() : num;
  return numStr.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * فرمت کردن شماره موبایل (فقط اعداد، حداکثر 11 رقم)
 */
export const formatMobile = (value: string, currentMobile?: string): string => {
  const english = toEnglishDigits(value);
  const cleaned = english.replace(/\D/g, "");
  if (cleaned.length > 11) return currentMobile || "";
  return cleaned;
};

/**
 * بررسی اعتبار شماره موبایل ایرانی
 */
export const validateMobile = (phone: string): boolean => {
  const english = toEnglishDigits(phone);
  const regex = /^09[0-9]{9}$/;
  return regex.test(english);
};

