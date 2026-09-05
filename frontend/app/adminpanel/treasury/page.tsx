"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Scale,
  Landmark,
  BookOpen,
  Users,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Save,
  Plus,
  Minus,
  Equal,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import {
  adminTreasuryAPI,
  CoverageSnapshot,
  VaultMovement,
  JournalRow,
  GoldDebtor,
  OpenWithdrawal,
} from "@/lib/api/treasury";

type TabId = "overview" | "vault" | "parties" | "journal" | "alerts" | "guide";

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [coverage, setCoverage] = useState<CoverageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<VaultMovement[]>([]);
  const [journal, setJournal] = useState<JournalRow[]>([]);
  const [debtors, setDebtors] = useState<GoldDebtor[]>([]);
  const [openWithdrawals, setOpenWithdrawals] = useState<OpenWithdrawal[]>([]);
  const [partiesTotals, setPartiesTotals] = useState<{
    total_customer_gold: string;
    total_pending_gold_delivery: string;
    open_rial_withdrawals: string;
  } | null>(null);

  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [amount, setAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [note, setNote] = useState("");
  const [savingMovement, setSavingMovement] = useState(false);

  const [warningRatio, setWarningRatio] = useState("98");
  const [criticalRatio, setCriticalRatio] = useState("100");
  const [autoBlock, setAutoBlock] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [journalAsset, setJournalAsset] = useState("");
  const [journalEvent, setJournalEvent] = useState("");
  const [journalSearch, setJournalSearch] = useState("");

  useEffect(() => {
    document.title = "خزانه و حسابرسی | پنل مدیریت";
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminTreasuryAPI.getOverview();
      setCoverage(data);
      setWarningRatio(String(Math.round(Number(data.warning_cover_ratio) * 100)));
      setCriticalRatio(String(Math.round(Number(data.critical_cover_ratio) * 100)));
      setAutoBlock(data.auto_block_user_buy);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در دریافت وضعیت خزانه");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVault = useCallback(async () => {
    try {
      const [ov, mv] = await Promise.all([
        adminTreasuryAPI.getOverview(),
        adminTreasuryAPI.listVaultMovements(),
      ]);
      setCoverage(ov);
      setMovements(mv);
    } catch {
      toast.error("خطا در بارگذاری حرکت‌های خزانه");
    }
  }, []);

  const loadParties = useCallback(async () => {
    try {
      const data = await adminTreasuryAPI.getParties();
      setDebtors(data.gold_debtors);
      setOpenWithdrawals(data.open_withdrawals);
      setPartiesTotals(data.totals);
      setCoverage(data.coverage);
    } catch {
      toast.error("خطا در بارگذاری بدهکاران و بستانکاران");
    }
  }, []);

  const loadJournal = useCallback(async () => {
    try {
      const rows = await adminTreasuryAPI.listJournal({
        asset: journalAsset || undefined,
        event_type: journalEvent || undefined,
        search: journalSearch || undefined,
      });
      setJournal(rows);
    } catch {
      toast.error("خطا در بارگذاری دفتر عملیات");
    }
  }, [journalAsset, journalEvent, journalSearch]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activeTab === "vault") loadVault();
    if (activeTab === "parties") loadParties();
    if (activeTab === "journal") loadJournal();
    if (activeTab === "overview" || activeTab === "alerts") loadOverview();
  }, [activeTab, loadVault, loadParties, loadJournal, loadOverview]);

  const handleCreateMovement = async () => {
    const amt = Number(toEnglishDigits(amount));
    if (!amt || (movementType !== "ADJUST" && amt <= 0)) {
      return toast.error("مقدار را به‌درستی وارد کنید");
    }
    if (movementType === "ADJUST" && !note.trim()) {
      return toast.error("برای تعدیل، نوشتن دلیل الزامی است");
    }
    setSavingMovement(true);
    try {
      const result = await adminTreasuryAPI.createVaultMovement({
        movement_type: movementType,
        amount: amt,
        unit_price: Number(toEnglishDigits(unitPrice) || "0"),
        counterparty,
        note,
      });
      toast.success(result.message);
      setAmount("");
      setUnitPrice("");
      setCounterparty("");
      setNote("");
      setCoverage(result.coverage);
      await loadVault();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; amount?: string[] } } };
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.amount?.[0] ||
          "خطا در ثبت حرکت خزانه"
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const handleSaveAlerts = async () => {
    const w = Number(toEnglishDigits(warningRatio)) / 100;
    const c = Number(toEnglishDigits(criticalRatio)) / 100;
    if (!(w > 0) || !(c > 0)) return toast.error("آستانه‌ها نامعتبر است");
    if (w < c) return toast.error("آستانه هشدار باید بزرگ‌تر یا مساوی آستانه بحرانی باشد");
    setSavingSettings(true);
    try {
      const result = await adminTreasuryAPI.updateSettings({
        warning_cover_ratio: w,
        critical_cover_ratio: c,
        auto_block_user_buy: autoBlock,
      });
      toast.success(result.message);
      setCoverage(result.coverage);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; warning_cover_ratio?: string[] } } };
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.warning_cover_ratio?.[0] ||
          "خطا در ذخیره تنظیمات"
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs: { id: TabId; name: string; icon: typeof Scale }[] = [
    { id: "overview", name: "نمای کلی", icon: Scale },
    { id: "vault", name: "ورود و خروج خزانه", icon: Landmark },
    { id: "parties", name: "بدهکاران و بستانکاران", icon: Users },
    { id: "journal", name: "دفتر عملیات", icon: BookOpen },
    { id: "alerts", name: "هشدار و توقف", icon: AlertTriangle },
    { id: "guide", name: "راهنما", icon: HelpCircle },
  ];

  const statusColor =
    coverage?.status === "critical"
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : coverage?.status === "warning"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
            <Scale className="text-gold-500" />
            خزانه و حسابرسی
          </h1>
          <p className="text-sm text-slate-400">
            موجودی طلای شرکت، بدهی به مشتریان، دفتر عملیات و هشدار کمبود
          </p>
        </div>
        <button
          onClick={() => {
            loadOverview();
            if (activeTab === "vault") loadVault();
            if (activeTab === "parties") loadParties();
            if (activeTab === "journal") loadJournal();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-2">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
                    active
                      ? "bg-gold-500 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-4 md:p-6"
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              {coverage && (
                <div className={`rounded-2xl border p-4 ${statusColor}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-black text-lg">وضعیت پوشش: {coverage.status_label}</span>
                    {coverage.buy_blocked ? (
                      <span className="text-xs font-bold bg-red-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                        <XCircle size={12} /> خرید کاربران متوقف است
                      </span>
                    ) : (
                      <span className="text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={12} /> خرید کاربران باز است
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-2 leading-7 opacity-90">
                    نسبت پوشش{" "}
                    {toPersianDigits(Number(coverage.cover_percent).toLocaleString())}٪ — موجودی
                    شرکت باید حداقل برابر بدهی طلا به مشتریان به‌علاوه طلای در انتظار تحویل باشد.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: "موجودی طلای شرکت",
                    value: coverage
                      ? `${toPersianDigits(Number(coverage.company_gold_balance).toFixed(3))} گرم`
                      : "—",
                  },
                  {
                    title: "بدهی طلا به مشتریان",
                    value: coverage
                      ? `${toPersianDigits(Number(coverage.customer_gold_liability).toFixed(3))} گرم`
                      : "—",
                  },
                  {
                    title: "در انتظار تحویل حضوری",
                    value: coverage
                      ? `${toPersianDigits(Number(coverage.pending_gold_delivery).toFixed(3))} گرم`
                      : "—",
                  },
                  {
                    title: "تعهد کل طلا",
                    value: coverage
                      ? `${toPersianDigits(Number(coverage.obligated_gold).toFixed(3))} گرم`
                      : "—",
                  },
                  {
                    title: "کسری پوشش",
                    value: coverage
                      ? `${toPersianDigits(Number(coverage.shortfall_gold).toFixed(3))} گرم`
                      : "—",
                  },
                  {
                    title: "میانگین قیمت تمام‌شده",
                    value: coverage
                      ? `${toPersianDigits(Number(coverage.avg_cost_per_gram).toLocaleString())} ریال`
                      : "—",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-4"
                  >
                    <p className="text-xs text-slate-400 mb-2">{card.title}</p>
                    <p className="text-lg font-black text-white">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-200 leading-7 flex gap-3">
                <Info size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">شروع کار با خزانه</p>
                  <p>
                    اگر تازه این بخش را فعال کرده‌اید، از تب «ورود و خروج خزانه» موجودی فیزیکی
                    واقعی طلای شرکت را ثبت کنید. سپس از تب «راهنما» معادله پوشش را بخوانید. برای
                    ثبت مانده فعلی کاربران در دفتر، روی سرور دستور راه‌اندازی یک‌بار اجرا می‌شود.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "vault" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
                <h3 className="font-black text-white">ثبت حرکت خزانه</h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "IN" as const, label: "ورود به خزانه", icon: Plus },
                      { id: "OUT" as const, label: "خروج از خزانه", icon: Minus },
                      { id: "ADJUST" as const, label: "تعدیل", icon: Equal },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMovementType(t.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                        movementType === t.id
                          ? "bg-gold-500 text-white"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <t.icon size={14} />
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 leading-6">
                  {movementType === "IN" &&
                    "خرید عمده از بازار یا تأمین‌کننده — موجودی شرکت افزایش می‌یابد و میانگین قیمت تمام‌شده به‌روز می‌شود."}
                  {movementType === "OUT" &&
                    "خروج فیزیکی غیر از تحویل کاربر (مثلاً فروش عمده) — موجودی شرکت کاهش می‌یابد."}
                  {movementType === "ADJUST" &&
                    "فقط برای اصلاح اختلاف شمارش فیزیکی. نوشتن دلیل اجباری است. مقدار می‌تواند مثبت یا منفی باشد."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">مقدار (گرم)</label>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white dir-ltr text-right"
                      placeholder="مثلاً ۱۰.۵۰۰"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      قیمت واحد (ریال بر گرم)
                    </label>
                    <input
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(toEnglishDigits(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white dir-ltr text-right"
                      placeholder="برای ورود توصیه می‌شود"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">طرف معامله / تأمین‌کننده</label>
                    <input
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      یادداشت {movementType === "ADJUST" ? "(الزامی)" : "(اختیاری)"}
                    </label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateMovement}
                  disabled={savingMovement}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white"
                >
                  {savingMovement ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  ثبت حرکت
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-300 text-sm">آخرین حرکت‌ها</h3>
                {movements.length === 0 ? (
                  <p className="text-slate-500 text-sm py-6 text-center">هنوز حرکتی ثبت نشده است</p>
                ) : (
                  movements.map((m) => (
                    <div
                      key={m.id}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-bold text-white">{m.movement_type_display}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {m.created_at_jalali
                            ? toPersianDigits(m.created_at_jalali)
                            : "—"}{" "}
                          {m.created_by_name ? `— ${m.created_by_name}` : ""}
                        </p>
                        {m.note && <p className="text-xs text-slate-500 mt-1">{m.note}</p>}
                      </div>
                      <div className="text-left dir-ltr font-mono text-gold-400 font-bold">
                        {toPersianDigits(Number(m.amount).toFixed(3))} g
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "parties" && (
            <div className="space-y-8">
              {partiesTotals && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">جمع بدهی طلا</p>
                    <p className="font-black text-white">
                      {toPersianDigits(Number(partiesTotals.total_customer_gold).toFixed(3))} گرم
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">در انتظار تحویل</p>
                    <p className="font-black text-white">
                      {toPersianDigits(
                        Number(partiesTotals.total_pending_gold_delivery).toFixed(3)
                      )}{" "}
                      گرم
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">برداشت ریال باز</p>
                    <p className="font-black text-white">
                      {toPersianDigits(
                        Number(partiesTotals.open_rial_withdrawals).toLocaleString()
                      )}{" "}
                      ریال
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-black text-white mb-3">بدهکاران طلا (موجودی کیف کاربران)</h3>
                <p className="text-xs text-slate-400 mb-3 leading-6">
                  شرکت به این کاربران طلا بدهکار است. این عدد باید با موجودی فیزیکی خزانه پوشش داده
                  شود.
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {debtors.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">بدهکار طلایی نیست</p>
                  ) : (
                    debtors.map((d) => (
                      <div
                        key={d.user_id}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {d.full_name || toPersianDigits(d.phone_number)}
                          </p>
                          <p className="text-xs text-slate-400 dir-ltr text-right">
                            {toPersianDigits(d.phone_number)}
                            {d.account_code
                              ? ` — کد ${toPersianDigits(d.account_code)}`
                              : ""}
                          </p>
                        </div>
                        <p className="font-black text-gold-400 shrink-0">
                          {toPersianDigits(Number(d.gold_balance).toFixed(3))} گرم
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-black text-white mb-3">برداشت‌های باز (طلب کاربران)</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {openWithdrawals.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">برداشت بازی نیست</p>
                  ) : (
                    openWithdrawals.map((w) => (
                      <div
                        key={w.id}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {w.withdrawal_type_display} — {w.status_display}
                          </p>
                          <p className="text-xs text-slate-400">
                            {w.full_name || toPersianDigits(w.phone_number)} —{" "}
                            <span className="font-mono dir-ltr">{w.request_code}</span>
                          </p>
                        </div>
                        <p className="font-black text-white shrink-0">
                          {w.withdrawal_type === "GOLD"
                            ? `${toPersianDigits(Number(w.amount).toFixed(3))} گرم`
                            : `${toPersianDigits(Number(w.amount).toLocaleString())} ریال`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "journal" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <select
                  value={journalAsset}
                  onChange={(e) => setJournalAsset(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">همه دارایی‌ها</option>
                  <option value="GOLD">طلا</option>
                  <option value="RIAL">ریال</option>
                </select>
                <select
                  value={journalEvent}
                  onChange={(e) => setJournalEvent(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">همه رویدادها</option>
                  <option value="OPENING">مانده افتتاحیه</option>
                  <option value="DEPOSIT">واریز ریال</option>
                  <option value="BUY">خرید کاربر</option>
                  <option value="SELL">فروش کاربر</option>
                  <option value="WITHDRAW_RIAL">برداشت ریال</option>
                  <option value="GOLD_DELIVERY">تحویل طلا</option>
                  <option value="VAULT_IN">ورود خزانه</option>
                  <option value="VAULT_OUT">خروج خزانه</option>
                  <option value="ADJUSTMENT">تعدیل</option>
                </select>
                <input
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  placeholder="جستجو نام یا موبایل یا یادداشت..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={loadJournal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold"
                >
                  اعمال فیلتر
                </button>
              </div>
              <p className="text-xs text-slate-500">دفتر فقط خواندنی است و قابل ویرایش یا حذف نیست.</p>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                {journal.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">ردیفی یافت نشد</p>
                ) : (
                  journal.map((row) => (
                    <div
                      key={row.id}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">
                            {row.event_type_display}{" "}
                            <span className="text-slate-400 font-medium">({row.asset_display})</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {row.created_at_jalali
                              ? toPersianDigits(row.created_at_jalali)
                              : "—"}
                            {row.user_name || row.user_phone
                              ? ` — ${row.user_name || toPersianDigits(row.user_phone || "")}`
                              : ""}
                          </p>
                          {row.note && (
                            <p className="text-xs text-slate-500 mt-1">{row.note}</p>
                          )}
                        </div>
                        <p
                          className={`font-black shrink-0 ${
                            Number(row.amount) >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {toPersianDigits(Number(row.amount).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          }))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="space-y-6 max-w-xl">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-100 leading-7">
                اگر نسبت پوشش از آستانه بحرانی کمتر شود و «توقف خودکار خرید» روشن باشد، کاربران
                دیگر نمی‌توانند طلا بخرند. فروش طلا توسط کاربر باز می‌ماند تا شرکت طلا بگیرد و
                پوشش بهتر شود.
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">آستانه هشدار (درصد)</label>
                <input
                  value={warningRatio}
                  onChange={(e) => setWarningRatio(toEnglishDigits(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">پیشنهاد: ۹۸</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">آستانه بحرانی (درصد)</label>
                <input
                  value={criticalRatio}
                  onChange={(e) => setCriticalRatio(toEnglishDigits(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">پیشنهاد: ۱۰۰</p>
              </div>
              <label className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 cursor-pointer">
                <span className="text-sm font-bold text-slate-200">توقف خودکار خرید در کمبود</span>
                <input
                  type="checkbox"
                  checked={autoBlock}
                  onChange={(e) => setAutoBlock(e.target.checked)}
                  className="w-5 h-5 rounded text-gold-500"
                />
              </label>
              <button
                onClick={handleSaveAlerts}
                disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white"
              >
                {savingSettings ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                ذخیره تنظیمات هشدار
              </button>
            </div>
          )}

          {activeTab === "guide" && (
            <div className="prose prose-invert max-w-none space-y-6 text-slate-300 text-sm leading-8">
              <section>
                <h3 className="text-white font-black text-lg mb-2">این بخش چیست؟</h3>
                <p>
                  «خزانه و حسابرسی» وضعیت واقعی طلای فیزیکی شرکت را از بدهی طلا به مشتریان جدا
                  نگه می‌دارد. کیف پول کاربران فقط نشان می‌دهد شرکت به آن‌ها چقدر طلا بدهکار است؛
                  موجودی فیزیکی باید جداگانه در خزانه ثبت شود.
                </p>
              </section>
              <section>
                <h3 className="text-white font-black text-lg mb-2">معادله پوشش</h3>
                <p className="bg-slate-900 border border-slate-700 rounded-xl p-4 font-bold text-gold-300">
                  موجودی طلای شرکت ≥ بدهی طلا به مشتریان + طلای در انتظار تحویل حضوری
                </p>
              </section>
              <section>
                <h3 className="text-white font-black text-lg mb-2">چه زمانی خرید متوقف می‌شود؟</h3>
                <p>
                  وقتی نسبت پوشش از آستانه بحرانی کمتر شود و توقف خودکار روشن باشد. پیام کاربر:
                  «به‌دلیل کمبود موجودی طلای شرکت، خرید موقتاً غیرفعال است.» فروش کاربر و واریز
                  ریال متوقف نمی‌شود.
                </p>
              </section>
              <section>
                <h3 className="text-white font-black text-lg mb-2">
                  تفاوت ورود به خزانه با خرید کاربر
                </h3>
                <ul className="list-disc pr-5 space-y-2">
                  <li>
                    <strong className="text-white">ورود به خزانه:</strong> طلای فیزیکی واقعی وارد
                    انبار/صندوق شرکت می‌شود (خرید عمده از بازار).
                  </li>
                  <li>
                    <strong className="text-white">خرید کاربر:</strong> فقط بدهی طلای شرکت به کاربر
                    زیاد می‌شود؛ طلای فیزیکی کم نمی‌شود تا زمان تحویل حضوری.
                  </li>
                  <li>
                    <strong className="text-white">فروش کاربر:</strong> بدهی طلا کم می‌شود و همان
                    طلا وارد خزانه شرکت می‌گردد.
                  </li>
                  <li>
                    <strong className="text-white">تحویل حضوری:</strong> طلا از خزانه فیزیکی خارج
                    می‌شود.
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="text-white font-black text-lg mb-2">راه‌اندازی اولیه روی سرور</h3>
                <p>
                  پس از استقرار، یک‌بار دستور ثبت مانده افتتاحیه کیف‌ها را اجرا کنید و سپس موجودی
                  واقعی خزانه را از تب «ورود و خروج خزانه» وارد کنید. بدون ثبت موجودی اولیه، پوشش
                  ممکن است بحرانی نشان داده شود.
                </p>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
