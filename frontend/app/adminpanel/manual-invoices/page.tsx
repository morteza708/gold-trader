"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilePlus2,
  Search,
  RefreshCw,
  Save,
  UserPlus,
  Receipt,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adminTradesAPI,
  Trade,
  ManualCustomer,
  GoldPriceAdmin,
} from "@/lib/api/trades";
import { toPersianDigits, toEnglishDigits, formatNumber } from "@/lib/utils/numberUtils";
import InvoiceModal from "@/components/dashboard/InvoiceModal";

function displayName(u: Pick<ManualCustomer, "full_name" | "first_name" | "last_name">) {
  if (u.full_name?.trim()) return u.full_name.trim();
  const joined = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return joined || "بدون نام";
}

export default function ManualInvoicesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<ManualCustomer[]>([]);
  const [selected, setSelected] = useState<ManualCustomer | null>(null);

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [priceInfo, setPriceInfo] = useState<GoldPriceAdmin | null>(null);
  const [settlementMode, setSettlementMode] = useState<"WALLET" | "OFFPLATFORM">("OFFPLATFORM");
  const [paymentStatus, setPaymentStatus] = useState("PAID_OFFPLATFORM");
  const [deliveryStatus, setDeliveryStatus] = useState("NOT_APPLICABLE");
  const [adminNote, setAdminNote] = useState("");
  const [settlementNote, setSettlementNote] = useState("");

  const [invoiceTrade, setInvoiceTrade] = useState<Trade | null>(null);

  useEffect(() => {
    document.title = "فاکتور دستی | پنل مدیریت";
  }, []);

  const applyFinalPrice = useCallback((type: "BUY" | "SELL", info: GoldPriceAdmin | null) => {
    if (!info) return;
    const final = type === "BUY" ? Number(info.buy_final_price) : Number(info.sell_final_price);
    if (final > 0) setUnitPrice(formatNumber(String(final)));
  }, []);

  const loadPrices = useCallback(async () => {
    try {
      const info = await adminTradesAPI.getCurrentPrice();
      setPriceInfo(info);
      applyFinalPrice(tradeType, info);
    } catch {
      setPriceInfo(null);
      toast.error("قیمت فعلی دریافت نشد");
    }
  }, [applyFinalPrice, tradeType]);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminTradesAPI.listManualTrades();
      setTrades(data);
    } catch {
      toast.error("خطا در بارگذاری فاکتورهای دستی");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
    loadPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- فقط بار اول
  }, []);

  useEffect(() => {
    applyFinalPrice(tradeType, priceInfo);
  }, [tradeType, priceInfo, applyFinalPrice]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await adminTradesAPI.searchCustomers(toEnglishDigits(q));
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
        toast.error("خطا در جستجوی مشتری");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const pickUser = (u: ManualCustomer) => {
    setSelected(u);
    setPhone(u.phone_number);
    setFirstName(u.first_name || "");
    setLastName(u.last_name || "");
    setNationalId(u.national_id || "");
    setSearchQ("");
    setResults([]);
  };

  const activeBreakdown = useMemo(() => {
    if (!priceInfo) return null;
    if (tradeType === "BUY") {
      return {
        label: "قیمت خرید کاربر",
        base: Number(priceInfo.buy_base_price),
        margin: Number(priceInfo.buy_margin),
        final: Number(priceInfo.buy_final_price),
        formula: "پایه + حاشیه",
      };
    }
    return {
      label: "قیمت فروش کاربر",
      base: Number(priceInfo.sell_base_price),
      margin: Number(priceInfo.sell_margin),
      final: Number(priceInfo.sell_final_price),
      formula: "پایه − حاشیه",
    };
  }, [priceInfo, tradeType]);

  const handleCreate = async () => {
    const amt = Number(toEnglishDigits(amount).replace(/,/g, ""));
    const price = Number(toEnglishDigits(unitPrice).replace(/,/g, ""));
    if (!amt || amt <= 0) return toast.error("مقدار گرم را وارد کنید");
    if (!price || price <= 0) return toast.error("قیمت واحد را وارد کنید");
    if (!selected && !toEnglishDigits(phone)) return toast.error("کاربر را انتخاب یا موبایل وارد کنید");

    setSaving(true);
    try {
      const result = await adminTradesAPI.createManualTrade({
        user_id: selected?.id,
        phone_number: selected ? undefined : toEnglishDigits(phone),
        first_name: firstName,
        last_name: lastName,
        national_id: toEnglishDigits(nationalId),
        trade_type: tradeType,
        amount: amt,
        unit_price: price,
        settlement_mode: settlementMode,
        payment_status: paymentStatus,
        delivery_status: deliveryStatus,
        admin_note: adminNote,
        settlement_note: settlementNote,
      });
      toast.success(result.message);
      setAmount("");
      setAdminNote("");
      setSettlementNote("");
      applyFinalPrice(tradeType, priceInfo);
      await loadTrades();
      setInvoiceTrade(result.trade);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || "خطا در صدور فاکتور");
    } finally {
      setSaving(false);
    }
  };

  const updateSettlement = async (
    trade: Trade,
    patch: { payment_status?: string; delivery_status?: string }
  ) => {
    try {
      const result = await adminTradesAPI.updateManualSettlement(trade.id, patch);
      toast.success(result.message);
      setTrades((prev) => prev.map((t) => (t.id === trade.id ? result.trade : t)));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در به‌روزرسانی");
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadTrades(), loadPrices()]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
            <FilePlus2 className="text-gold-500" />
            فاکتور دستی
          </h1>
          <p className="text-sm text-slate-400">
            ثبت خرید/فروش تلفنی یا حضوری با تأثیر روی سابقه کاربر، کیف و خزانه
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4 overflow-visible">
          <h2 className="font-black text-white flex items-center gap-2">
            <UserPlus size={18} /> انتخاب یا ثبت مشتری
          </h2>

          <div>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-3 text-slate-500" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="جستجو موبایل / نام / نام‌خانوادگی / کد ملی..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-sm"
              />
            </div>

            {searchQ.trim().length >= 2 && (
              <div className="mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {searching ? (
                  <p className="px-3 py-3 text-sm text-slate-400">در حال جستجو...</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-500">
                    نتیجه‌ای یافت نشد — می‌توانید مشتری جدید با موبایل ثبت کنید
                  </p>
                ) : (
                  results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => pickUser(u)}
                      className="w-full text-right px-3 py-2.5 text-sm hover:bg-slate-800 border-b border-slate-800 last:border-0"
                    >
                      <div className="font-bold text-white">{displayName(u)}</div>
                      <div className="text-xs text-slate-400 mt-0.5 dir-ltr text-right">
                        {toPersianDigits(u.phone_number)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-200">
              انتخاب‌شده: {displayName(selected)} — {toPersianDigits(selected.phone_number)}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">موبایل</label>
              <input
                value={toPersianDigits(phone)}
                onChange={(e) => {
                  setPhone(toEnglishDigits(e.target.value));
                  setSelected(null);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 dir-ltr text-center"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">کد ملی (اختیاری)</label>
              <input
                value={toPersianDigits(nationalId)}
                onChange={(e) => setNationalId(toEnglishDigits(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 dir-ltr text-center"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">نام</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">نام خانوادگی</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <h2 className="font-black text-white pt-2">جزئیات معامله</h2>
          <div className="flex gap-2">
            {(
              [
                { id: "BUY" as const, label: "خرید (شرکت می‌فروشد)" },
                { id: "SELL" as const, label: "فروش (شرکت می‌خرد)" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTradeType(t.id)}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold ${
                  tradeType === t.id ? "bg-gold-500 text-white" : "bg-slate-900 text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {priceInfo && activeBreakdown && (
            <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-300">{activeBreakdown.label}</p>
                <button
                  type="button"
                  onClick={loadPrices}
                  className="text-[11px] text-gold-400 hover:text-gold-300 font-bold"
                >
                  تازه‌سازی قیمت
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-slate-800 rounded-lg px-2 py-2">
                  <p className="text-slate-500 mb-1">پایه</p>
                  <p className="font-bold text-slate-200 dir-ltr">
                    {toPersianDigits(activeBreakdown.base.toLocaleString())}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg px-2 py-2">
                  <p className="text-slate-500 mb-1">حاشیه</p>
                  <p className="font-bold text-slate-200 dir-ltr">
                    {toPersianDigits(activeBreakdown.margin.toLocaleString())}
                  </p>
                </div>
                <div className="bg-gold-500/15 border border-gold-500/30 rounded-lg px-2 py-2">
                  <p className="text-gold-400/80 mb-1">نهایی</p>
                  <p className="font-black text-gold-300 dir-ltr">
                    {toPersianDigits(activeBreakdown.final.toLocaleString())}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                {activeBreakdown.formula} = قیمت واحد فاکتور (قابل ویرایش در صورت نیاز)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTradeType("BUY");
                    applyFinalPrice("BUY", priceInfo);
                  }}
                  className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg ${
                    tradeType === "BUY"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  خرید نهایی: {toPersianDigits(Number(priceInfo.buy_final_price).toLocaleString())}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTradeType("SELL");
                    applyFinalPrice("SELL", priceInfo);
                  }}
                  className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg ${
                    tradeType === "SELL"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  فروش نهایی: {toPersianDigits(Number(priceInfo.sell_final_price).toLocaleString())}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">مقدار (گرم)</label>
              <input
                value={amount ? toPersianDigits(amount) : ""}
                onChange={(e) => {
                  let v = toEnglishDigits(e.target.value).replace(/٫/g, ".");
                  v = v.replace(/,/g, "");
                  if (/^\d*\.?\d*$/.test(v)) setAmount(v);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 dir-ltr text-center font-bold"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">قیمت واحد نهایی (ریال)</label>
              <input
                value={unitPrice ? toPersianDigits(unitPrice) : ""}
                onChange={(e) => setUnitPrice(formatNumber(toEnglishDigits(e.target.value)))}
                className="w-full bg-slate-900 border border-gold-500/40 rounded-lg px-3 py-2 dir-ltr text-center font-bold text-gold-300"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">حالت تسویه</label>
            <select
              value={settlementMode}
              onChange={(e) => {
                const m = e.target.value as "WALLET" | "OFFPLATFORM";
                setSettlementMode(m);
                setPaymentStatus(m === "WALLET" ? "PAID_WALLET" : "PAID_OFFPLATFORM");
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="OFFPLATFORM">خارج از سامانه (پیشنهاد تلفنی)</option>
              <option value="WALLET">از کیف پول کاربر</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1 leading-5">
              خارج از سامانه: خرید فقط طلای کیف را زیاد می‌کند؛ فروش طلا کم می‌کند و به خزانه
              می‌رود بدون واریز ریال به کیف.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">وضعیت پرداخت</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="PAID_OFFPLATFORM">پرداخت خارج از سامانه</option>
                <option value="PAID_WALLET">پرداخت از کیف</option>
                <option value="UNPAID">پرداخت‌نشده</option>
                <option value="NOT_APPLICABLE">نامشخص</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">وضعیت تحویل طلا</label>
              <select
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="NOT_APPLICABLE">ندارد</option>
                <option value="PENDING">در انتظار تحویل</option>
                <option value="DELIVERED">تحویل شد</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">یادداشت مدیر</label>
            <input
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
              placeholder="مثلاً تماس تلفنی — پرداخت کارت‌به‌کارت"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">یادداشت تسویه</label>
            <input
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            صدور فاکتور دستی
          </button>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
          <h2 className="font-black text-white flex items-center gap-2">
            <Receipt size={18} /> آخرین فاکتورهای دستی
          </h2>
          {loading ? (
            <p className="text-slate-500 text-sm py-8 text-center">در حال بارگذاری...</p>
          ) : trades.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">هنوز فاکتور دستی ثبت نشده</p>
          ) : (
            <div className="space-y-2 max-h-[40rem] overflow-y-auto">
              {trades.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm space-y-2"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">
                        {t.trade_type === "BUY" ? "خرید" : "فروش"} —{" "}
                        {t.user_name || toPersianDigits(t.user_mobile)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {t.created_at_jalali
                          ? toPersianDigits(t.created_at_jalali)
                          : "—"}{" "}
                        — {toPersianDigits(t.invoice_number)}
                      </p>
                    </div>
                    <div className="text-left font-bold text-gold-400">
                      {toPersianDigits(Number(t.amount).toFixed(3))} گرم
                      <div className="text-xs text-slate-400 font-normal">
                        {toPersianDigits(Number(t.total).toLocaleString())} ریال
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-slate-800 px-2 py-1 rounded-lg text-slate-300">
                      {t.settlement_mode_display}
                    </span>
                    <span className="bg-slate-800 px-2 py-1 rounded-lg text-slate-300">
                      {t.payment_status_display}
                    </span>
                    <span className="bg-slate-800 px-2 py-1 rounded-lg text-slate-300">
                      {t.delivery_status_display}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={t.payment_status}
                      onChange={(e) =>
                        updateSettlement(t, { payment_status: e.target.value })
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="PAID_OFFPLATFORM">پرداخت خارج</option>
                      <option value="PAID_WALLET">پرداخت کیف</option>
                      <option value="UNPAID">پرداخت‌نشده</option>
                      <option value="NOT_APPLICABLE">نامشخص</option>
                    </select>
                    <select
                      value={t.delivery_status}
                      onChange={(e) =>
                        updateSettlement(t, { delivery_status: e.target.value })
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="NOT_APPLICABLE">تحویل: ندارد</option>
                      <option value="PENDING">در انتظار تحویل</option>
                      <option value="DELIVERED">تحویل شد</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setInvoiceTrade(t)}
                      className="px-2 py-1 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-xs font-bold"
                    >
                      فاکتور
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <InvoiceModal
        data={invoiceTrade}
        isOpen={!!invoiceTrade}
        onClose={() => setInvoiceTrade(null)}
        isAdmin
      />
    </div>
  );
}
