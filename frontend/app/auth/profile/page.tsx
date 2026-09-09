"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  CreditCard,
  Info,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BirthDateFields from "@/components/ui/BirthDateFields";
import toast from "react-hot-toast";
import { toEnglishDigits, toPersianDigits } from "@/lib/utils/numberUtils";
import {
  EMPTY_BIRTH_PARTS,
  JalaliBirthParts,
  formatJalaliBirthDate,
  validateJalaliBirthParts,
} from "@/lib/utils/jalaliBirthDate";
import { MAX_IMAGE_SIZE_LABEL } from "@/lib/utils/imageUpload";
import ImageCompressHelp from "@/components/ui/ImageCompressHelp";
import ImageUploadZone from "@/components/ui/ImageUploadZone";
import { useAuth } from "@/contexts/AuthContext";

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

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    nationalCode: string;
    birthDate: JalaliBirthParts;
  }>({
    firstName: "",
    lastName: "",
    nationalCode: "",
    birthDate: { ...EMPTY_BIRTH_PARTS },
  });

  const [nationalCard, setNationalCard] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [uploadHelpReason, setUploadHelpReason] = useState<"size" | "format" | "general" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const handleFileChange = (file: File | null, url: string | null) => {
    if (!file) {
      removeImage();
      return;
    }
    clearFieldError("nationalCard");
    setUploadHelpReason(null);
    setNationalCard(file);
    setPreviewUrl(url);
  };

  const removeImage = () => {
    setNationalCard(null);
    setPreviewUrl(null);
    setUploadHelpReason(null);
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
    const birthErr = validateJalaliBirthParts(formData.birthDate);
    if (birthErr) {
      errors.birthDate = birthErr;
    }
    if (!nationalCard) {
      errors.nationalCard = "آپلود تصویر کارت ملی الزامی است";
      if (!uploadHelpReason) setUploadHelpReason("general");
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
        if (frontendKey === "nationalCard") {
          if (message.includes("حجم") || message.includes("مگابایت")) {
            setUploadHelpReason("size");
          } else if (message.includes("فرمت")) {
            setUploadHelpReason("format");
          } else {
            setUploadHelpReason("general");
          }
        }
      }
    }
    return mapped;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("لطفاً خطاهای فرم را برطرف کنید");
      return;
    }

    const formattedDate = formatJalaliBirthDate(formData.birthDate);
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
          toast.error(String(firstError[0]), { duration: 6000 });
        } else if (typeof firstError === "string") {
          toast.error(firstError, { duration: 6000 });
        } else {
          toast.error("خطا در ثبت اطلاعات. لطفا فیلدها را بررسی کنید.");
        }
      } else {
        toast.error("خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید. نشست شما همچنان فعال است.");
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
            {user ? toPersianDigits(user.phone_number) : ""}
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

        <BirthDateFields
          value={formData.birthDate}
          error={fieldErrors.birthDate}
          onChange={(birthDate) => {
            clearFieldError("birthDate");
            setFormData((prev) => ({ ...prev, birthDate }));
          }}
        />

        <div className="w-full">
          <label className="block text-sm font-bold text-gray-700 mb-2">تصویر کارت ملی</label>

          <div className="mb-3 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              عکس واضح از کارت ملی (روی کارت). فرمت‌های مجاز: JPG، PNG، WebP و{" "}
              <strong>HEIC آیفون</strong>. حداکثر حجم: {MAX_IMAGE_SIZE_LABEL}. اگر حجم زیاد بود،
              صفحه را نبندید؛ از ابزارهای کاهش حجم استفاده کنید و دوباره آپلود کنید.
            </p>
          </div>

          <ImageUploadZone
            purpose="document"
            file={nationalCard}
            previewUrl={previewUrl}
            error={!!fieldErrors.nationalCard}
            emptyHint="کلیک کنید یا تصویر کارت ملی را انتخاب کنید"
            onFileChange={handleFileChange}
            onError={(msg) => {
              setNationalCard(null);
              setPreviewUrl(null);
              setUploadHelpReason("general");
              setFieldErrors((prev) => ({ ...prev, nationalCard: msg }));
              toast.error(msg, { duration: 5000 });
            }}
          />

          {nationalCard && (
            <button
              type="button"
              onClick={removeImage}
              className="mt-2 text-xs font-bold text-red-500 hover:text-red-600"
            >
              حذف تصویر انتخاب‌شده
            </button>
          )}

          {fieldErrors.nationalCard && (
            <p className="text-xs text-red-500 mt-2 font-medium">{fieldErrors.nationalCard}</p>
          )}

          {(uploadHelpReason || fieldErrors.nationalCard) && (
            <ImageCompressHelp reason={uploadHelpReason || "general"} />
          )}
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
