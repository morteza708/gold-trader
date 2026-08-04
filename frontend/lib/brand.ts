/**
 * Brand / tenant config — set via env per deploy (e.g. OpalBox).
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "گلد تریدر",
  nameEn: process.env.NEXT_PUBLIC_BRAND_NAME_EN || "Gold Trader",
  companyName:
    process.env.NEXT_PUBLIC_BRAND_COMPANY_NAME ||
    `شرکت ${process.env.NEXT_PUBLIC_BRAND_NAME || "گلد تریدر"}`,
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
    "سامانه امن خرید و فروش طلای آب‌شده",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Full lockup (icon + English wordmark) — wide assets */
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO || "/OpalBox.png",
  /** Icon-only mark — headers, favicon-adjacent UI */
  logoMarkPath:
    process.env.NEXT_PUBLIC_BRAND_LOGO_MARK || "/OpalBox-mark.png",
  themeColor: process.env.NEXT_PUBLIC_THEME_COLOR || "#D4AF37",
} as const;

export function pageTitle(section?: string): string {
  if (!section) return brand.name;
  return `${section} | ${brand.name}`;
}
