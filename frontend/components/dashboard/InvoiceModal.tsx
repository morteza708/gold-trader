"use client";

import { X, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { Trade, tradesAPI, adminTradesAPI } from "@/lib/api/trades";
import { brand } from "@/lib/brand";
import BrandLogo from "@/components/brand/BrandLogo";
import toast from "react-hot-toast";

interface InvoiceModalProps {
  data: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean; // برای تشخیص استفاده از admin API
}

export default function InvoiceModal({ data, isOpen, onClose, isAdmin = false }: InvoiceModalProps) {
  // استیت برای اطمینان از اینکه کامپوننت لود شده است
  const [isReady, setIsReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // وقتی مودال باز می‌شود، کمی صبر می‌کنیم تا DOM ساخته شود
    if (isOpen) {
      setTimeout(() => setIsReady(true), 100);
    } else {
      setIsReady(false);
    }
  }, [isOpen]);

  // استخراج تاریخ و ساعت از created_at_jalali
  const getDateAndTime = (jalaliDateTime: string) => {
    if (!jalaliDateTime) return { date: '-', time: '-' };
    const parts = jalaliDateTime.split(' ');
    return {
      date: parts[0] || '-',
      time: parts[1] || '-'
    };
  };

  const handleDownloadPDF = async () => {
    if (!data || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // دریافت PDF از سرور - استفاده از API مناسب
      const api = isAdmin ? adminTradesAPI : tradesAPI;
      const blob = await api.downloadInvoicePDF(data.id);
      
      // ایجاد لینک دانلود
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `فاکتور-${data.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('فاکتور با موفقیت دانلود شد');
    } catch (error: any) {
      console.error('خطا در دانلود PDF:', error);
      toast.error(error?.response?.data?.error || 'خطا در دانلود فاکتور');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !data) return null;

  const { date, time } = getDateAndTime(data.created_at_jalali);
  const tradeType = data.trade_type.toLowerCase();
  const isBuy = tradeType === 'buy';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* بدنه اصلی مودال */}
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* هدر مودال */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h3 className="font-bold text-gray-700">پیش‌نمایش فاکتور</h3>
           <div className="flex gap-2">
              <button 
                onClick={handleDownloadPDF} 
                // دکمه فقط وقتی فعال می‌شود که مودال کامل لود شده باشد
                disabled={!isReady || isDownloading}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <Download size={16} /> {isDownloading ? 'در حال دانلود...' : 'دانلود PDF'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                 <X size={20} />
              </button>
           </div>
        </div>

        {/* --- ناحیه اسکرول‌خور (نمایش در مودال) --- */}
        <div className="overflow-y-auto bg-gray-100 p-4 flex justify-center">
          
          {/* --- ناحیه قابل پرینت (پیش‌نمایش) --- */}
          <div 
            className="bg-white w-[148mm] min-h-[210mm] p-8 shadow-lg text-black relative print:shadow-none print:w-full print:h-full print:m-0"
            style={{ fontFamily: 'var(--font-iran-yekan)' }}
          >
            {/* هدر فاکتور */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
               <div className="flex items-center gap-3">
                  <BrandLogo variant="mark" size={48} showName={false} />
                  <div>
                     <h1 className="font-black text-xl text-gray-900">{brand.name}</h1>
                     <p className="text-xs text-gray-500 mt-1">{brand.tagline}</p>
                  </div>
               </div>
               <div className="text-left text-sm space-y-1">
                  <p><span className="font-bold">شماره فاکتور:</span> <span className="font-mono dir-ltr">{toPersianDigits(data.invoice_number)}</span></p>
                  <p><span className="font-bold">تاریخ:</span> {toPersianDigits(date)}</p>
                  <p><span className="font-bold">ساعت:</span> {toPersianDigits(time)}</p>
               </div>
            </div>

            {/* مشخصات طرفین */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
               <div className="border border-gray-200 rounded-xl p-3">
                  <p className="font-bold text-gray-400 text-xs mb-2">{isBuy ? 'فروشنده:' : 'خریدار:'}</p>
                  <p className="font-bold">{brand.companyName}</p>
                  <p className="text-xs mt-1">شناسه ملی: ۱۰۱۰۱۲۳۴۵۶۷</p>
               </div>
               <div className="border border-gray-200 rounded-xl p-3">
                  <p className="font-bold text-gray-400 text-xs mb-2">{isBuy ? 'خریدار:' : 'فروشنده:'}</p>
                  <p className="font-bold">{data.user_name || '-'}</p>
                  <p className="text-xs mt-1">شماره تماس: {toPersianDigits(data.user_mobile || '-')}</p>
               </div>
            </div>

            {/* جدول اقلام */}
            <table className="w-full mb-8">
               <thead className="bg-gray-100 border-b-2 border-gray-800 print:bg-gray-100 print:print-color-adjust-exact">
                  <tr>
                     <th className="py-2 text-right text-sm px-2">شرح کالا</th>
                     <th className="py-2 text-center text-sm px-2">عیار</th>
                     <th className="py-2 text-center text-sm px-2">وزن (گرم)</th>
                     <th className="py-2 text-center text-sm px-2">فی واحد</th>
                     <th className="py-2 text-left text-sm px-2">مبلغ کل (ریال)</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td className="py-4 border-b border-gray-100 text-sm px-2 font-bold">{isBuy ? 'خرید' : 'فروش'} طلای آب‌شده</td>
                     <td className="py-4 border-b border-gray-100 text-center text-sm px-2">۷۵۰ (۱۸)</td>
                     <td className="py-4 border-b border-gray-100 text-center text-sm px-2 font-bold">{toPersianDigits(Number(data.amount).toFixed(3))}</td>
                     <td className="py-4 border-b border-gray-100 text-center text-sm px-2">{toPersianDigits(Number(data.price).toLocaleString())}</td>
                     <td className="py-4 border-b border-gray-100 text-left text-sm px-2 font-black">{toPersianDigits(Number(data.total).toLocaleString())}</td>
                  </tr>
               </tbody>
            </table>

            {/* جمع کل */}
            <div className="flex justify-end mb-12">
               <div className="bg-gray-50 p-4 rounded-xl w-1/2 print:bg-gray-50 print:print-color-adjust-exact">
                  <div className="flex justify-between mb-2 text-sm">
                     <span>مبلغ کل:</span>
                     <span className="font-bold">{toPersianDigits(Number(data.total).toLocaleString())}</span>
                  </div>
                  <div className="flex justify-between mb-2 text-sm text-gray-500">
                     <span>مالیات و عوارض:</span>
                     <span>۰</span>
                  </div>
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="flex justify-between text-base font-black">
                     <span>قابل پرداخت:</span>
                     <span>{toPersianDigits(Number(data.total).toLocaleString())} <span className="text-xs font-normal">ریال</span></span>
                  </div>
               </div>
            </div>

            {/* مهر و امضا */}
            <div className="grid grid-cols-2 gap-8 text-center mt-auto">
               <div className="h-24 border-t border-gray-300 pt-2">
                  <p className="font-bold text-sm">مهر و امضای فروشنده</p>
                  <div className="mt-2 opacity-50 text-xs text-gray-400">[امضای الکترونیک]</div>
               </div>
               <div className="h-24 border-t border-gray-300 pt-2">
                  <p className="font-bold text-sm">مهر و امضای خریدار</p>
               </div>
            </div>
            
            {/* پانوشت */}
            <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-2 mt-4 absolute bottom-8 w-[87%]">
               آدرس: تهران، بازار زرگرها، پلاک ۱۱۰ | تلفن: ۰۲۱-۸۸۸۸۸۸۸۸
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
