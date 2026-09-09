import { toEnglishDigits } from "@/lib/utils/numberUtils";

/** ماه‌های شمسی برای انتخاب در فرم تاریخ تولد */
export const PERSIAN_MONTHS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: "فروردین" },
  { value: 2, label: "اردیبهشت" },
  { value: 3, label: "خرداد" },
  { value: 4, label: "تیر" },
  { value: 5, label: "مرداد" },
  { value: 6, label: "شهریور" },
  { value: 7, label: "مهر" },
  { value: 8, label: "آبان" },
  { value: 9, label: "آذر" },
  { value: 10, label: "دی" },
  { value: 11, label: "بهمن" },
  { value: 12, label: "اسفند" },
] as const;

export type JalaliBirthParts = {
  day: string;
  month: string;
  year: string;
};

export const EMPTY_BIRTH_PARTS: JalaliBirthParts = {
  day: "",
  month: "",
  year: "",
};

/** الگوریتم تقریبی سال کبیسه جلالی (کافی برای اعتبارسنجی فرم) */
export function isJalaliLeapYear(year: number): boolean {
  const breaks = [1, 5, 9, 13, 17, 22, 26, 30];
  const cycle = ((year + 2346) % 2820) % 128;
  return breaks.includes(cycle) || (cycle > 30 && (cycle - 30) % 33 === 1);
}

export function daysInJalaliMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

export function parseJalaliBirthParts(dateStr?: string | null): JalaliBirthParts {
  if (!dateStr) return { ...EMPTY_BIRTH_PARTS };
  const cleaned = toEnglishDigits(dateStr).replace(/[./]/g, "-").replace(/\/+/g, "-").trim();
  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length !== 3) return { ...EMPTY_BIRTH_PARTS };

  const [a, b, c] = parts;
  let year: number;
  let month: number;
  let day: number;

  if (a.length === 4) {
    year = parseInt(a, 10);
    month = parseInt(b, 10);
    day = parseInt(c, 10);
  } else if (c.length === 4) {
    year = parseInt(c, 10);
    month = parseInt(b, 10);
    day = parseInt(a, 10);
  } else {
    return { ...EMPTY_BIRTH_PARTS };
  }

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return { ...EMPTY_BIRTH_PARTS };
  }

  return {
    day: String(day),
    month: String(month),
    year: String(year),
  };
}

/**
 * ساخت رشته YYYY-MM-DD شمسی برای API؛ در صورت نامعتبر بودن null.
 */
export function formatJalaliBirthDate(parts: JalaliBirthParts): string | null {
  const day = parseInt(toEnglishDigits(parts.day || ""), 10);
  const month = parseInt(toEnglishDigits(parts.month || ""), 10);
  const year = parseInt(toEnglishDigits(parts.year || ""), 10);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  if (year < 1270 || year > 1450) return null;
  if (month < 1 || month > 12) return null;

  const maxDay = daysInJalaliMonth(year, month);
  if (day < 1 || day > maxDay) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function validateJalaliBirthParts(parts: JalaliBirthParts): string | null {
  if (!parts.day.trim() || !parts.month.trim() || !parts.year.trim()) {
    return "تاریخ تولد الزامی است";
  }
  if (!formatJalaliBirthDate(parts)) {
    return "تاریخ تولد نامعتبر است";
  }
  return null;
}
