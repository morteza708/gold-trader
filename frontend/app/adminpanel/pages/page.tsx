"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Save,
  Loader2,
  ImagePlus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { pagesAPI, SitePage, SitePageSlug } from "@/lib/api/pages";
import { IMAGE_FILE_ACCEPT, prepareImageForUpload } from "@/lib/utils/imageUpload";

const emptyForm = {
  title: "",
  subtitle: "",
  body: "",
  section_one_title: "",
  section_one_body: "",
  section_two_title: "",
  section_two_body: "",
  address: "",
  phone: "",
  email: "",
  is_published: true,
};

export default function AdminSitePagesPage() {
  const [activeSlug, setActiveSlug] = useState<SitePageSlug>("about");
  const [page, setPage] = useState<SitePage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [clearHero, setClearHero] = useState(false);
  const [clearExtra, setClearExtra] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [extraPreview, setExtraPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "صفحات سایت | پنل مدیریت";
  }, []);

  useEffect(() => {
    loadPage(activeSlug);
  }, [activeSlug]);

  useEffect(() => {
    return () => {
      if (heroPreview?.startsWith("blob:")) URL.revokeObjectURL(heroPreview);
      if (extraPreview?.startsWith("blob:")) URL.revokeObjectURL(extraPreview);
    };
  }, [heroPreview, extraPreview]);

  const loadPage = async (slug: SitePageSlug) => {
    setLoading(true);
    setHeroFile(null);
    setExtraFile(null);
    setClearHero(false);
    setClearExtra(false);
    setHeroPreview(null);
    setExtraPreview(null);
    try {
      const data = await pagesAPI.getAdmin(slug);
      setPage(data);
      setForm({
        title: data.title || "",
        subtitle: data.subtitle || "",
        body: data.body || "",
        section_one_title: data.section_one_title || "",
        section_one_body: data.section_one_body || "",
        section_two_title: data.section_two_title || "",
        section_two_body: data.section_two_body || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        is_published: data.is_published,
      });
      setHeroPreview(data.hero_image_url);
      setExtraPreview(data.extra_image_url);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "خطا در بارگذاری صفحه");
      setPage(null);
    } finally {
      setLoading(false);
    }
  };

  const onHeroChange = (file: File | null) => {
    setHeroFile(file);
    setClearHero(false);
    if (file) {
      setHeroPreview(URL.createObjectURL(file));
    } else {
      setHeroPreview(page?.hero_image_url || null);
    }
  };

  const onExtraChange = (file: File | null) => {
    setExtraFile(file);
    setClearExtra(false);
    if (file) {
      setExtraPreview(URL.createObjectURL(file));
    } else {
      setExtraPreview(page?.extra_image_url || null);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("عنوان صفحه الزامی است");
      return;
    }
    setSaving(true);
    try {
      const result = await pagesAPI.updateAdmin(activeSlug, {
        ...form,
        hero_image: heroFile,
        extra_image: extraFile,
        clear_hero_image: clearHero,
        clear_extra_image: clearExtra,
      });
      toast.success(result.message || "ذخیره شد");
      setPage(result.page);
      setHeroFile(null);
      setExtraFile(null);
      setClearHero(false);
      setClearExtra(false);
      setHeroPreview(result.page.hero_image_url);
      setExtraPreview(result.page.extra_image_url);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "خطا در ذخیره صفحه");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-gold-500";
  const labelClass = "block text-xs font-bold text-slate-400 mb-2";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <FileText className="text-gold-500" size={24} />
            صفحات سایت
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            مدیریت محتوای «درباره ما» و «تماس با ما» (متن و تصویر)
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white font-bold text-sm px-5 py-3 rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          ذخیره تغییرات
        </button>
      </div>

      <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
        {(
          [
            { slug: "about" as const, label: "درباره ما" },
            { slug: "contact" as const, label: "تماس با ما" },
          ]
        ).map((tab) => (
          <button
            key={tab.slug}
            onClick={() => setActiveSlug(tab.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeSlug === tab.slug
                ? "bg-gold-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <div className="space-y-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400">وضعیت انتشار</span>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, is_published: !prev.is_published }))
              }
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                form.is_published
                  ? "border-emerald-700 text-emerald-400 bg-emerald-950/40"
                  : "border-slate-700 text-slate-400 bg-slate-900"
              }`}
            >
              {form.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
              {form.is_published ? "منتشر شده" : "پیش‌نویس (مخفی از سایت)"}
            </button>
          </div>

          <div>
            <label className={labelClass}>عنوان</label>
            <input
              className={fieldClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>زیرعنوان</label>
            <textarea
              className={`${fieldClass} min-h-[88px] resize-y`}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>متن اصلی</label>
            <textarea
              className={`${fieldClass} min-h-[120px] resize-y`}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>

          {activeSlug === "about" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className={labelClass}>عنوان بخش ۱</label>
                <input
                  className={fieldClass}
                  value={form.section_one_title}
                  onChange={(e) =>
                    setForm({ ...form, section_one_title: e.target.value })
                  }
                />
                <label className={labelClass}>متن بخش ۱</label>
                <textarea
                  className={`${fieldClass} min-h-[100px] resize-y`}
                  value={form.section_one_body}
                  onChange={(e) =>
                    setForm({ ...form, section_one_body: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className={labelClass}>عنوان بخش ۲</label>
                <input
                  className={fieldClass}
                  value={form.section_two_title}
                  onChange={(e) =>
                    setForm({ ...form, section_two_title: e.target.value })
                  }
                />
                <label className={labelClass}>متن بخش ۲</label>
                <textarea
                  className={`${fieldClass} min-h-[100px] resize-y`}
                  value={form.section_two_body}
                  onChange={(e) =>
                    setForm({ ...form, section_two_body: e.target.value })
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>آدرس</label>
              <textarea
                className={`${fieldClass} min-h-[80px] resize-y`}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>تلفن</label>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>ایمیل</label>
              <input
                className={fieldClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageField
              label="تصویر اصلی"
              preview={clearHero ? null : heroPreview}
              onChange={onHeroChange}
              onClear={() => {
                setHeroFile(null);
                setClearHero(true);
                setHeroPreview(null);
              }}
            />
            <ImageField
              label="تصویر ثانویه (مثلاً نقشه)"
              preview={clearExtra ? null : extraPreview}
              onChange={onExtraChange}
              onClear={() => {
                setExtraFile(null);
                setClearExtra(true);
                setExtraPreview(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ImageField({
  label,
  preview,
  onChange,
  onClear,
}: {
  label: string;
  preview: string | null;
  onChange: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 mb-2">{label}</label>
      <div className="border border-dashed border-slate-700 rounded-xl p-4 bg-slate-900/50">
        {preview ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden mb-3 border border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-2 mb-3">
            <ImagePlus size={28} />
            <span className="text-xs">تصویری انتخاب نشده</span>
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer text-center text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition-colors">
            انتخاب فایل
            <input
              type="file"
              accept={IMAGE_FILE_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0] || null;
                if (!file) {
                  onChange(null);
                  return;
                }
                const prepared = await prepareImageForUpload(file, "page");
                if (!prepared.ok || !prepared.file) {
                  toast.error(prepared.message || "فایل نامعتبر است");
                  e.target.value = "";
                  return;
                }
                onChange(prepared.file);
              }}
            />
          </label>
          {preview ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40"
            >
              <Trash2 size={14} />
              حذف
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
