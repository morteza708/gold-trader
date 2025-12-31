"use client";

import { useState, useEffect } from "react";
import { 
  ArrowUpRight, ArrowDownRight, Filter, Search, 
  Calendar, FileText, ChevronRight, ChevronLeft, X, Loader2
} from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import InvoiceModal from "@/components/dashboard/InvoiceModal";
import { motion } from "framer-motion";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/numberUtils";
import { tradesAPI, Trade } from "@/lib/api/trades";
import toast from "react-hot-toast";

// تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function HistoryPage() {
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateObject[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "تاریخچه معاملات | پلتفرم معاملات طلا";
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  // دریافت معاملات از API
  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setIsLoading(true);
    try {
      const data = await tradesAPI.getTrades();
      setTrades(data);
    } catch (error: any) {
      toast.error("خطا در دریافت تاریخچه معاملات");
    } finally {
      setIsLoading(false);
    }
  };

  // فیلتر کردن دیتا
  const filteredData = trades.filter((item) => {
    // 1. فیلتر نوع
    const matchesType = filter === "all" || item.trade_type.toLowerCase() === filter;
    
    // 2. فیلتر جستجو (کد رهگیری یا شماره فاکتور)
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      item.tracking_code.toLowerCase().includes(searchLower) || 
      item.invoice_number.toLowerCase().includes(searchLower);

    // 3. فیلتر تاریخ
    let matchesDate = true;
    if (dateRange.length === 2) {
      const startDate = new Date(dateRange[0].toDate());
      const endDate = new Date(dateRange[1].toDate());
      const itemDate = new Date(item.created_at);
      matchesDate = itemDate >= startDate && itemDate <= endDate;
    }

    return matchesType && matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-black text-gray-800">تاریخچه معاملات</h1>
            <p className="text-sm text-gray-400 mt-1">لیست تمام خرید و فروش‌های طلای شما</p>
         </div>
      </div>

      {/* نوار ابزار (فیلتر و سرچ) */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4">
         
         {/* بخش بالا: تب‌ها و تاریخ */}
         <div className="flex flex-col sm:flex-row gap-4 w-full">
            
            {/* تب‌های نوع معامله */}
            <div className="flex bg-gray-50 p-1 rounded-2xl w-full sm:w-auto shrink-0">
               {(["all", "buy", "sell"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 sm:w-20 py-2.5 rounded-xl text-xs font-bold transition-all ${filter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    {f === "all" && "همه"}
                    {f === "buy" && "خرید"}
                    {f === "sell" && "فروش"}
                  </button>
               ))}
            </div>

            {/* فیلتر تاریخ (تقویم) */}
            <div className="relative w-full sm:w-64 z-20">
               <DatePicker
                 range
                 calendar={persian}
                 locale={persian_fa}
                 value={dateRange}
                 onChange={setDateRange}
                 placeholder="انتخاب بازه تاریخ..."
                 inputClass="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-gold-400 text-sm font-bold text-gray-700 text-center cursor-pointer"
               />
               <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
               {dateRange.length > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); setDateRange([]); }} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500"><X size={16}/></button>
               )}
            </div>
         </div>

         {/* سرچ باکس */}
         <div className="relative w-full lg:w-72 lg:mr-auto">
            <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
            <input 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-4 pl-10 py-3 outline-none focus:border-gold-400 text-sm font-bold text-gray-700 placeholder:font-normal placeholder:text-gray-400"
              placeholder="جستجو (کد رهگیری / فاکتور)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      {/* --- لیست معاملات (جدول) --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
         
         {/* هدر جدول (فقط دسکتاپ) */}
         <div className="hidden md:grid grid-cols-7 gap-4 p-5 bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-500">
            <div className="pr-2">نوع معامله</div>
            <div className="text-center">شماره فاکتور</div>
            <div className="text-center">مقدار (گرم)</div>
            <div className="text-center">قیمت واحد</div>
            <div className="text-center">مبلغ کل</div>
            <div className="text-center">تاریخ و ساعت</div>
            <div className="text-center">عملیات</div>
         </div>

         <div className="divide-y divide-gray-50">
            {isLoading ? (
               <div className="py-12 flex justify-center">
                  <Loader2 className="animate-spin text-gray-400" size={32} />
               </div>
            ) : filteredData.length > 0 ? (
               filteredData.map((item) => {
                  const tradeType = item.trade_type.toLowerCase();
                  const statusMap: Record<string, "success" | "failed" | "pending"> = {
                     SUCCESS: "success",
                     FAILED: "failed",
                     PENDING: "pending",
                     CANCELLED: "failed",
                  };
                  
                  return (
                     <motion.div 
                        layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        key={item.id} 
                        className="group hover:bg-gray-50/80 transition-colors"
                     >
                        {/* 1. نسخه دسکتاپ (Grid) */}
                        <div className="hidden md:grid grid-cols-7 gap-4 p-5 items-center">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tradeType === 'buy' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                 {tradeType === 'buy' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                              </div>
                              <div>
                                 <p className="font-bold text-gray-800 text-sm">{tradeType === 'buy' ? 'خرید طلا' : 'فروش طلا'}</p>
                                 <p className="text-[10px] text-gray-400 dir-ltr font-mono">{item.tracking_code}</p>
                              </div>
                           </div>

                           <div className="text-center font-mono text-xs font-bold text-gray-500 bg-gray-100 py-1 rounded-lg dir-ltr">{item.invoice_number}</div>

                           <div className="text-center font-black text-gray-800">{toPersianDigits(Number(item.amount).toFixed(3))} <span className="text-xs font-normal text-gray-400">گرم</span></div>
                           
                           <div className="text-center text-gray-600 font-bold text-sm">{toPersianDigits(Number(item.price).toLocaleString())}</div>
                           
                           <div className="text-center font-black text-gray-800 text-sm">
                              {toPersianDigits(Number(item.total).toLocaleString())} <span className="text-[10px] font-normal text-gray-400">ریال</span>
                           </div>
                           
                           <div className="text-center text-xs font-bold text-gray-500">
                              <span className="block">{item.created_at_jalali}</span>
                           </div>
                           
                           <div className="flex justify-center">
                              <button 
                                onClick={() => setSelectedInvoice(item)}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                              >
                                 <FileText size={14} /> فاکتور PDF
                              </button>
                           </div>
                        </div>

                        {/* 2. نسخه موبایل (Card جداگانه) */}
                        <div className="md:hidden p-4">
                           <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                              
                              {/* نوار رنگی کنار کارت */}
                              <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${tradeType === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                              <div className="flex justify-between items-start pl-1 pr-2">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tradeType === 'buy' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                       {tradeType === 'buy' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                    </div>
                                    <div>
                                       <p className="font-bold text-gray-800 text-sm">{tradeType === 'buy' ? 'خرید طلا' : 'فروش طلا'}</p>
                                       <p className="text-[10px] text-gray-400 mt-0.5">{item.created_at_jalali}</p>
                                    </div>
                                 </div>
                                 <StatusBadge status={statusMap[item.status] || "pending"} />
                              </div>

                              {/* اطلاعات وسط کارت */}
                              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-2xl p-3 pr-4">
                                 <div>
                                    <p className="text-[10px] text-gray-400 mb-1">شماره فاکتور</p>
                                    <p className="font-mono text-xs font-bold text-gray-600 dir-ltr text-right">{item.invoice_number}</p>
                                 </div>
                                 <div className="text-left">
                                    <p className="text-[10px] text-gray-400 mb-1">مقدار طلا</p>
                                    <p className="font-black text-gray-800">{toPersianDigits(Number(item.amount).toFixed(3))} <span className="text-[10px] font-normal">گرم</span></p>
                                 </div>
                                 <div className="col-span-2 border-t border-gray-200 pt-2 flex justify-between items-center">
                                    <p className="text-[10px] text-gray-400">مبلغ کل</p>
                                    <p className="font-black text-gray-800">{toPersianDigits(Number(item.total).toLocaleString())} <span className="text-[10px] font-normal">ریال</span></p>
                                 </div>
                              </div>

                              {/* دکمه دانلود PDF */}
                              <button 
                                onClick={() => setSelectedInvoice(item)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
                              >
                                 <FileText size={16} /> مشاهده و دانلود فاکتور
                              </button>

                           </div>
                        </div>

                     </motion.div>
                  );
               })
            ) : (
               <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="bg-gray-50 p-4 rounded-full mb-3">
                     <Filter size={32} className="opacity-50" />
                  </div>
                  <p className="text-sm font-bold">هیچ تراکنشی یافت نشد!</p>
               </div>
            )}
         </div>

         {/* صفحه‌بندی (Pagination) */}
         {filteredData.length > 0 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
               <span className="text-xs text-gray-400 font-bold">
                  نمایش ۱ تا {toPersianDigits(filteredData.length.toString())} از {toPersianDigits(trades.length.toString())} تراکنش
               </span>
            </div>
         )}

      </div>

      {/* --- فراخوانی مودال فاکتور --- */}
      <InvoiceModal 
        isOpen={!!selectedInvoice}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

    </div>
  );
}
