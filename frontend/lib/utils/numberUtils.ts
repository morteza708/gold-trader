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
 * وزن طلا — استاندارد پلتفرم: ۳ رقم اعشار
 */
export const formatGoldGrams = (value: number | string | null | undefined): string => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(toEnglishDigits(String(value)));
  if (!Number.isFinite(n)) return "";
  return n.toFixed(3);
};

/**
 * عیار — بدون صفر اعشار اضافه (۷۴۷ نه ۷۴۷.۰)
 */
export const formatKarat = (value: number | string | null | undefined): string => {
  if (value === undefined || value === null || value === "") return "";
  const raw = toEnglishDigits(String(value)).trim();
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (Number.isInteger(n)) return String(n);
  return String(n)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "")
    .replace(/\.$/, "");
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

