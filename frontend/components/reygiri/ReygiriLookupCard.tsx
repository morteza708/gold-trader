"use client";

import { useState, FormEvent } from "react";
import { FlaskConical, Search, RefreshCw, Info, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { toEnglishDigits, toPersianDigits } from "@/lib/utils/numberUtils";
import { reygiriAPI, ReygiriResult } from "@/lib/api/reygiri";

type Variant = "light" | "dark";

interface ReygiriLookupCardProps {
  variant?: Variant;
  className?: string;
}

export default function ReygiriLookupCard({
  variant = "light",
  className = "",
}: ReygiriLookupCardProps) {
  const isDark = variant === "dark";
  const [packetNumber, setPacketNumber] = useState("");
  const [seri, setSeri] = useState("");
  const [archive, setArchive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ReygiriResult[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const n = toEnglishDigits(packetNumber).replace(/\D/g, "");
    if (!n) {
      toast.error("شماره پاکت را وارد کنید");
      return;
    }

    const seriClean = seri.trim().toUpperCase();
    if (seriClean && !/^[A-Z]$/.test(seriClean)) {
      toast.error("سری باید یک حرف انگلیسی (A تا Z) باشد");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await reygiriAPI.lookup({
        packet_number: n,
        seri: seriClean,
        archive,
      });
      setResults(res.results);
      if (res.count === 0) {
        toast.error("نتیجه‌ای برای این پاکت یافت نشد");
      }
    } catch (error: unknown) {
      setResults(null);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در استعلام ریگیری");
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark
    ? "bg-slate-900 border-slate-700"
    : "bg-white border-gray-100 shadow-sm";
  const titleCls = isDark ? "text-white" : "text-gray-900";
  const mutedCls = isDark ? "text-slate-400" : "text-gray-500";
  const inputCls = isDark
    ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-gold-500"
    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-gold-400";
  const resultCard = isDark
    ? "bg-slate-800/80 border-slate-700"
    : "bg-gradient-to-br from-amber-50 to-white border-amber-100";

  return (
    <div className={`rounded-3xl border p-5 sm:p-6 ${cardBg} ${className}`}>
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            isDark ? "bg-gold-500/20 text-gold-400" : "bg-gold-50 text-gold-600"
          }`}
        >
          <FlaskConical size={22} />
        </div>
        <div>
          <h2 className={`text-lg font-black ${titleCls}`}>استعلام ریگیری</h2>
          <p className={`text-xs mt-1 leading-6 ${mutedCls}`}>
            شماره پاکت روی انگ را وارد کنید. اگر سری حرف انگلیسی دارد، آن را هم بنویسید.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-3">
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${mutedCls}`}>
              شماره پاکت
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={packetNumber}
              onChange={(e) => setPacketNumber(toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))}
              placeholder="مثال: ۱۲۹۳۲۶"
              className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none dir-ltr text-right ${inputCls}`}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${mutedCls}`}>
              سری
            </label>
            <input
              type="text"
              maxLength={1}
              value={seri}
              onChange={(e) => {
                const v = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 1);
                setSeri(v);
              }}
              placeholder="A–Z"
              className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none dir-ltr text-center uppercase tracking-widest ${inputCls}`}
              disabled={loading}
              autoComplete="off"
            />
          </div>
        </div>

        <p className={`text-[11px] flex items-start gap-1.5 ${mutedCls}`}>
          <Info size={12} className="mt-0.5 shrink-0" />
          اگر سری عددی ۱ تا ۹ است، فیلد سری را خالی بگذارید.
        </p>

        <label className={`flex items-center justify-between gap-3 cursor-pointer rounded-2xl border px-4 py-3 ${
          isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"
        }`}>
          <span className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
            <Archive size={16} />
            شامل آرشیو
          </span>
          <input
            type="checkbox"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-gold-500 focus:ring-gold-500"
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-600 text-white font-black text-sm transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              در حال استعلام...
            </>
          ) : (
            <>
              <Search size={18} />
              استعلام
            </>
          )}
        </button>
      </form>

      {searched && !loading && results && results.length === 0 && (
        <div
          className={`mt-5 rounded-2xl border px-4 py-6 text-center text-sm ${
            isDark
              ? "border-slate-700 bg-slate-800/40 text-slate-400"
              : "border-gray-100 bg-gray-50 text-gray-500"
          }`}
        >
          نتیجه‌ای برای این پاکت یافت نشد.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-5 space-y-3">
          {results.map((item, idx) => (
            <div
              key={`${item.packet_number}-${idx}`}
              className={`rounded-2xl border p-4 ${resultCard}`}
            >
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className={`text-[11px] font-bold ${mutedCls}`}>عیار / خلوص</p>
                  <p
                    className={`text-4xl font-black tracking-tight ${
                      isDark ? "text-gold-400" : "text-amber-700"
                    }`}
                  >
                    {item.karat != null && item.karat !== ""
                      ? toPersianDigits(String(item.karat))
                      : "—"}
                  </p>
                  <p className={`text-[10px] mt-1 ${mutedCls}`}>قسمت در هزار</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    isDark
                      ? "bg-slate-700 text-slate-300"
                      : "bg-white/80 text-amber-800 border border-amber-200"
                  }`}
                >
                  پاکت {toPersianDigits(String(item.packet_number ?? ""))}
                </span>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className={`text-[11px] font-bold ${mutedCls}`}>نام / آزمایشگاه</dt>
                  <dd className={`font-bold mt-0.5 ${titleCls}`}>{item.name || "—"}</dd>
                </div>
                <div>
                  <dt className={`text-[11px] font-bold ${mutedCls}`}>تاریخ اعلام</dt>
                  <dd className={`font-bold mt-0.5 dir-ltr text-right ${titleCls}`}>
                    {item.announced_at
                      ? toPersianDigits(item.announced_at)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className={`text-[11px] font-bold ${mutedCls}`}>کد همراه</dt>
                  <dd className={`font-bold mt-0.5 ${titleCls}`}>
                    {item.companion_code != null && item.companion_code !== ""
                      ? toPersianDigits(String(item.companion_code))
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
