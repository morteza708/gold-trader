"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, CreditCard, Calendar as CalendarIcon, UploadCloud, CheckCircle2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { toEnglishDigits, toPersianDigits } from "@/lib/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

// ایمپورت‌های تقویم شمسی
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function ProfilePage() {
  const router = useRouter();
  const { user, completeProfile, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // استیت‌های فرم
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    nationalCode: string;
    birthDate: string | DateObject | null;
  }>({
    firstName: "",
    lastName: "",
    nationalCode: "",
    birthDate: null, // تاریخ به صورت DateObject یا null ذخیره می‌شود
  });
  
  // استیت عکس کارت ملی
  const [nationalCard, setNationalCard] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);

  // اگر کاربر لاگین نیست، به صفحه login هدایت شود
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // هندلر تغییر ورودی‌ها
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    // اگر کد ملی بود، فقط عدد انگلیسی بگیرد
    if (name === "nationalCode") {
      finalValue = toEnglishDigits(value).replace(/[^0-9]/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  // هندلر آپلود فایل
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // محدودیت ۵ مگابایت
        toast.error("حجم تصویر باید کمتر از ۵ مگابایت باشد");
        return;
      }
      setNationalCard(file);
      setPreviewUrl(URL.createObjectURL(file)); // ساخت لینک پیش‌نمایش
    }
  };

  // هندلر حذف عکس
  const removeImage = () => {
    setNationalCard(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // هندلر ثبت نهایی
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // اعتبارسنجی
    if (!formData.firstName || !formData.lastName) {
      toast.error("نام و نام خانوادگی الزامی است");
      return;
    }
    if (formData.nationalCode.length !== 10) {
      toast.error("کد ملی باید ۱۰ رقم باشد");
      return;
    }
    if (!formData.birthDate || formData.birthDate === "") {
      toast.error("تاریخ تولد الزامی است");
      return;
    }
    if (!nationalCard) {
      toast.error("آپلود تصویر کارت ملی الزامی است");
      return;
    }

    setIsLoading(true);

    try {
      // تبدیل تاریخ شمسی به فرمت مناسب برای backend
      // backend انتظار دارد تاریخ به صورت YYYY-MM-DD (شمسی) باشد
      let formattedDate: string;
      
      if (!formData.birthDate) {
        toast.error('تاریخ تولد الزامی است');
        setIsLoading(false);
        return;
      }
      
      // بررسی اینکه آیا DateObject است یا نه
      if (formData.birthDate instanceof DateObject) {
        try {
          // استفاده مستقیم از year, month, day
          const year = formData.birthDate.year;
          // month در DateObject می‌تواند number یا object باشد
          let month: number;
          if (typeof formData.birthDate.month === 'number') {
            month = formData.birthDate.month;
          } else if (formData.birthDate.month && typeof formData.birthDate.month === 'object' && 'number' in formData.birthDate.month) {
            month = (formData.birthDate.month as any).number;
          } else {
            // اگر هیچکدام نبود، سعی کن از index استفاده کن
            month = (formData.birthDate as any).monthIndex !== undefined 
              ? (formData.birthDate as any).monthIndex + 1 
              : 1;
          }
          
          const day = formData.birthDate.day;
          
          // بررسی اعتبار
          if (year === undefined || year === null || month === undefined || month === null || day === undefined || day === null) {
            throw new Error('تاریخ نامعتبر - لطفا تاریخ را دوباره انتخاب کنید');
          }
          
          // تبدیل به عدد
          const yearNum = parseInt(String(year), 10);
          const monthNum = parseInt(String(month), 10);
          const dayNum = parseInt(String(day), 10);
          
          // بررسی اینکه همه عدد معتبر هستند
          if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || yearNum <= 0 || monthNum <= 0 || monthNum > 12 || dayNum <= 0 || dayNum > 31) {
            throw new Error('تاریخ نامعتبر - لطفا تاریخ را دوباره انتخاب کنید');
          }
          
          formattedDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        } catch (error: any) {
          console.error('Error formatting date:', error, formData.birthDate);
          toast.error(error.message || 'تاریخ انتخاب شده نامعتبر است. لطفا دوباره انتخاب کنید.');
          setIsLoading(false);
          return;
        }
      } else if (typeof formData.birthDate === 'string' && formData.birthDate.trim()) {
        // اگر string است، سعی کن آن را parse کن
        // فرمت ممکن است: "1402/01/15" یا "1402-01-15"
        let dateStr = formData.birthDate.replace(/\//g, '-').trim();
        const parts = dateStr.split('-').filter(p => p.trim());
        
        if (parts.length === 3) {
          // تبدیل اعداد فارسی به انگلیسی
          const year = toEnglishDigits(parts[0].trim());
          const month = toEnglishDigits(parts[1].trim());
          const day = toEnglishDigits(parts[2].trim());
          
          // بررسی اینکه همه عدد هستند
          if (!/^\d+$/.test(year) || !/^\d+$/.test(month) || !/^\d+$/.test(day)) {
            toast.error('فرمت تاریخ نامعتبر است. لطفا تاریخ را دوباره انتخاب کنید.');
            setIsLoading(false);
            return;
          }
          
          formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          toast.error('فرمت تاریخ نامعتبر است. لطفا تاریخ را دوباره انتخاب کنید.');
          setIsLoading(false);
          return;
        }
      } else {
        toast.error('تاریخ تولد الزامی است');
        setIsLoading(false);
        return;
      }

      await completeProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        national_id: formData.nationalCode,
        birth_date: formattedDate,
        national_card_image: nationalCard,
      });

      toast.success("اطلاعات با موفقیت ثبت شد");
      // completeProfile خودش redirect می‌کند
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errors = error.response.data;
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError)) {
          toast.error(firstError[0] as string);
        } else if (typeof firstError === 'string') {
          toast.error(firstError);
        } else {
          toast.error("خطا در ثبت اطلاعات. لطفا فیلدها را بررسی کنید.");
        }
      } else {
        toast.error("خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-lg mx-auto">
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-800 mb-2">تکمیل مشخصات کاربری</h1>
        <p className="text-gray-500 text-sm">
          برای احراز هویت و انجام معاملات، اطلاعات زیر را تکمیل کنید
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* فیلد موبایل (فقط خواندنی) */}
        <div className="bg-gold-50/50 border border-gold-200 rounded-xl p-3 flex justify-between items-center px-4">
          <span className="text-sm text-gray-500">شماره موبایل شما:</span>
          <span className="font-bold text-gray-800 dir-ltr font-mono text-lg">
            {user ? toPersianDigits(user.phone_number) : ''}
          </span>
        </div>

        {/* نام و نام خانوادگی (دو ستونه) */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="نام"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="مثلا: علی"
            icon={<User size={18} />}
          />
          <Input
            label="نام خانوادگی"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="مثلا: محمدی"
            icon={<User size={18} />}
          />
        </div>

        {/* کد ملی */}
        <Input
          label="کد ملی"
          name="nationalCode"
          value={formData.nationalCode}
          onChange={handleChange}
          placeholder="۰۰۰۰۰۰۰۰۰۰"
          maxLength={10}
          type="tel"
          className="text-center tracking-widest font-bold"
          icon={<CreditCard size={18} />}
        />

        {/* تاریخ تولد (تقویم شمسی) */}
        <div className="w-full">
          <label className="block text-sm font-bold text-gray-700 mb-2">تاریخ تولد</label>
          <div className="relative group">
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={formData.birthDate}
              onChange={(date: DateObject | DateObject[] | null) => {
                 // DatePicker ممکن است یک DateObject یا array از DateObject برگرداند
                 // ما فقط اولین تاریخ را می‌خواهیم
                 if (date && !Array.isArray(date)) {
                   setFormData(prev => ({ ...prev, birthDate: date }));
                 } else if (date && Array.isArray(date) && date.length > 0) {
                   setFormData(prev => ({ ...prev, birthDate: date[0] }));
                 } else {
                   setFormData(prev => ({ ...prev, birthDate: null }));
                 }
              }}
              calendarPosition="bottom-right"
              containerClassName="w-full"
              inputClass="w-full bg-gray-50 text-gray-900 border-2 border-gray-200 focus:border-gold-500 rounded-xl px-4 py-3 outline-none transition-all duration-300 pr-12 cursor-pointer font-bold text-center"
              placeholder="انتخاب کنید"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <CalendarIcon size={18} />
            </div>
          </div>
        </div>

        {/* آپلود کارت ملی */}
        <div className="w-full">
          <label className="block text-sm font-bold text-gray-700 mb-2">تصویر کارت ملی</label>
          
          {!previewUrl ? (
            // باکس آپلود
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-gold-500 hover:bg-gold-50/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group text-center"
            >
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-gold-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-gold-600 mb-3 transition-colors">
                <UploadCloud size={24} />
              </div>
              <p className="text-gray-700 font-bold text-sm">کلیک کنید یا تصویر را اینجا رها کنید</p>
              <p className="text-gray-400 text-xs mt-1">حداکثر حجم: ۵ مگابایت (JPG, PNG)</p>
            </div>
          ) : (
            // نمایش پیش‌نمایش تصویر
            <div className="relative border-2 border-gold-500 rounded-xl overflow-hidden p-1 bg-white shadow-md">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              
              {/* دکمه حذف */}
              <button 
                type="button"
                onClick={removeImage}
                className="absolute top-3 left-3 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X size={16} />
              </button>
              
              {/* تیک تایید */}
              <div className="absolute bottom-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <CheckCircle2 size={12} />
                آماده آپلود
              </div>
            </div>
          )}

          {/* اینپوت مخفی فایل */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/png, image/jpeg, image/jpg"
          />
        </div>

        {/* دکمه ثبت */}
        <Button 
          variant="primary" 
          type="submit"
          className="w-full justify-center mt-4"
          disabled={isLoading}
        >
          {isLoading ? "در حال ثبت اطلاعات..." : "تکمیل ثبت‌نام و ورود"}
        </Button>

      </form>
    </div>
  );
}
