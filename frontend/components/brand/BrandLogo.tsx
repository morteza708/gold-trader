import Image from "next/image";
import { brand } from "@/lib/brand";

type BrandLogoVariant = "mark" | "lockup" | "stacked";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  /** Mark size in px (ignored for lockup width-driven layout) */
  size?: number;
  showName?: boolean;
  className?: string;
  priority?: boolean;
};

/**
 * Consistent brand mark usage:
 * - mark: hexagon icon only (navbar, compact UI)
 * - stacked: large mark + Persian name below (auth)
 * - lockup: full wide logo asset (about / marketing)
 */
export default function BrandLogo({
  variant = "mark",
  size = 40,
  showName = variant === "mark",
  className = "",
  priority = false,
}: BrandLogoProps) {
  if (variant === "lockup") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Image
          src={brand.logoPath}
          alt={brand.name}
          width={200}
          height={110}
          className="h-14 sm:h-16 w-auto max-w-[200px] object-contain"
          priority={priority}
        />
      </div>
    );
  }

  if (variant === "stacked") {
    const markSize = size >= 64 ? size : 72;
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <Image
          src={brand.logoMarkPath}
          alt=""
          width={markSize}
          height={markSize}
          className="w-auto h-auto object-contain drop-shadow-md"
          style={{ width: markSize, height: markSize }}
          priority={priority}
        />
        <div className="text-center">
          <p className="text-xl font-black text-gray-900 tracking-tight">
            {brand.name}
          </p>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-600 uppercase mt-0.5">
            {brand.nameEn}
          </p>
        </div>
      </div>
    );
  }

  // mark (+ optional Persian name for navbar)
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src={brand.logoMarkPath}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain drop-shadow-sm"
        style={{ width: size, height: size }}
        priority={priority}
      />
      {showName && (
        <span className="text-xl font-black text-gray-800 tracking-tight">
          {brand.name}
        </span>
      )}
    </span>
  );
}
