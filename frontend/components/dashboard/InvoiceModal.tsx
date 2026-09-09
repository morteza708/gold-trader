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

  const itemTitle = `${isBuy ? "خرید" : "فروش"} طلای آب‌شده`;
  const sellerLabel = isBuy ? "فروشنده" : "خریدار";
  const buyerLabel = isBuy ? "خریدار" : "فروشنده";
  const sellerName = companyName;
  const buyerName = data.user_name || "-";
  const sellerInfo = `شناسه/کد ملی: ${toPersianDigits(nationalId)}`;
  const buyerInfo = `شماره تماس: ${toPersianDigits(data.user_mobile || "-")}`;

  const MetaBlock = ({ align = "left" }: { align?: "left" | "center" }) => (
    <div
      className={`text-xs space-y-0.5 ${
        align === "center" ? "text-center" : "text-left sm:text-left"
      }`}
    >
      <p className="font-black text-base underline mb-1">فاکتور فروش</p>
      <p>
        <span className="font-bold">شماره:</span>{" "}
        <span className="font-mono dir-ltr">{toPersianDigits(data.invoice_number)}</span>
      </p>
      <p>
        <span className="font-bold">تاریخ:</span> {toPersianDigits(date)}
      </p>
      <p>
        <span className="font-bold">ساعت:</span> {toPersianDigits(time)}
      </p>
      {data.channel === "MANUAL" && (
        <p className="text-[11px] text-amber-800 font-bold">فاکتور دستی / حضوری</p>
      )}
      {data.channel === "MANUAL" && data.settlement_mode_display && (
        <p className="text-[10px] text-gray-600">
          تسویه: {data.settlement_mode_display}
          {data.payment_status_display ? ` — ${data.payment_status_display}` : ""}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-[620px] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh] shadow-2xl">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50 shrink-0">
          <h3 className="font-bold text-gray-700 text-sm sm:text-base">پیش‌نمایش فاکتور</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!isReady || isDownloading}
              className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span>{isDownloading ? "در حال دانلود..." : "دانلود PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              aria-label="بستن"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto bg-gray-100 p-2.5 sm:p-4 flex justify-center">
          <div
            className="bg-white w-full max-w-[148mm] min-h-0 sm:min-h-[210mm] border border-black sm:border-2 p-3 sm:p-3 text-black relative flex flex-col shadow-md sm:shadow-lg rounded-xl sm:rounded-none"
            style={{ fontFamily: "var(--font-iran-yekan)" }}
          >
            <div className="flex-1 space-y-3 sm:space-y-0">
              {/* سربرگ دسکتاپ: راست نام | وسط لوگو | چپ متا */}
              <div className="hidden sm:grid grid-cols-3 items-center gap-2 border-b-2 border-black pb-3 mb-4">
                <div className="text-right">
                  <h1 className="font-black text-lg text-gray-900 leading-tight">{brandName}</h1>
                  <p className="text-[11px] text-gray-600 mt-1 leading-snug">{tagline}</p>
                </div>
                <div className="flex justify-center">
                  {issuer?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issuer.logo_url}
                      alt={brandName}
                      className="h-14 w-auto max-w-[72px] object-contain"
                    />
                  ) : (
                    <BrandLogo variant="mark" size={56} showName={false} />
                  )}
                </div>
                <MetaBlock />
              </div>

              {/* سربرگ موبایل: لوگو وسط، نام، سپس متا */}
              <div className="sm:hidden border-b border-black pb-3 space-y-3">
                <div className="flex flex-col items-center text-center gap-1.5">
                  {issuer?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issuer.logo_url}
                      alt={brandName}
                      className="h-12 w-auto max-w-[64px] object-contain"
                    />
                  ) : (
                    <BrandLogo variant="mark" size={48} showName={false} />
                  )}
                  <h1 className="font-black text-lg text-gray-900">{brandName}</h1>
                  <p className="text-[11px] text-gray-600 leading-snug px-2">{tagline}</p>
                </div>
                <MetaBlock align="center" />
              </div>

              {/* فروشنده / خریدار */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-black mb-0 sm:mb-4 text-xs overflow-hidden rounded-lg sm:rounded-none">
                <div className="p-3 sm:p-2.5 border-b sm:border-b-0 sm:border-l border-black bg-gray-50/60 sm:bg-transparent">
                  <p className="font-bold text-gray-600 underline mb-1">{sellerLabel}:</p>
                  <p className="font-black text-sm">{sellerName}</p>
                  <p className="mt-1 text-[11px] sm:text-xs leading-relaxed">{sellerInfo}</p>
                </div>
                <div className="p-3 sm:p-2.5">
                  <p className="font-bold text-gray-600 underline mb-1">{buyerLabel}:</p>
                  <p className="font-black text-sm">{buyerName}</p>
                  <p className="mt-1 text-[11px] sm:text-xs leading-relaxed">{buyerInfo}</p>
                </div>
              </div>

              {/* جدول دسکتاپ */}
              <table className="hidden sm:table w-full mb-4 border border-black text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 text-right px-2 border-b border-l border-black font-black">شرح کالا</th>
                    <th className="py-2 text-center px-1 border-b border-l border-black font-black">عیار</th>
                    <th className="py-2 text-center px-1 border-b border-l border-black font-black">وزن (g)</th>
                    <th className="py-2 text-center px-1 border-b border-l border-black font-black">فی واحد</th>
                    <th className="py-2 text-left px-2 border-b border-black font-black">مبلغ کل</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 border-b border-l border-gray-300 text-right px-2 font-bold">
                      {itemTitle}
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

              {/* کارت آیتم موبایل */}
              <div className="sm:hidden border border-black rounded-xl overflow-hidden">
                <div className="bg-gray-900 text-white px-3 py-2.5 font-black text-sm">
                  {itemTitle}
                </div>
                <div className="divide-y divide-gray-200 text-xs">
                  <div className="flex justify-between items-center px-3 py-2.5">
                    <span className="text-gray-500 font-bold">عیار</span>
                    <span className="font-black">۷۵۰ (۱۸)</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5">
                    <span className="text-gray-500 font-bold">وزن</span>
                    <span className="font-black">
                      {toPersianDigits(formatGoldGrams(data.amount))} گرم
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5">
                    <span className="text-gray-500 font-bold">فی واحد</span>
                    <span className="font-black dir-ltr">
                      {toPersianDigits(Number(data.price).toLocaleString())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50">
                    <span className="text-gray-700 font-black">مبلغ کل</span>
                    <span className="font-black dir-ltr text-sm">
                      {toPersianDigits(Number(data.total).toLocaleString())}
                    </span>
                  </div>
                </div>
              </div>

              {data.has_delivery_details && (
                <div className="border border-black p-3 text-xs space-y-2 rounded-xl sm:rounded-none sm:mb-4">
                  <p className="font-black underline text-sm sm:text-xs mb-1">مشخصات تحویل فیزیکی</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 sm:gap-y-1">
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0">
                      <span className="text-gray-500 sm:text-inherit">عیار واقعی</span>
                      <strong>{karatDisplay}</strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0">
                      <span className="text-gray-500 sm:text-inherit">وزن فیزیکی</span>
                      <strong>
                        {physicalWeightDisplay} گرم
                      </strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0">
                      <span className="text-gray-500 sm:text-inherit">کد ریگیری/پاکت</span>
                      <strong>
                        {data.delivery_packet_code
                          ? toPersianDigits(data.delivery_packet_code)
                          : "—"}
                      </strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0">
                      <span className="text-gray-500 sm:text-inherit">سری</span>
                      <strong>{data.delivery_seri || "—"}</strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0 sm:col-span-2">
                      <span className="text-gray-500 sm:text-inherit">آزمایشگاه</span>
                      <strong>{data.delivery_lab_name || "—"}</strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0">
                      <span className="text-gray-500 sm:text-inherit">مابه‌التفاوت</span>
                      <strong>
                        {toPersianDigits(
                          Number(data.delivery_difference_rial || 0).toLocaleString()
                        )}{" "}
                        ریال
                      </strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 border-b border-dashed border-gray-200 sm:border-0 pb-1.5 sm:pb-0">
                      <span className="text-gray-500 sm:text-inherit">نحوه تسویه</span>
                      <strong>{data.delivery_difference_method_display || "—"}</strong>
                    </p>
                    <p className="flex justify-between sm:block gap-2 sm:col-span-2">
                      <span className="text-gray-500 sm:text-inherit">توضیحات</span>
                      <strong className="text-left">{data.delivery_notes || "—"}</strong>
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-600 pt-1 leading-relaxed">
                    وزن دفتر پلتفرم بر اساس معادل عیار ۷۵۰ است؛ مشخصات بالا مربوط به تحویل فیزیکی است.
                  </p>
                </div>
              )}

              <div className="flex justify-stretch sm:justify-end mb-2 sm:mb-6">
                <div className="w-full sm:w-[65%] border-2 border-black text-xs rounded-xl sm:rounded-none overflow-hidden">
                  <div className="flex border-b border-black">
                    <span className="w-[40%] sm:w-[35%] bg-gray-100 font-bold p-2.5 sm:p-2 border-l border-black">
                      جمع کل:
                    </span>
                    <span className="flex-1 font-black p-2.5 sm:p-2 text-left dir-ltr">
                      {toPersianDigits(Number(data.total).toLocaleString())}
                    </span>
                  </div>
                  <div className="flex border-b border-black">
                    <span className="w-[40%] sm:w-[35%] bg-gray-100 font-bold p-2.5 sm:p-2 border-l border-black">
                      مالیات:
                    </span>
                    <span className="flex-1 font-black p-2.5 sm:p-2 text-left">۰</span>
                  </div>
                  <div className="flex bg-gray-100">
                    <span className="w-[40%] sm:w-[35%] bg-gray-200 font-bold p-2.5 sm:p-2 border-l border-black">
                      قابل پرداخت:
                    </span>
                    <span className="flex-1 font-black p-2.5 sm:p-2 text-left">
                      <span className="dir-ltr inline-block">
                        {toPersianDigits(Number(data.total).toLocaleString())}
                      </span>{" "}
                      <span className="text-[10px] font-normal">ریال</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4 text-center text-xs font-bold mb-3 sm:mb-4">
                <div className="order-1 sm:order-none rounded-xl sm:rounded-none border border-dashed border-gray-300 sm:border-0 p-3 sm:p-0">
                  <p className="mb-2">مهر و امضای فروشنده</p>
                  {issuer?.stamp_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issuer.stamp_url}
                      alt="مهر / امضا"
                      className="mx-auto mb-1 max-h-20 sm:max-h-24 max-w-[180px] sm:max-w-[200px] w-auto object-contain"
                    />
                  ) : null}
                  <div className="border-t border-dashed border-gray-500 h-10 sm:h-12 mx-2" />
                </div>
                <div className="order-2 sm:order-none rounded-xl sm:rounded-none border border-dashed border-gray-300 sm:border-0 p-3 sm:p-0">
                  <p className="mb-2">مهر و امضای خریدار</p>
                  <div className="border-t border-dashed border-gray-500 h-12 mx-2 mt-8 sm:mt-0 sm:h-10" />
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] border-t border-black pt-2 mt-auto leading-relaxed px-1">
              {footerText || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
