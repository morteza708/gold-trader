"use client";

import { X, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { formatGoldGrams, formatKarat, toPersianDigits } from "@/lib/utils/numberUtils";
import { Trade, tradesAPI, adminTradesAPI } from "@/lib/api/trades";
import { systemSettingsAPI, InvoiceIssuer } from "@/lib/api/auth";
import { brand } from "@/lib/brand";
import BrandLogo from "@/components/brand/BrandLogo";
import toast from "react-hot-toast";

interface InvoiceModalProps {
  data: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function InvoiceModal({ data, isOpen, onClose, isAdmin = false }: InvoiceModalProps) {
  const [isReady, setIsReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsReady(true), 100);
      systemSettingsAPI
        .getInvoiceIssuer()
        .then(setIssuer)
        .catch(() => setIssuer(null));
    } else {
      setIsReady(false);
    }
  }, [isOpen]);

  const getDateAndTime = (jalaliDateTime: string) => {
    if (!jalaliDateTime) return { date: "-", time: "-" };
    const parts = jalaliDateTime.split(" ");
    return {
      date: parts[0] || "-",
      time: parts[1] || "-",
    };
  };

  const handleDownloadPDF = async () => {
    if (!data || isDownloading) return;

    setIsDownloading(true);
    try {
      const api = isAdmin ? adminTradesAPI : tradesAPI;
      const blob = await api.downloadInvoicePDF(data.id);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `فاکتور-${data.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("فاکتور با موفقیت دانلود شد");
    } catch (error: any) {
      console.error("خطا در دانلود PDF:", error);
      toast.error(error?.response?.data?.error || "خطا در دانلود فاکتور");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !data) return null;

  const { date, time } = getDateAndTime(data.created_at_jalali);
  const tradeType = data.trade_type.toLowerCase();
  const isBuy = tradeType === "buy";

  const brandName = issuer?.brand_name || brand.name;
  const companyName = issuer?.company_name || brand.companyName;
  const tagline = issuer?.tagline || brand.tagline;
  const nationalId = issuer?.national_id || "—";
  const footerParts: string[] = [];
  if (issuer?.address) footerParts.push(`آدرس: ${issuer.address}`);
  if (issuer?.phone) footerParts.push(`تلفن: ${toPersianDigits(issuer.phone)}`);
  const footerText = footerParts.join(" | ");

  const karatDisplay =
    data.delivery_actual_karat != null
      ? toPersianDigits(formatKarat(data.delivery_actual_karat))
      : "—";
  const physicalWeightDisplay =
    data.delivery_physical_weight != null
      ? toPersianDigits(formatGoldGrams(data.delivery_physical_weight))
      : "—";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[620px] rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-700">پیش‌نمایش فاکتور</h3>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!isReady || isDownloading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} /> {isDownloading ? "در حال دانلود..." : "دانلود PDF"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto bg-gray-100 p-4 flex justify-center">
          {/* قالب فشرده هم‌راستا با PDF */}
          <div
            className="bg-white w-[148mm] max-w-full min-h-[210mm] border-2 border-black p-3 text-black relative flex flex-col shadow-lg print:shadow-none"
            style={{ fontFamily: "var(--font-iran-yekan)" }}
          >
            <div className="flex-1">
              {/* سربرگ: راست نام | وسط لوگو | چپ متا */}
              <div className="grid grid-cols-3 items-center gap-2 border-b-2 border-black pb-3 mb-4">
                <div className="text-right min-w-0">
                  <h1 className="font-black text-sm sm:text-base text-gray-900 leading-tight">
                    {brandName}
                  </h1>
                  <p className="text-[9px] sm:text-[10px] text-gray-600 mt-0.5 leading-snug">
                    {tagline}
                  </p>
                </div>
                <div className="flex justify-center">
                  {issuer?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issuer.logo_url}
                      alt={brandName}
                      className="h-11 sm:h-14 w-auto max-w-[56px] sm:max-w-[72px] object-contain"
                    />
                  ) : (
                    <BrandLogo variant="mark" size={48} showName={false} />
                  )}
                </div>
                <div className="text-left text-[10px] sm:text-xs space-y-0.5">
                  <p className="font-black text-sm sm:text-base underline mb-1">فاکتور فروش</p>
                  <p>
                    <span className="font-bold">شماره:</span>{" "}
                    <span className="font-mono dir-ltr">
                      {toPersianDigits(data.invoice_number)}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold">تاریخ:</span> {toPersianDigits(date)}
                  </p>
                  <p>
                    <span className="font-bold">ساعت:</span> {toPersianDigits(time)}
                  </p>
                  {data.channel === "MANUAL" && (
                    <p className="text-[10px] sm:text-[11px] text-amber-800 font-bold">
                      فاکتور دستی / حضوری
                    </p>
                  )}
                  {data.channel === "MANUAL" && data.settlement_mode_display && (
                    <p className="text-[9px] sm:text-[10px] text-gray-600">
                      تسویه: {data.settlement_mode_display}
                      {data.payment_status_display ? ` — ${data.payment_status_display}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 border border-black mb-4 text-xs">
                <div className="p-2.5 border-l border-black">
                  <p className="font-bold text-gray-600 underline mb-1">
                    {isBuy ? "فروشنده:" : "خریدار:"}
                  </p>
                  <p className="font-black text-sm">{companyName}</p>
                  <p className="mt-1">شناسه/کد ملی: {toPersianDigits(nationalId)}</p>
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-gray-600 underline mb-1">
                    {isBuy ? "خریدار:" : "فروشنده:"}
                  </p>
                  <p className="font-black text-sm">{data.user_name || "-"}</p>
                  <p className="mt-1">شماره تماس: {toPersianDigits(data.user_mobile || "-")}</p>
                </div>
              </div>

              <table className="w-full mb-4 border border-black text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 text-right px-2 border-b border-l border-black font-black">
                      شرح کالا
                    </th>
                    <th className="py-2 text-center px-1 border-b border-l border-black font-black">
                      عیار
                    </th>
                    <th className="py-2 text-center px-1 border-b border-l border-black font-black">
                      وزن (g)
                    </th>
                    <th className="py-2 text-center px-1 border-b border-l border-black font-black">
                      فی واحد
                    </th>
                    <th className="py-2 text-left px-2 border-b border-black font-black">مبلغ کل</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 border-b border-l border-gray-300 text-right px-2 font-bold">
                      {isBuy ? "خرید" : "فروش"} طلای آب‌شده
                    </td>
                    <td className="py-3 border-b border-l border-gray-300 text-center">۷۵۰ (۱۸)</td>
                    <td className="py-3 border-b border-l border-gray-300 text-center font-bold">
                      {toPersianDigits(formatGoldGrams(data.amount))}
                    </td>
                    <td className="py-3 border-b border-l border-gray-300 text-center">
                      {toPersianDigits(Number(data.price).toLocaleString())}
                    </td>
                    <td className="py-3 border-b border-gray-300 text-left px-2 font-black">
                      {toPersianDigits(Number(data.total).toLocaleString())}
                    </td>
                  </tr>
                </tbody>
              </table>

              {data.has_delivery_details && (
                <div className="mb-4 border border-black p-3 text-xs space-y-1.5">
                  <p className="font-black underline mb-2">مشخصات تحویل فیزیکی</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <p>
                      عیار واقعی: <strong>{karatDisplay}</strong>
                    </p>
                    <p>
                      وزن فیزیکی: <strong>{physicalWeightDisplay}</strong> گرم
                    </p>
                    <p>
                      کد ریگیری/پاکت:{" "}
                      <strong>
                        {data.delivery_packet_code
                          ? toPersianDigits(data.delivery_packet_code)
                          : "—"}
                      </strong>
                    </p>
                    <p>
                      سری: <strong>{data.delivery_seri || "—"}</strong>
                    </p>
                    <p className="col-span-2">
                      آزمایشگاه: <strong>{data.delivery_lab_name || "—"}</strong>
                    </p>
                    <p>
                      مابه‌التفاوت:{" "}
                      <strong>
                        {toPersianDigits(
                          Number(data.delivery_difference_rial || 0).toLocaleString()
                        )}
                      </strong>{" "}
                      ریال
                    </p>
                    <p>
                      نحوه تسویه:{" "}
                      <strong>{data.delivery_difference_method_display || "—"}</strong>
                    </p>
                    <p className="col-span-2">
                      توضیحات: <strong>{data.delivery_notes || "—"}</strong>
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-600 pt-1">
                    وزن دفتر پلتفرم بر اساس معادل عیار ۷۵۰ است؛ مشخصات بالا مربوط به تحویل فیزیکی است.
                  </p>
                </div>
              )}

              <div className="flex justify-end mb-6">
                <div className="w-[65%] border-2 border-black text-xs">
                  <div className="flex border-b border-black">
                    <span className="w-[35%] bg-gray-100 font-bold p-2 border-l border-black">
                      جمع کل:
                    </span>
                    <span className="flex-1 font-black p-2 text-left">
                      {toPersianDigits(Number(data.total).toLocaleString())}
                    </span>
                  </div>
                  <div className="flex border-b border-black">
                    <span className="w-[35%] bg-gray-100 font-bold p-2 border-l border-black">
                      مالیات:
                    </span>
                    <span className="flex-1 font-black p-2 text-left">۰</span>
                  </div>
                  <div className="flex bg-gray-100">
                    <span className="w-[35%] bg-gray-200 font-bold p-2 border-l border-black">
                      قابل پرداخت:
                    </span>
                    <span className="flex-1 font-black p-2 text-left">
                      {toPersianDigits(Number(data.total).toLocaleString())}{" "}
                      <span className="text-[10px] font-normal">ریال</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-xs font-bold mb-4">
                <div>
                  <p className="mb-2">مهر و امضای فروشنده</p>
                  {issuer?.stamp_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issuer.stamp_url}
                      alt="مهر / امضا"
                      className="mx-auto mb-1 max-h-24 max-w-[200px] w-auto object-contain"
                    />
                  ) : null}
                  <div className="border-t border-dashed border-gray-500 h-12 mx-2" />
                </div>
                <div>
                  <p className="mb-2">مهر و امضای خریدار</p>
                  <div className="border-t border-dashed border-gray-500 h-10 mx-2" />
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] border-t border-black pt-2 mt-auto">
              {footerText || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
