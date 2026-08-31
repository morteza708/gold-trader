import { toEnglishDigits } from "@/lib/utils/numberUtils";

export const OTP_LENGTH = 4;

/** Domain bound in SMS (@opalbox.ir #1234). Must match browser/PWA origin. */
export function getOtpSmsDomain(): string {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opalbox.ir";
    return new URL(siteUrl).hostname.replace(/^www\./i, "");
  } catch {
    return "opalbox.ir";
  }
}

export function normalizeOtpInput(value: string, length = OTP_LENGTH): string {
  return toEnglishDigits(value).replace(/\D/g, "").slice(0, length);
}
