"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, CreditCard, Calendar as CalendarIcon, UploadCloud, CheckCircle2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { toEnglishDigits, toPersianDigits } from "@/lib/utils/numberUtils";
import { useAuth } from "@/contexts/AuthContext";

import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  nationalCode?: string;
  birthDate?: string;
  nationalCard?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, completeProfile, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    nationalCode: string;
    birthDate: string | DateObject | null;
  }>({
    firstName: "",
    lastName: "",
    nationalCode: "",
    birthDate: null,
  });
  
  const [nationalCard, setNationalCard] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "nationalCode") {
      finalValue = toEnglishDigits(value).replace(/[^0-9]/g, "").slice(0, 10);
      clearFieldError("nationalCode");
    }
    if (name === "firstName") clearFieldError("firstName");
    if (name === "lastName") clearFieldError("lastName");

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        nationalCard: "فرمت مجاز: JPG یا PNG",
      }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFieldErrors((prev) => ({
        ...prev,
        nationalCard: "حجم تصویر باید کمتر از ۵ مگابایت باشد",
      }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    clearFieldError("nationalCard");
    setNationalCard(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setNationalCard(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "نام الزامی است";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "نام خانوادگی الزامی است";
    }
    if (formData.nationalCode.length !== 10) {
      errors.nationalCode = "کد ملی باید ۱۰ رقم باشد";
    }
    if (!formData.birthDate) {
      errors.birthDate = "تاریخ تولد الزامی است";
    }
    if (!nationalCard) {
      errors.nationalCard = "آپلود تصویر کارت ملی الزامی است";
    }

    return errors;
  };

  const mapBackendErrors = (errors: Record<string, unknown>): FieldErrors => {
    const mapped: FieldErrors = {};
    const fieldMap: Record<string, keyof FieldErrors> = {
      first_name: "firstName",
      last_name: "lastName",
      national_id: "nationalCode",
      birth_date: "birthDate",
      national_card_image: "nationalCard",
    };

    for (const [key, value] of Object.entries(errors)) {
      const frontendKey = fieldMap[key];
      const message = Array.isArray(value) ? String(value[0]) : String(value);
      if (frontendKey) {
        mapped[frontendKey] = message;
      }
    }
    return mapped;
  };

  const formatBirthDate = (): string | null => {
    if (!formData.birthDate) return null;

    if (formData.birthDate instanceof DateObject) {
      const year = formData.birthDate.year;
      let month: number;
      if (typeof formData.birthDate.month === 'number') {
        month = formData.birthDate.month;
      } else if (formData.birthDate.month && typeof formData.birthDate.month === 'object' && 'number' in formData.birthDate.month) {
        month = (formData.birthDate.month as { number: number }).number;
      } else {
        month = (formData.birthDate as DateObject & { monthIndex?: number }).monthIndex !== undefined
          ? (formData.birthDate as DateObject & { monthIndex?: number }).monthIndex! + 1
          : 1;
      }
      const day = formData.birthDate.day;

      if (year == null || month == null || day == null) return null;

      const yearNum = parseInt(String(year), 10);
      const monthNum = parseInt(String(month), 10);
      const dayNum = parseInt(String(day), 10);

      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || yearNum <= 0 || monthNum <= 0 || monthNum > 12 || dayNum <= 0 || dayNum > 31) {
        return null;
      }

      return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }

    if (typeof formData.birthDate === 'string' && formData.birthDate.trim()) {
      const dateStr = formData.birthDate.replace(/\//g, '-').trim();
      const parts = dateStr.split('-').filter((p) => p.trim());
      if (parts.length !== 3) return null;

      const year = toEnglishDigits(parts[0].trim());
      const month = toEnglishDigits(parts[1].trim());
      const day = toEnglishDigits(parts[2].trim());

      if (!/^\d+$/.test(year) || !/^\d+$/.test(month) || !/^\d+$/.test(day)) return null;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("لطفاً خطاهای فرم را برطرف کنید");
      return;
    }

    const formattedDate = formatBirthDate();
    if (!formattedDate) {
      setFieldErrors((prev) => ({ ...prev, birthDate: "تاریخ انتخاب شده نامعتبر است" }));
      return;
    }

    setIsLoading(true);

    try {
      await completeProfile({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        national_id: formData.nationalCode,
        birth_date: formattedDate,
        national_card_image: nationalCard!,
      });

      toast.success("اطلاعات با موفقیت ثبت شد");
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: Record<string, unknown> } };
      if (err.response?.status === 400 && err.response.data) {
        const backendErrors = mapBackendErrors(err.response.data);
        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
        }
        const firstError = Object.values(err.response.data)[0];
        if (Array.isArray(firstError)) {
          toast.error(String(firstError[0]));
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        
        <div className="bg-gold-50/50 border border-gold-200 rounded-xl p-3 flex justify-between items-center px-4">
          <span className="text-sm text-gray-500">شماره موبایل شما:</span>
          <span className="font-bold text-gray-800 dir-ltr font-mono text-lg">
            {user ? toPersianDigits(user.phone_number) : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="نام"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="مثلا: علی"
            icon={<User size={18} />}
            error={fieldErrors.firstName}
          />
          <Input
            label="نام خانوادگی"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="مثلا: محمدی"
            icon={<User size={18} />}
            error={fieldErrors.lastName}
          />
        </div>

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
          error={fieldErrors.nationalCode}
        />

        <div className="w-full">
          <label className="block text-sm font-bold text-gray-700 mb-2">تاریخ تولد</label>
          <div className="relative group">
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={formData.birthDate}
              onChange={(date: DateObject | DateObject[] | null) => {
                 clearFieldError("birthDate");
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
              inputClass={`w-full bg-gray-50 text-gray-900 border-2 rounded-xl px-4 py-3 outline-none transition-all duration-300 pr-12 cursor-pointer font-bold text-center ${
                fieldErrors.birthDate
                  ? "border-red-300 focus:border-red-500 bg-red-50"
                  : "border-gray-200 focus:border-gold-500"
              }`}
              placeholder="انتخاب کنید"
            />
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${fieldErrors.birthDate ? "text-red-400" : "text-gray-400"}`}>
              <CalendarIcon size={18} />
            </div>
          </div>
          {fieldErrors.birthDate && (
            <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.birthDate}</p>
          )}
        </div>

        <div className="w-full">
          <label className="block text-sm font-bold text-gray-700 mb-2">تصویر کارت ملی</label>
          
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group text-center ${
                fieldErrors.nationalCard
                  ? "border-red-300 bg-red-50/30 hover:border-red-400"
                  : "border-gray-300 hover:border-gold-500 hover:bg-gold-50/20"
              }`}
            >
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-gold-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-gold-600 mb-3 transition-colors">
                <UploadCloud size={24} />
              </div>
              <p className="text-gray-700 font-bold text-sm">کلیک کنید یا تصویر را اینجا رها کنید</p>
              <p className="text-gray-400 text-xs mt-1">حداکثر حجم: ۵ مگابایت (JPG, PNG)</p>
            </div>
          ) : (
            <div className={`relative border-2 rounded-xl overflow-hidden p-1 bg-white shadow-md ${
              fieldErrors.nationalCard ? "border-red-400" : "border-gold-500"
            }`}>
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              
              <button 
                type="button"
                onClick={removeImage}
                className="absolute top-3 left-3 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X size={16} />
              </button>
              
              <div className="absolute bottom-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <CheckCircle2 size={12} />
                آماده آپلود
              </div>
            </div>
          )}

          {fieldErrors.nationalCard && (
            <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.nationalCard}</p>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/png, image/jpeg, image/jpg"
          />
        </div>

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
