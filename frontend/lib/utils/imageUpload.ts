export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
]);

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE_LABEL = "۱۰ مگابایت";

export const IMAGE_FILE_ACCEPT =
  "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

export const COMPRESS_IMAGE_TOOLS = [
  {
    name: "iLoveIMG",
    url: "https://www.iloveimg.com/compress-image",
    note: "فشرده‌سازی آنلاین — مناسب آیفون و اندروید",
  },
  {
    name: "TinyPNG",
    url: "https://tinypng.com/",
    note: "کاهش حجم JPG و PNG با کیفیت خوب",
  },
  {
    name: "Compress JPEG",
    url: "https://compressjpeg.com/",
    note: "تبدیل و فشرده‌سازی سریع به JPG",
  },
  {
    name: "Img2Go",
    url: "https://www.img2go.com/compress-image",
    note: "پشتیبانی از فرمت‌های مختلف از جمله HEIC",
  },
] as const;

export type ImageUploadErrorReason = "size" | "format" | "general";

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

export function isAllowedImageFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase().trim();
  const ext = getFileExtension(file.name);

  if (ALLOWED_IMAGE_TYPES.has(mime)) return true;
  if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    if (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") {
      return true;
    }
    if (mime.startsWith("image/")) return true;
  }
  return false;
}

export function validateImageFile(file: File): {
  ok: boolean;
  reason?: ImageUploadErrorReason;
  message?: string;
} {
  if (!isAllowedImageFile(file)) {
    return {
      ok: false,
      reason: "format",
      message:
        "فرمت این فایل مجاز نیست. JPG، PNG، WebP یا HEIC/HEIF (آیفون) را انتخاب کنید.",
    };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      reason: "size",
      message: `حجم این عکس بیش از ${MAX_IMAGE_SIZE_LABEL} است. با یکی از ابزارهای زیر حجم را کم کنید و دوباره آپلود کنید.`,
    };
  }
  return { ok: true };
}
