"use client";

import { useId } from "react";

type PriceSparklineProps = {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
  direction?: "up" | "down" | "flat";
};

export default function PriceSparkline({
  values,
  className = "",
  width = 320,
  height = 56,
  direction,
}: PriceSparklineProps) {
  const fillId = useId().replace(/:/g, "");
  if (values.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-[11px] text-slate-500 ${className}`}
        style={{ height }}
      >
        تاریخچه کافی نیست
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padX = 2;
  const padY = 4;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = values.map((value, index) => {
    const x = padX + (index / (values.length - 1)) * innerW;
    const y = padY + innerH - ((value - min) / span) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = coords.join(" ");
  const first = coords[0].split(",")[0];
  const last = coords[coords.length - 1].split(",")[0];
  const area = `M${first},${height - padY} L${line} L${last},${height - padY} Z`;
  const trend =
    direction ?? (values[values.length - 1] >= values[0] ? "up" : "down");
  const stroke =
    trend === "up" ? "#34d399" : trend === "down" ? "#f87171" : "#D4AF37";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-14 ${className}`}
      role="img"
      aria-label="روند قیمت"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
