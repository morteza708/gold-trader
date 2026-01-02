"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { toEnglishDigits } from "@/lib/utils/numberUtils";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (card: any) => void;
}

// دیتای تشخیص بانک از روی پیش‌شماره (BIN)
const BANK_PREFIXES: Record<string, { name: string, color: string }> = {
  "6037": { name: "بانک ملی", color: "from-blue-700 to-blue-900" },
  "6104": { name: "بانک ملت", color: "from-red-700 to-red-900" },
  "6219": { name: "بانک سامان", color: "from-sky-500 to-blue-600" },
  "5022": { name: "بانک پاسارگاد", color: "from-yellow-600 to-black" },
  "6221": { name: "بانک پارسیان", color: "from-red-800 to-red-950" },
  "5892": { name: "بانک سپه", color: "from-orange-500 to-orange-700" },
  "6274": { name: "بانک تجارت", color: "from-teal-600 to-teal-800" },
};

export default function AddCardModal({ isOpen, onClose, onAdd }: AddCardModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [shebaNumber, setShebaNumber] = useState("");
  const [bankInfo, setBankInfo] = useState({ name: "نامشخص", color: "from-gray-700 to-gray-900" });
  const [isLoading, setIsLoading] = useState(false);

  // ریست کردن فرم
  useEffect(() => {
    if (isOpen) {
      setCardNumber("");
      setShebaNumber("");
      setBankInfo({ name: "نامشخص", color: "from-gray-700 to-gray-900" });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // هندلر تغییر شماره کارت (تشخیص بانک + فرمت دهی)
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ۱. تبدیل اعداد فارسی به انگلیسی
    let val = toEnglishDigits(e.target.value);
    // ۲. حذف هر چیزی غیر از عدد
    val = val.replace(/\D/g, "").slice(0, 16); // فقط عدد، ۱۶ رقم
    
    // تشخیص بانک
    if (val.length >= 4) {
      const prefix = val.substring(0, 4);
      if (BANK_PREFIXES[prefix]) {
        setBankInfo(BANK_PREFIXES[prefix]);
      } else {
        setBankInfo({ name: "سایر بانک‌ها", color: "from-gray-700 to-gray-900" });
      }
    }

    // فرمت 4-4-4-4
    val = val.replace(/(\d{4})(?=\d)/g, "$1-");
    setCardNumber(val);
  };

  const handleSubmit = () => {
    // تبدیل اعداد فارسی به انگلیسی قبل از اعتبارسنجی
    const cardNumberEnglish = toEnglishDigits(cardNumber.replace(/-/g, ""));
    const shebaNumberEnglish = toEnglishDigits(shebaNumber);
    
    // اعتبارسنجی ساده
    if (cardNumberEnglish.length !== 16) return toast.error("شماره کارت باید ۱۶ رقم باشد");
    if (shebaNumberEnglish.length < 20) return toast.error("شماره شبا نامعتبر است");

    setIsLoading(true);
    setTimeout(() => {
      // ارسال کارت جدید به پرنت (با اعداد انگلیسی)
      onAdd({
        id: Date.now(),
        bank: bankInfo.name,
        number: cardNumberEnglish, // شماره کارت بدون خط تیره و با اعداد انگلیسی
        sheba: "IR" + shebaNumberEnglish, // شماره شبا با اعداد انگلیسی
        active: false
      });
      setIsLoading(false);
      toast.success("کارت بانکی با موفقیت افزوده شد");
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="bg-white w-full max-w-md rounded-3xl relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* هدر و کارت گرافیکی */}
        <div className="bg-gray-50 p-6 pb-12 border-b border-gray-100 relative">
           <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-gray-800 bg-white p-2 rounded-full shadow-sm z-20"><X size={20} /></button>
           <h3 className="text-center font-black text-gray-800 mb-6">افزودن کارت جدید</h3>

           {/* --- کارت گرافیکی (Preview) --- */}
           <div className={`relative w-full aspect-[1.58/1] rounded-2xl shadow-xl overflow-hidden p-5 text-white bg-gradient-to-br ${bankInfo.color} transition-all duration-500`}>
              {/* افکت نوری روی کارت */}
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col justify-between h-full">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       <CreditCard size={24} className="opacity-80"/>
                       <span className="font-bold text-sm opacity-90">{bankInfo.name}</span>
                    </div>
                    {/* چیپ کارت */}
                    <div className="w-10 h-8 bg-yellow-400/80 rounded-md border border-yellow-300/50 flex items-center justify-center">
                       <div className="w-6 h-5 border border-black/10 rounded-sm grid grid-cols-2 gap-0.5">
                          <div className="border border-black/10"></div>
                          <div className="border border-black/10"></div>
                          <div className="border border-black/10"></div>
                          <div className="border border-black/10"></div>
                       </div>
                    </div>
                 </div>

                 <div className="text-center">
                    <p className="font-mono text-xl md:text-2xl tracking-[0.2em] drop-shadow-md dir-ltr">
                       {cardNumber || "---- ---- ---- ----"}
                    </p>
                 </div>

                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-[10px] opacity-70 mb-0.5">نام دارنده</p>
                       <p className="text-xs font-bold truncate">ALI MOHAMMADI</p>
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] opacity-70 mb-0.5">CVV2</p>
                       <p className="text-xs font-bold">***</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* فرم ورودی */}
        <div className="p-6 space-y-4 -mt-6 bg-white rounded-t-3xl relative z-10">
           
           <Input 
             label="شماره کارت"
             placeholder="۰۰۰۰ - ۰۰۰۰ - ۰۰۰۰ - ۰۰۰۰"
             value={cardNumber}
             onChange={handleCardChange}
             maxLength={19} // 16 رقم + 3 خط تیره
             inputMode="numeric"
             className="text-center font-bold text-lg dir-ltr tracking-widest"
             icon={<CreditCard size={18} className="text-gray-400"/>}
           />

           <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">شماره شبا</label>
              <div className="relative flex items-center direction-ltr">
                 <span className="absolute left-4 font-bold text-gray-500 z-10">IR</span>
                 <input 
                   className="w-full bg-gray-50 text-gray-900 border-2 border-gray-200 focus:border-gold-500 rounded-xl pl-10 pr-4 py-3 outline-none transition-all font-mono font-bold text-lg text-left"
                   placeholder="0000 0000 ..."
                   inputMode="numeric"
                   value={shebaNumber}
                   onChange={(e) => {
                     // تبدیل اعداد فارسی به انگلیسی
                     let val = toEnglishDigits(e.target.value);
                     // حذف هر چیزی غیر از عدد و محدود کردن به 24 رقم
                     val = val.replace(/[^0-9]/g, "").slice(0, 24);
                     setShebaNumber(val);
                   }}
                 />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                 <Check size={12} className="text-green-500"/>
                 نام صاحب حساب باید با نام کاربری شما یکی باشد.
              </p>
           </div>

           <Button 
             onClick={handleSubmit} 
             disabled={isLoading}
             variant="primary" 
             className="w-full justify-center !mt-6 shadow-lg"
           >
             {isLoading ? "در حال اعتبارسنجی..." : "ثبت کارت بانکی"}
           </Button>

        </div>

      </div>
    </div>
  );
}
