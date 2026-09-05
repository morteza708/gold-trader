"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { adminTreasuryAPI, CoverageSnapshot } from "@/lib/api/treasury";
import { toPersianDigits } from "@/lib/utils/numberUtils";

export default function TreasuryCoverageBanner() {
  const [coverage, setCoverage] = useState<CoverageSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await adminTreasuryAPI.getOverview();
        if (!cancelled) setCoverage(data);
      } catch {
        // سکوت — اتاق فرمان نباید به‌خاطر خزانه بشکند
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!coverage) return null;

  const tone =
    coverage.status === "critical"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : coverage.status === "warning"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";

  const Icon =
    coverage.status === "ok" ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-black/20">
            <Scale size={20} />
          </div>
          <div>
            <p className="font-black text-sm flex items-center gap-2">
              <Icon size={16} />
              پوشش خزانه: {coverage.status_label}
              {coverage.buy_blocked && (
                <span className="text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded-lg">
                  خرید کاربران متوقف
                </span>
              )}
            </p>
            <p className="text-xs mt-1.5 leading-6 opacity-90">
              موجودی شرکت{" "}
              {toPersianDigits(Number(coverage.company_gold_balance).toFixed(3))} گرم — تعهد{" "}
              {toPersianDigits(Number(coverage.obligated_gold).toFixed(3))} گرم — نسبت پوشش{" "}
              {toPersianDigits(Number(coverage.cover_percent).toLocaleString())}٪
              {coverage.status !== "ok" &&
                " — طلا به خزانه اضافه کنید یا تحویل‌های باز را مدیریت کنید."}
            </p>
          </div>
        </div>
        <Link
          href="/adminpanel/treasury"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/25 hover:bg-black/40 text-xs font-bold transition-colors"
        >
          خزانه و حسابرسی
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
