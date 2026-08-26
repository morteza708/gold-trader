import imageCompression from "browser-image-compression";

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
export type ImageUploadPurpose = "document" | "avatar" | "page";

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return "";
  return fileName.slice(idx).toLowerCase();
}

function isHeicLike(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    ext === ".heic" ||
    ext === ".heif"
  );
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
      message: `حجم این عکس بیش از ${MAX_IMAGE_SIZE_LABEL} است. لطفاً عکس کوچک‌تری انتخاب کنید.`,
    };
  }
  return { ok: true };
}

const COMPRESS_OPTIONS: Record<
  ImageUploadPurpose,
  {
    maxSizeMB: number;
    maxWidthOrHeight: number;
  }
> = {
  document: { maxSizeMB: 0.75, maxWidthOrHeight: 1600 },
  avatar: { maxSizeMB: 0.35, maxWidthOrHeight: 512 },
  page: { maxSizeMB: 0.85, maxWidthOrHeight: 1920 },
};

function buildJpegName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.jpg`;
}

/**
 * Validate + client-side compress before upload.
 * Complements backend optimize — does not conflict with it.
 * HEIC/HEIF is passed through for server-side conversion.
 */
export async function prepareImageForUpload(
  file: File,
  purpose: ImageUploadPurpose = "document"
): Promise<{
  ok: boolean;
  file?: File;
  reason?: ImageUploadErrorReason;
  message?: string;
  compressed?: boolean;
}> {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason,
      message: validation.message,
    };
  }

  // Browser compression usually cannot decode HEIC; backend handles it.
  if (isHeicLike(file)) {
    return { ok: true, file, compressed: false };
  }

  const opts = COMPRESS_OPTIONS[purpose];

  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.75,
    });

    const out =
      compressedBlob instanceof File
        ? new File([compressedBlob], buildJpegName(file.name), {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
        : new File([compressedBlob], buildJpegName(file.name), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

    // Keep original if compression somehow grew the file
    if (out.size >= file.size && file.type === "image/jpeg") {
      return { ok: true, file, compressed: false };
    }

    return { ok: true, file: out, compressed: true };
  } catch {
    // Fallback: upload original; backend still optimizes on save
    return { ok: true, file, compressed: false };
  }
}
