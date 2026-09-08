"use client";

import { useEffect, useState } from "react";
import { FileText, Save, RefreshCw, ImagePlus, Trash2, Stamp } from "lucide-react";
import toast from "react-hot-toast";
import { systemSettingsAPI, SystemSettings } from "@/lib/api/auth";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";

export default function InvoiceIssuerSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoice_brand_name: "",
    invoice_company_name: "",
    invoice_national_id: "",
    invoice_address: "",
    invoice_phone: "",
    invoice_tagline: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [clearStamp, setClearStamp] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const s = await systemSettingsAPI.getSettings();
      setForm({
        invoice_brand_name: s.invoice_brand_name || "",
        invoice_company_name: s.invoice_company_name || "",
        invoice_national_id: s.invoice_national_id || "",
        invoice_address: s.invoice_address || "",
        invoice_phone: s.invoice_phone || "",
        invoice_tagline: s.invoice_tagline || "",
      });
      setLogoUrl(s.invoice_logo_url || null);
      setLogoFile(null);
      setClearLogo(false);
      setStampUrl(s.invoice_stamp_url || null);
      setStampFile(null);
      setClearStamp(false);
    } catch {
      toast.error("خطا در دریافت مشخصات فاکتور");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await systemSettingsAPI.updateInvoiceIssuer({
        ...form,
        invoice_national_id: toEnglishDigits(form.invoice_national_id),
        invoice_phone: toEnglishDigits(form.invoice_phone),
        invoice_logo: logoFile,
        clear_invoice_logo: clearLogo && !logoFile,
        invoice_stamp: stampFile,
        clear_invoice_stamp: clearStamp && !stampFile,
      });
      const s = result.settings as SystemSettings;
      setLogoUrl(s.invoice_logo_url || null);
      setLogoFile(null);
      setClearLogo(false);
      setStampUrl(s.invoice_stamp_url || null);
      setStampFile(null);
      setClearStamp(false);
      toast.success(result.message || "مشخصات فاکتور ذخیره شد");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "خطا در ذخیره مشخصات فاکتور");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <RefreshCw className="animate-spin" size={18} />
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-200 leading-7">
        این مشخصات روی پیش‌نمایش و PDF فاکتور خرید/فروش و فاکتور تحویل طلا نمایش داده می‌شود. اگر
        فیلدی خالی بماند، از نام برند پیش‌فرض استقرار استفاده می‌شود.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            ["invoice_brand_name", "نام تجاری"],
            ["invoice_company_name", "نام حقوقی"],
            ["invoice_national_id", "شناسه ملی / کد اقتصادی"],
            ["invoice_phone", "تلفن روی فاکتور"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="text-xs text-slate-400 mb-1 block">{label}</label>
            <input
              value={
                key === "invoice_national_id" || key === "invoice_phone"
                  ? toPersianDigits(form[key])
                  : form[key]
              }
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [key]:
                    key === "invoice_national_id" || key === "invoice_phone"
                      ? toEnglishDigits(e.target.value)
                      : e.target.value,
                }))
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">شعار کوتاه</label>
        <input
          value={form.invoice_tagline}
          onChange={(e) => setForm((p) => ({ ...p, invoice_tagline: e.target.value }))}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
          placeholder="مثلاً سامانه هوشمند معاملات طلا"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">آدرس روی فاکتور</label>
        <textarea
          value={form.invoice_address}
          onChange={(e) => setForm((p) => ({ ...p, invoice_address: e.target.value }))}
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
        />
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <FileText size={16} /> لوگوی فاکتور
        </p>
        {(logoFile || logoUrl) && !clearLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoFile ? URL.createObjectURL(logoFile) : logoUrl || ""}
            alt="لوگو"
            className="h-16 w-auto object-contain bg-white rounded-lg p-2"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer">
            <ImagePlus size={14} />
            انتخاب تصویر
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setLogoFile(f);
                setClearLogo(false);
              }}
            />
          </label>
          {(logoUrl || logoFile) && (
            <button
              type="button"
              onClick={() => {
                setLogoFile(null);
                setClearLogo(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-300 rounded-xl text-xs font-bold"
            >
              <Trash2 size={14} /> حذف لوگو
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <Stamp size={16} /> مهر رسمی / امضای دیجیتال
        </p>
        <p className="text-[11px] text-slate-400 leading-6">
          تصویر PNG یا JPG شفاف ترجیحاً؛ در بخش «مهر و امضای فروشنده» روی PDF و پیش‌نمایش فاکتور
          نمایش داده می‌شود.
        </p>
        {(stampFile || stampUrl) && !clearStamp && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stampFile ? URL.createObjectURL(stampFile) : stampUrl || ""}
            alt="مهر / امضا"
            className="h-20 w-auto object-contain bg-white rounded-lg p-2"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer">
            <ImagePlus size={14} />
            آپلود مهر / امضا
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setStampFile(f);
                setClearStamp(false);
              }}
            />
          </label>
          {(stampUrl || stampFile) && (
            <button
              type="button"
              onClick={() => {
                setStampFile(null);
                setClearStamp(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-300 rounded-xl text-xs font-bold"
            >
              <Trash2 size={14} /> حذف مهر / امضا
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 rounded-xl text-sm font-bold text-white"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        ذخیره مشخصات فاکتور
      </button>
    </div>
  );
}
