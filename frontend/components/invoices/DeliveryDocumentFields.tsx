"use client";

import { toEnglishDigits } from "@/lib/utils/numberUtils";

export type DeliveryFormState = {
  actual_karat: string;
  physical_weight: string;
  packet_code: string;
  seri: string;
  lab_name: string;
  notes: string;
  difference_rial: string;
  difference_method: "" | "CASH" | "CARD" | "OTHER";
};

export const emptyDeliveryForm = (): DeliveryFormState => ({
  actual_karat: "",
  physical_weight: "",
  packet_code: "",
  seri: "",
  lab_name: "",
  notes: "",
  difference_rial: "",
  difference_method: "",
});

export function deliveryFormFromApi(data: {
  delivery_actual_karat?: string | number | null;
  delivery_physical_weight?: string | number | null;
  delivery_packet_code?: string | null;
  delivery_seri?: string | null;
  delivery_lab_name?: string | null;
  delivery_notes?: string | null;
  delivery_difference_rial?: string | number | null;
  delivery_difference_method?: string | null;
}): DeliveryFormState {
  return {
    actual_karat: data.delivery_actual_karat != null ? String(data.delivery_actual_karat) : "",
    physical_weight:
      data.delivery_physical_weight != null ? String(data.delivery_physical_weight) : "",
    packet_code: data.delivery_packet_code || "",
    seri: data.delivery_seri || "",
    lab_name: data.delivery_lab_name || "",
    notes: data.delivery_notes || "",
    difference_rial:
      data.delivery_difference_rial != null && String(data.delivery_difference_rial) !== "0"
        ? String(data.delivery_difference_rial)
        : "",
    difference_method: (data.delivery_difference_method as DeliveryFormState["difference_method"]) || "",
  };
}

export function deliveryFormToPayload(form: DeliveryFormState) {
  return {
    actual_karat: form.actual_karat ? toEnglishDigits(form.actual_karat) : "",
    physical_weight: form.physical_weight ? toEnglishDigits(form.physical_weight) : "",
    packet_code: form.packet_code.trim(),
    seri: form.seri.trim().toUpperCase(),
    lab_name: form.lab_name.trim(),
    notes: form.notes.trim(),
    difference_rial: form.difference_rial ? toEnglishDigits(form.difference_rial) : "0",
    difference_method: form.difference_method || "",
  };
}

type Props = {
  value: DeliveryFormState;
  onChange: (next: DeliveryFormState) => void;
  disabled?: boolean;
  variant?: "light" | "dark";
  title?: string;
};

export default function DeliveryDocumentFields({
  value,
  onChange,
  disabled = false,
  variant = "dark",
  title = "مشخصات تحویل فیزیکی",
}: Props) {
  const isDark = variant === "dark";
  const label = isDark ? "text-slate-400" : "text-gray-500";
  const input = isDark
    ? "bg-slate-900 border-slate-700 text-white focus:border-gold-500"
    : "bg-white border-gray-200 text-gray-900 focus:border-gold-400";
  const box = isDark
    ? "border-slate-700 bg-slate-900/50"
    : "border-gray-100 bg-gray-50";

  const set = (patch: Partial<DeliveryFormState>) => onChange({ ...value, ...patch });

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${box}`}>
      <p className={`text-sm font-black ${isDark ? "text-white" : "text-gray-800"}`}>{title}</p>
      <p className={`text-[11px] leading-6 ${label}`}>
        وزن دفتر بر اساس معادل عیار ۷۵۰ است. عیار واقعی، پاکت و مابه‌التفاوت فقط برای شفافیت تحویل ثبت می‌شوند.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs mb-1 ${label}`}>عیار واقعی</label>
          <input
            disabled={disabled}
            value={value.actual_karat}
            onChange={(e) => set({ actual_karat: toEnglishDigits(e.target.value) })}
            placeholder="مثلاً ۷۴۷"
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none dir-ltr text-right ${input}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${label}`}>وزن فیزیکی (گرم)</label>
          <input
            disabled={disabled}
            value={value.physical_weight}
            onChange={(e) => set({ physical_weight: toEnglishDigits(e.target.value) })}
            placeholder="مثلاً ۶.۲۲۰"
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none dir-ltr text-right ${input}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${label}`}>کد ریگیری / پاکت</label>
          <input
            disabled={disabled}
            value={value.packet_code}
            onChange={(e) => set({ packet_code: toEnglishDigits(e.target.value) })}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none dir-ltr text-right ${input}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${label}`}>سری (A–Z)</label>
          <input
            disabled={disabled}
            maxLength={1}
            value={value.seri}
            onChange={(e) =>
              set({ seri: e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 1) })
            }
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none dir-ltr text-center ${input}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={`block text-xs mb-1 ${label}`}>آزمایشگاه</label>
          <input
            disabled={disabled}
            value={value.lab_name}
            onChange={(e) => set({ lab_name: e.target.value })}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${input}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${label}`}>مابه‌التفاوت (ریال)</label>
          <input
            disabled={disabled}
            value={value.difference_rial}
            onChange={(e) => set({ difference_rial: toEnglishDigits(e.target.value) })}
            placeholder="مثبت=دریافت از مشتری"
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none dir-ltr text-right ${input}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${label}`}>نحوه تسویه مابه‌التفاوت</label>
          <select
            disabled={disabled}
            value={value.difference_method}
            onChange={(e) =>
              set({ difference_method: e.target.value as DeliveryFormState["difference_method"] })
            }
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${input}`}
          >
            <option value="">بدون مابه‌التفاوت</option>
            <option value="CASH">نقدی</option>
            <option value="CARD">کارت</option>
            <option value="OTHER">سایر</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={`block text-xs mb-1 ${label}`}>توضیحات</label>
          <textarea
            disabled={disabled}
            rows={2}
            value={value.notes}
            onChange={(e) => set({ notes: e.target.value })}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none resize-none ${input}`}
          />
        </div>
      </div>
    </div>
  );
}
