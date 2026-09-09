"use client";

import { pageTitle } from "@/lib/brand";

import { useState, useRef, useEffect } from "react";
import { 
  User, Shield, Smartphone, CreditCard, Camera, Trash2,
  CheckCircle2, AlertCircle, LogOut, Edit2 
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI, UpdateProfileData } from "@/lib/api/auth";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { IMAGE_FILE_ACCEPT, prepareImageForUpload } from "@/lib/utils/imageUpload";
import { UploadSuccessCheck } from "@/components/ui/ImageUploadZone";
import BirthDateFields from "@/components/ui/BirthDateFields";
import {
  EMPTY_BIRTH_PARTS,
  JalaliBirthParts,
  formatJalaliBirthDate,
  parseJalaliBirthParts,
} from "@/lib/utils/jalaliBirthDate";
import NotificationPermission from "@/components/PWA/NotificationPermission";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // تنظیم title صفحه
  useEffect(() => {
    document.title = pageTitle("پروفایل");
  }, []);
  
  // استیت‌های فرم
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    birthDate: JalaliBirthParts;
  }>({
    firstName: "",
    lastName: "",
    birthDate: { ...EMPTY_BIRTH_PARTS },
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false);

  // آواتار پیش‌فرض (آیکون کاربر)
  const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
        <rect width="128" height="128" rx="64" fill="%23d4af37"/>
        <circle cx="64" cy="50" r="26" fill="#fff" opacity="0.95"/>
        <path d="M25 110c6-22 25-32 39-32s33 10 39 32" fill="#fff" opacity="0.95"/>
      </svg>`
    );

  // بارگذاری اطلاعات کاربر در فرم
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        birthDate: parseJalaliBirthParts(user.birth_date),
      });
      setAvatarPreview(null);
      setAvatarFile(null);
      setRemoveAvatar(false);
    }
  }, [user]);

  // تابع برای دریافت URL آواتار (پیش‌فرض یا آپلود شده)
  const getAvatarUrl = (): string => {
    if (avatarPreview) {
      return avatarPreview;
    }
    if (!removeAvatar && user?.avatar) {
      // اگر avatar از سرور وجود دارد (URL کامل از backend می‌آید)
      return user.avatar;
    }
    // آواتار پیش‌فرض
    return DEFAULT_AVATAR;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const prepared = await prepareImageForUpload(file, "avatar");
    if (!prepared.ok || !prepared.file) {
      toast.error(prepared.message || "فایل نامعتبر است");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    setAvatarFile(prepared.file);
    setAvatarPreview(URL.createObjectURL(prepared.file));
    setRemoveAvatar(false);
    toast.success("تصویر پروفایل انتخاب شد");
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    toast.success("تصویر پروفایل حذف شد");
  };

  const handleCancel = () => {
    setIsEditing(false);
    // بازگردانی به مقادیر اولیه
    if (user) {
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        birthDate: parseJalaliBirthParts(user.birth_date),
      });
      setAvatarPreview(null);
      setAvatarFile(null);
      setRemoveAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // اعتبارسنجی
    if (!formData.firstName.trim()) {
      toast.error("نام الزامی است");
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error("نام خانوادگی الزامی است");
      return;
    }

    const hasAnyBirth =
      Boolean(formData.birthDate.day) ||
      Boolean(formData.birthDate.month) ||
      Boolean(formData.birthDate.year);
    let formattedDate: string | undefined;
    if (hasAnyBirth) {
      const formatted = formatJalaliBirthDate(formData.birthDate);
      if (!formatted) {
        toast.error("تاریخ تولد نامعتبر است");
        return;
      }
      formattedDate = formatted;
    }

    setIsLoading(true);

    try {
      // آماده‌سازی داده‌ها برای ارسال
      const updateData: UpdateProfileData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      };

      if (formattedDate) {
        updateData.birth_date = formattedDate;
      }

      if (avatarFile) {
        updateData.avatar = avatarFile;
      }
      if (removeAvatar) {
        updateData.remove_avatar = true;
      }

      // ارسال به API
      await authAPI.updateProfile(updateData);
      
      // به‌روزرسانی اطلاعات کاربر
      await refreshUser();
      
      toast.success("اطلاعات با موفقیت به‌روزرسانی شد");
      setIsEditing(false);
      setAvatarPreview(null);
      setAvatarFile(null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || error.message || "خطا در به‌روزرسانی پروفایل");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      
      <h1 className="text-2xl font-black text-gray-800 mb-6">تنظیمات حساب کاربری</h1>

      <div className="mb-6 space-y-2">
        <h2 className="text-sm font-bold text-gray-700">اعلان‌های دستگاه</h2>
        <NotificationPermission />
        <p className="text-xs text-gray-400 leading-5">
          برای دریافت اعلان معامله و کیف پول وقتی اپ بسته است، اعلان‌ها را فعال کنید.
          در آیفون ابتدا اپ را با «افزودن به صفحه اصلی» نصب کنید، سپس اعلان را روشن کنید.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- ستون ۱: کارت خلاصه پروفایل --- */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* کارت اصلی */}
           <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-slate-900 to-slate-800"></div>
              
              <div className="relative z-10 -mt-2">
                 {/* آواتار */}
                 <div className="relative w-28 h-28 mx-auto mb-4">
                    <img 
                      src={getAvatarUrl()} 
                      alt="Profile" 
                      className="w-full h-full rounded-full border-4 border-white shadow-lg object-cover" 
                    />
                    {isEditing && (avatarFile || avatarPreview) && (
                      <div className="absolute -bottom-1 -left-1 z-20 ring-4 ring-white rounded-full">
                        <UploadSuccessCheck size={32} />
                      </div>
                    )}
                    {isEditing && (
                      <>
                        <button 
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute bottom-1 left-1 bg-gold-500 text-white p-2 rounded-full hover:bg-gold-600 transition-colors shadow-md"
                        >
                           <Camera size={16} />
                        </button>
                        {(user.avatar && !removeAvatar) || avatarPreview ? (
                          <button
                            onClick={handleRemoveAvatar}
                            className="absolute top-1 right-1 bg-white text-red-500 p-1.5 rounded-full shadow hover:bg-red-50 transition-colors"
                            title="حذف تصویر"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      onChange={handleAvatarChange} 
                      className="hidden" 
                      accept={IMAGE_FILE_ACCEPT}
                    />
                 </div>

                 <h2 className="text-xl font-black text-gray-800">
                   {user.first_name && user.last_name 
                     ? `${user.first_name} ${user.last_name}` 
                     : 'کاربر'
                   }
                 </h2>
                 {user.phone_number && (
                   <p className="text-sm text-gray-400 dir-ltr mt-1">
                     {toPersianDigits(user.phone_number)}
                   </p>
                 )}

                 {/* بج سطح کاربری */}
                 <div className="mt-4 flex justify-center gap-2 flex-wrap">
                    <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded-full border border-green-100">
                      احراز شده
                    </span>
                    {user.customer_profile?.account_code && (
                      <span className="bg-gold-50 text-gold-600 text-[10px] px-2 py-0.5 rounded-full border border-gold-100">
                        {toPersianDigits(user.customer_profile.account_code)}
                      </span>
                    )}
                 </div>
              </div>
           </div>

           {/* وضعیت احراز هویت (KYC) */}
           <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">وضعیت احراز هویت</h3>
              <div className="space-y-4">
                 {[
                    { title: "تایید شماره موبایل", status: user.is_phone_verified ? "done" : "pending", icon: Smartphone },
                    { title: "تایید کارت ملی", status: user.national_id ? "done" : "pending", icon: User },
                    { title: "تایید حساب بانکی", status: user.has_bank_card ? "done" : "pending", icon: CreditCard },
                    { title: "تعهدنامه قوانین", status: "pending", icon: Shield },
                 ].map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.status === 'done' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                             <step.icon size={16} />
                          </div>
                          <span className={`text-xs font-bold ${step.status === 'done' ? 'text-gray-700' : 'text-gray-400'}`}>{step.title}</span>
                       </div>
                       {step.status === 'done' ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                       ) : (
                          <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">در انتظار</span>
                       )}
                    </div>
                 ))}
              </div>
           </div>

        </div>

        {/* --- ستون ۲: فرم ویرایش اطلاعات --- */}
        <div className="lg:col-span-2 space-y-6">
           
           <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <User size={20} className="text-gold-500" />
                    اطلاعات شخصی
                 </h3>
                 {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                       <Edit2 size={14} /> ویرایش
                    </button>
                 ) : (
                    <div className="flex gap-2">
                       <button 
                         onClick={handleCancel} 
                         disabled={isLoading}
                         className="text-xs font-bold text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                       >
                          انصراف
                       </button>
                       <button 
                         onClick={handleSave} 
                         disabled={isLoading}
                         className="text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                       >
                          {isLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
                       </button>
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Input 
                   label="نام" 
                   value={formData.firstName} 
                   onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                   disabled={!isEditing || isLoading}
                   className={!isEditing ? "bg-gray-50 border-transparent text-gray-500" : ""}
                 />
                 <Input 
                   label="نام خانوادگی" 
                   value={formData.lastName} 
                   onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                   disabled={!isEditing || isLoading}
                   className={!isEditing ? "bg-gray-50 border-transparent text-gray-500" : ""}
                 />
                 <Input 
                   label="کد ملی" 
                   value={user.national_id || ""} 
                   disabled={true}
                   className="bg-gray-50 border-transparent text-gray-400 cursor-not-allowed text-center"
                 />
                 <BirthDateFields
                   dense
                   value={formData.birthDate}
                   disabled={!isEditing || isLoading}
                   onChange={(birthDate) => setFormData({ ...formData, birthDate })}
                   className={`md:col-span-2 ${!isEditing ? "opacity-80" : ""}`}
                 />
              </div>

              {/* هشدار برای فیلدهای قفل شده */}
              {isEditing && (
                 <div className="mt-6 flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-3 rounded-xl">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p>برخی فیلدها مانند کد ملی و شماره موبایل به دلیل مسائل امنیتی و احراز هویت، قابل تغییر توسط کاربر نیستند. برای تغییر آنها با پشتیبانی تماس بگیرید.</p>
                 </div>
              )}
           </div>

           {/* بخش امنیت و خروج */}
           <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                    <LogOut size={24} />
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-800">نشست فعال</h4>
                    <p className="text-xs text-gray-500 mt-1">خروج امن از حساب کاربری در این دستگاه</p>
                 </div>
              </div>
              <Button 
                variant="outline" 
                onClick={logout}
                className="border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 w-full md:w-auto"
              >
                 خروج از حساب
              </Button>
           </div>

        </div>

      </div>
    </div>
  );
}
