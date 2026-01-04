"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, CheckCircle2, XCircle, Search, Send, User, ShieldCheck, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import StatsCard from "@/components/admin/StatsCard";
import { toPersianDigits, toEnglishDigits, formatMobile, validateMobile } from "@/lib/utils/numberUtils";
import { adminAPI, AdminUserListItem } from "@/lib/api/auth";
import { useDebounce } from "@/hooks/useDebounce";

export default function MobileVerificationPage() {
  const [mobile, setMobile] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [role, setRole] = useState<'CUSTOMER' | 'SITE_ADMIN'>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0,
    customers: 0,
    site_admins: 0,
  });

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "تایید شماره موبایل | پنل مدیریت";
  }, []);

  // Debounce برای جستجو (500ms تاخیر)
  const debouncedSearch = useDebounce(searchQuery, 500);

  // دریافت لیست کاربران از API
  const fetchUsers = useCallback(async (search?: string) => {
    setIsLoadingList(true);
    try {
      const response = await adminAPI.getUsersList({
        search: search || undefined,
      });
      setUsers(response.results);
      // تبدیل stats از API به فرمت مورد نیاز
      if (response.stats) {
        // محاسبه customers و site_admins از results
        const customers = response.results.filter((u: AdminUserListItem) => u.role === 'CUSTOMER').length;
        const site_admins = response.results.filter((u: AdminUserListItem) => u.role === 'SITE_ADMIN').length;
        
        setStats({
          total: response.stats.total || 0,
          verified: response.stats.verified || 0,
          unverified: response.stats.unverified || 0,
          customers: customers,
          site_admins: site_admins,
        });
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error("خطا در دریافت لیست کاربران");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // بارگذاری اولیه
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // جستجو با debounce
  useEffect(() => {
    if (debouncedSearch !== undefined) {
      fetchUsers(debouncedSearch);
    }
  }, [debouncedSearch, fetchUsers]);

  // ارسال/ذخیره
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mobile.trim()) {
      toast.error("لطفا شماره موبایل را وارد کنید");
      return;
    }

    const englishMobile = toEnglishDigits(mobile);
    if (!validateMobile(englishMobile)) {
      toast.error("شماره موبایل معتبر نیست. فرمت صحیح: 09123456789");
      return;
    }

    if (!isVerified) {
      toast.error("لطفا تیک تایید کاربر را بزنید");
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminAPI.registerOrVerifyPhone(englishMobile, role, true);
      
      toast.success(
        response.action === 'registered' 
          ? `شماره موبایل ${toPersianDigits(mobile)} با نقش ${role === 'CUSTOMER' ? 'مشتری' : 'مدیر سایت'} با موفقیت ثبت و تایید شد`
          : `شماره موبایل ${toPersianDigits(mobile)} با موفقیت تایید شد`
      );
      
      // ریست فرم
      setMobile("");
      setIsVerified(false);
      setRole('CUSTOMER');
      
      // به‌روزرسانی لیست
      await fetchUsers(debouncedSearch || undefined);
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.phone_number?.[0] || error.response?.data?.role?.[0];
        toast.error(errorMessage || "خطا در ثبت شماره موبایل");
      } else {
        toast.error("خطا در ثبت شماره موبایل. لطفا دوباره تلاش کنید.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // تبدیل AdminUserListItem به فرمت نمایشی
  const formatUserForDisplay = (user: AdminUserListItem) => ({
    id: user.id,
    mobile: user.phone_number,
    verified: user.is_phone_verified,
    verifiedAt: user.date_joined_jalali || user.date_joined,
    verifiedBy: "مدیر سیستم", // می‌تواند از بک‌اند بیاید
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    accountCode: user.customer_profile?.account_code,
  });

  // فیلتر کردن کاربران (در صورت نیاز به فیلتر سمت کلاینت)
  const filteredUsers = users.map(formatUserForDisplay);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">تایید شماره موبایل کاربران</h1>
          <p className="text-sm text-slate-400">ثبت و تایید شماره موبایل کاربران برای دسترسی به پنل کاربری</p>
        </div>
        <button
          onClick={() => fetchUsers(debouncedSearch || undefined)}
          disabled={isLoadingList}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoadingList ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "کل شماره‌ها", value: stats.total, icon: Phone, color: "text-blue-400" },
          { title: "تایید شده", value: stats.verified, icon: CheckCircle2, color: "text-green-400" },
          { title: "تایید نشده", value: stats.unverified, icon: XCircle, color: "text-red-400" },
        ].map((stat, idx) => (
          <StatsCard key={idx} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      {/* فرم ثبت شماره موبایل */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
          <Phone size={20} />
          ثبت شماره موبایل جدید
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* فیلد شماره موبایل */}
          <div>
            <label htmlFor="mobile" className="block text-sm font-bold text-slate-300 mb-2">
              شماره موبایل
            </label>
            <input
              id="mobile"
              type="text"
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(formatMobile(e.target.value, mobile))}
              placeholder="09123456789"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors dir-ltr text-right"
              maxLength={11}
            />
            <p className="text-xs text-slate-400 mt-1">فرمت صحیح: 09123456789</p>
          </div>

          {/* انتخاب نقش کاربر */}
          <div>
            <label htmlFor="role" className="block text-sm font-bold text-slate-300 mb-2">
              نقش کاربر
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('CUSTOMER')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === 'CUSTOMER'
                    ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <User size={20} />
                <span className="font-bold text-sm">مشتری</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('SITE_ADMIN')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === 'SITE_ADMIN'
                    ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <ShieldCheck size={20} />
                <span className="font-bold text-sm">مدیر سایت</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {role === 'CUSTOMER' 
                ? 'کاربر می‌تواند فقط وارد پنل کاربری شود'
                : 'کاربر می‌تواند وارد پنل کاربری و پنل مدیریت شود'
              }
            </p>
          </div>

          {/* چک باکس تایید */}
          <div className="flex items-start gap-3 p-4 bg-slate-900 rounded-xl border border-slate-700">
            <input
              id="verified"
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500 focus:ring-gold-500 focus:ring-2 cursor-pointer"
            />
            <label htmlFor="verified" className="flex-1 cursor-pointer">
              <span className="text-sm font-bold text-slate-200 block">تایید کاربر</span>
              <span className="text-xs text-slate-400 mt-1 block">
                با زدن این تیک، کاربر می‌تواند با این شماره موبایل وارد پنل شود و کد OTP دریافت کند
              </span>
            </label>
          </div>

          {/* دکمه ارسال */}
          <button
            type="submit"
            disabled={!mobile.trim() || !isVerified || isLoading}
            className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                در حال ثبت...
              </>
            ) : (
              <>
                <Send size={18} />
                ارسال و ثبت
              </>
            )}
          </button>
        </form>
      </div>

      {/* لیست شماره‌های ثبت شده */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Phone size={20} />
              لیست شماره‌های ثبت شده
            </h2>
            
            {/* جستجو */}
            <div className="flex-1 md:max-w-xs relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="جستجو بر اساس شماره موبایل، نام، کد ملی..."
                value={searchQuery}
                onChange={(e) => {
                  // پشتیبانی از اعداد فارسی و انگلیسی
                  setSearchQuery(e.target.value);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 pr-10 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors dir-ltr text-right text-sm"
              />
              {isLoadingList && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <RefreshCw size={16} className="animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* جدول - دسکتاپ */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">شماره موبایل</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">نام</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">نقش</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کد حساب</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">وضعیت</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoadingList ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    شماره موبایلی یافت نشد
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-slate-200 dir-ltr text-right tracking-wider">
                        {toPersianDigits(user.mobile)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300">
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : '-'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.role === 'SITE_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                        <span className="bg-gold-500/20 text-gold-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <ShieldCheck size={12} />
                          {user.role === 'SUPER_ADMIN' ? 'سوپر ادمین' : 'مدیر سایت'}
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <User size={12} />
                          مشتری
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300 dir-ltr text-right">
                        {user.accountCode ? toPersianDigits(user.accountCode) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.verified ? (
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 size={12} />
                          تایید شده
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <XCircle size={12} />
                          تایید نشده
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300">
                        {user.verifiedAt ? toPersianDigits(user.verifiedAt) : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* کارت‌ها - موبایل */}
        <div className="space-y-4 md:hidden p-4">
          {isLoadingList ? (
            <div className="text-center text-slate-400 py-8">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              در حال بارگذاری...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              شماره موبایلی یافت نشد
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-slate-900 rounded-xl border border-slate-700 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-200 dir-ltr text-right tracking-wider">
                      {toPersianDigits(user.mobile)}
                    </p>
                    {(user.firstName || user.lastName) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                      </p>
                    )}
                    {user.accountCode && (
                      <p className="text-xs text-slate-400 mt-1">
                        کد حساب: {toPersianDigits(user.accountCode)}
                      </p>
                    )}
                    {user.verifiedAt && (
                      <p className="text-xs text-slate-400 mt-1">{toPersianDigits(user.verifiedAt)}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {user.role === 'SITE_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                      <span className="bg-gold-500/20 text-gold-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        <ShieldCheck size={12} />
                        {user.role === 'SUPER_ADMIN' ? 'سوپر ادمین' : 'مدیر سایت'}
                      </span>
                    ) : (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        <User size={12} />
                        مشتری
                      </span>
                    )}
                    {user.verified ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        تایید شده
                      </span>
                    ) : (
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        <XCircle size={12} />
                        تایید نشده
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
