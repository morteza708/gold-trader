"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Users, Search, Eye, Ban, CheckCircle2, 
  XCircle, Shield, TrendingUp, UserCheck, UserX, 
  Phone, Calendar, Wallet, Activity, ChevronRight, ChevronLeft, RefreshCw, AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import UserStatusBadge from "@/components/admin/UserStatusBadge";
import VerificationBadge from "@/components/admin/VerificationBadge";
import StatsCard from "@/components/admin/StatsCard";
import { toPersianDigits } from "@/lib/utils/numberUtils";
import { adminAPI, AdminUserListItem, AdminUserDetail } from "@/lib/api/auth";
import { useDebounce } from "@/hooks/useDebounce";
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

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "pending">("all");

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "مدیریت کاربران | پنل مدیریت";
  }, []);
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified" | "pending">("all");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isToggling, setIsToggling] = useState<number | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<AdminUserListItem | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    blocked: 0,
    pending: 0,
    verified: 0,
  });

  // Debounce برای جستجو
  const debouncedSearch = useDebounce(searchQuery, 500);

  // دریافت لیست کاربران از API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };

      // فیلتر وضعیت
      if (statusFilter === "active") {
        params.is_active = true;
      } else if (statusFilter === "blocked") {
        params.is_active = false;
      } else if (statusFilter === "pending") {
        params.profile_completed = false;
      }

      // فیلتر احراز هویت
      if (verificationFilter === "verified") {
        params.is_verified = true;
      } else if (verificationFilter === "unverified") {
        params.is_verified = false;
      }

      // جستجو
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await adminAPI.getUsersList(params);
      setUsers(response.results);
      setStats(response.stats);
      setTotalPages(response.total_pages);
      setHasNext(response.next);
      setHasPrevious(response.previous);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error("خطا در دریافت لیست کاربران");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, verificationFilter, debouncedSearch]);

  // بارگذاری اولیه
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // دریافت جزئیات کاربر
  const handleViewDetails = async (user: AdminUserListItem) => {
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const detail = await adminAPI.getUserDetail(user.id);
      setSelectedUser(detail);
    } catch (error: any) {
      console.error('Error fetching user detail:', error);
      toast.error("خطا در دریافت جزئیات کاربر");
      setIsDetailModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // تایید مسدودسازی
  const handleConfirmBlock = async () => {
    if (!showBlockConfirm) return;
    
    setIsToggling(showBlockConfirm.id);
    try {
      await adminAPI.toggleUserStatus(showBlockConfirm.id);
      toast.success(`کاربر ${showBlockConfirm.first_name} ${showBlockConfirm.last_name} با موفقیت مسدود شد`);
      setShowBlockConfirm(null);
      await fetchUsers();
      
      // اگر مدال جزئیات باز است، به‌روزرسانی کن
      if (isDetailModalOpen && selectedUser && selectedUser.id === showBlockConfirm.id) {
        const updatedDetail = await adminAPI.getUserDetail(showBlockConfirm.id);
        setSelectedUser(updatedDetail);
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error(error.response?.data?.error || "خطا در مسدود کردن کاربر");
    } finally {
      setIsToggling(null);
    }
  };

  // فعال کردن کاربر
  const handleActivate = async (user: AdminUserListItem) => {
    setIsToggling(user.id);
    try {
      await adminAPI.toggleUserStatus(user.id);
      toast.success(`کاربر ${user.first_name} ${user.last_name} با موفقیت فعال شد`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error(error.response?.data?.error || "خطا در فعال کردن کاربر");
    } finally {
      setIsToggling(null);
    }
  };

  // تابع برای دریافت URL آواتار
  const getAvatarUrl = (user: AdminUserListItem): string => {
    if (user.avatar) {
      return user.avatar;
    }
    return DEFAULT_AVATAR;
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">مدیریت کاربران</h1>
          <p className="text-sm text-slate-400">مدیریت و نظارت بر کاربران پلتفرم</p>
        </div>
        <button
          onClick={() => fetchUsers()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          به‌روزرسانی
        </button>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { title: "کل کاربران", value: stats.total, icon: Users, color: "text-blue-400" },
          { title: "کاربران فعال", value: stats.active, icon: UserCheck, color: "text-green-400" },
          { title: "کاربران مسدود", value: stats.blocked, icon: UserX, color: "text-red-400" },
          { title: "در انتظار", value: stats.pending, icon: Activity, color: "text-orange-400" },
          { title: "احراز شده", value: stats.verified, icon: Shield, color: "text-gold-400" },
        ].map((stat, idx) => (
          <StatsCard key={idx} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      {/* نوار جستجو و فیلتر */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* جستجو */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="جستجو بر اساس نام، شماره موبایل، کد ملی یا ایمیل..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // بازگشت به صفحه اول هنگام جستجو
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 pr-10 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
            {isLoading && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <RefreshCw size={16} className="animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {/* فیلتر وضعیت */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm font-bold focus:outline-none focus:border-gold-500 transition-colors"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="blocked">مسدود</option>
              <option value="pending">در انتظار</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm font-bold focus:outline-none focus:border-gold-500 transition-colors"
            >
              <option value="all">همه احرازها</option>
              <option value="verified">احراز شده</option>
              <option value="unverified">احراز نشده</option>
              <option value="pending">در انتظار</option>
            </select>
          </div>
        </div>
      </div>

      {/* جدول کاربران - دسکتاپ */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">نام و نام خانوادگی</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">شماره موبایل</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">کد حساب</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">نقش</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">وضعیت</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400">احراز هویت</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    کاربری یافت نشد
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold-500/30">
                          <img 
                            src={getAvatarUrl(user)} 
                            alt={user.first_name || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}` 
                              : user.phone_number
                            }
                          </p>
                          {user.national_id && (
                            <p className="text-xs text-slate-400">{toPersianDigits(user.national_id)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-200 dir-ltr text-right font-medium tracking-wider">
                        {toPersianDigits(user.phone_number)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-200 dir-ltr text-right">
                        {user.customer_profile?.account_code 
                          ? toPersianDigits(user.customer_profile.account_code) 
                          : '-'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.role === 'SITE_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                        <span className="bg-gold-500/20 text-gold-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <Shield size={12} />
                          {user.role === 'SUPER_ADMIN' ? 'سوپر ادمین' : 'مدیر سایت'}
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit">
                          <Users size={12} />
                          مشتری
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <UserStatusBadge status={user.is_active ? "active" : "blocked"} />
                    </td>
                    <td className="px-4 py-4">
                      <VerificationBadge 
                        status={user.is_phone_verified ? "verified" : user.profile_completed ? "pending" : "unverified"} 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white"
                          title="مشاهده جزئیات"
                        >
                          <Eye size={16} />
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => setShowBlockConfirm(user)}
                            disabled={isToggling === user.id}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 disabled:opacity-50"
                            title="مسدود کردن"
                          >
                            {isToggling === user.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Ban size={16} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user)}
                            disabled={isToggling === user.id}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors text-green-400 disabled:opacity-50"
                            title="فعال کردن"
                          >
                            {isToggling === user.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              صفحه {toPersianDigits(String(page))} از {toPersianDigits(String(totalPages))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!hasPrevious || isLoading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2"
              >
                <ChevronRight size={16} />
                قبلی
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={!hasNext || isLoading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2"
              >
                بعدی
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* کارت‌های کاربران - موبایل */}
      <div className="space-y-4 md:hidden">
        {isLoading ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            در حال بارگذاری...
          </div>
        ) : users.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-400">
            کاربری یافت نشد
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
              {/* هدر کارت */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold-500/30">
                  <img 
                    src={getAvatarUrl(user)} 
                    alt={user.first_name || 'User'} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user.phone_number
                    }
                  </p>
                  {user.national_id && (
                    <p className="text-xs text-slate-400 mt-1">{toPersianDigits(user.national_id)}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <UserStatusBadge status={user.is_active ? "active" : "blocked"} />
                  <VerificationBadge 
                    status={user.is_phone_verified ? "verified" : user.profile_completed ? "pending" : "unverified"} 
                  />
                </div>
              </div>

              {/* اطلاعات کاربر */}
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">شماره موبایل</span>
                  <span className="text-sm text-slate-200 dir-ltr text-right font-medium tracking-wider">
                    {toPersianDigits(user.phone_number)}
                  </span>
                </div>
                {user.customer_profile?.account_code && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">کد حساب</span>
                    <span className="text-sm text-slate-200 dir-ltr text-right">
                      {toPersianDigits(user.customer_profile.account_code)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">نقش</span>
                  {user.role === 'SITE_ADMIN' || user.role === 'SUPER_ADMIN' ? (
                    <span className="bg-gold-500/20 text-gold-400 px-2 py-1 rounded-lg text-xs font-bold">
                      {user.role === 'SUPER_ADMIN' ? 'سوپر ادمین' : 'مدیر سایت'}
                    </span>
                  ) : (
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-bold">
                      مشتری
                    </span>
                  )}
                </div>
              </div>

              {/* دکمه‌های عملیات */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  onClick={() => handleViewDetails(user)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1"
                >
                  <Eye size={14} />
                  جزئیات
                </button>
                {user.is_active ? (
                  <button
                    onClick={() => setShowBlockConfirm(user)}
                    disabled={isToggling === user.id}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    {isToggling === user.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Ban size={14} />
                    )}
                    مسدود
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(user)}
                    disabled={isToggling === user.id}
                    className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors text-green-400 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    {isToggling === user.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    فعال
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* مودال تایید مسدودسازی */}
      <AnimatePresence>
        {showBlockConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlockConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl relative z-10 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-400" size={24} />
                </div>
                <h3 className="text-lg font-black text-white">تایید مسدودسازی کاربر</h3>
              </div>
              
              <p className="text-sm text-slate-300 mb-6">
                آیا مطمئن هستید که می‌خواهید کاربر زیر را مسدود کنید؟
              </p>
              
              <div className="bg-slate-900 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">نام و نام خانوادگی:</span>
                  <span className="text-sm font-bold text-white">
                    {showBlockConfirm.first_name} {showBlockConfirm.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">شماره موبایل:</span>
                  <span className="text-sm font-bold text-white dir-ltr text-right">
                    {toPersianDigits(showBlockConfirm.phone_number)}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-orange-400 mb-6">
                ⚠️ پس از مسدودسازی، کاربر دیگر نمی‌تواند وارد پنل شود و کد OTP برای او ارسال نمی‌شود.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBlockConfirm(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={handleConfirmBlock}
                  disabled={isToggling === showBlockConfirm.id}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isToggling === showBlockConfirm.id ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      در حال مسدودسازی...
                    </>
                  ) : (
                    <>
                      <Ban size={16} />
                      بله، مسدود کن
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* مدال جزئیات کاربر */}
      <AnimatePresence>
        {isDetailModalOpen && selectedUser && (
          <UserDetailModal
            user={selectedUser}
            isOpen={isDetailModalOpen}
            isLoading={isLoadingDetail}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedUser(null);
            }}
            onToggleStatus={async (user) => {
              if (user.is_active) {
                // اگر کاربر فعال است، مودال تایید مسدودسازی را باز کن
                // تبدیل AdminUserDetail به AdminUserListItem برای مودال
                const userForBlock: AdminUserListItem = {
                  id: user.id,
                  phone_number: user.phone_number,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  national_id: user.national_id,
                  role: user.role,
                  role_display: user.role_display,
                  is_phone_verified: user.is_phone_verified,
                  is_active: user.is_active,
                  profile_completed: user.profile_completed,
                  date_joined: user.date_joined,
                  date_joined_jalali: user.date_joined_jalali,
                  last_login: user.last_login,
                  last_login_jalali: user.last_login_jalali,
                  avatar: user.avatar,
                  customer_profile: user.customer_profile,
                };
                setShowBlockConfirm(userForBlock);
              } else {
                // اگر کاربر مسدود است، مستقیماً فعال کن
                const userForActivate: AdminUserListItem = {
                  id: user.id,
                  phone_number: user.phone_number,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  national_id: user.national_id,
                  role: user.role,
                  role_display: user.role_display,
                  is_phone_verified: user.is_phone_verified,
                  is_active: user.is_active,
                  profile_completed: user.profile_completed,
                  date_joined: user.date_joined,
                  date_joined_jalali: user.date_joined_jalali,
                  last_login: user.last_login,
                  last_login_jalali: user.last_login_jalali,
                  avatar: user.avatar,
                  customer_profile: user.customer_profile,
                };
                await handleActivate(userForActivate);
                // به‌روزرسانی جزئیات کاربر
                const updatedDetail = await adminAPI.getUserDetail(user.id);
                setSelectedUser(updatedDetail);
              }
            }}
            onRefresh={async () => {
              if (selectedUser) {
                const updatedDetail = await adminAPI.getUserDetail(selectedUser.id);
                setSelectedUser(updatedDetail);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// کامپوننت مدال جزئیات کاربر
function UserDetailModal({
  user,
  isOpen,
  isLoading,
  onClose,
  onToggleStatus,
  onRefresh,
}: {
  user: AdminUserDetail;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onToggleStatus: (user: AdminUserListItem) => Promise<void>;
  onRefresh?: () => Promise<void>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-800 w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl relative z-10 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h3 className="text-xl font-black text-white">جزئیات کاربر</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* اطلاعات شخصی */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <Users size={16} />
                  اطلاعات شخصی
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">نام و نام خانوادگی</p>
                    <p className="text-sm font-bold text-white">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : '-'
                      }
                    </p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">شماره موبایل</p>
                    <p className="text-sm font-bold text-white dir-ltr text-right tracking-wider">
                      {toPersianDigits(user.phone_number)}
                    </p>
                  </div>
                  {user.national_id && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">کد ملی</p>
                      <p className="text-sm font-bold text-white dir-ltr">{toPersianDigits(user.national_id)}</p>
                    </div>
                  )}
                  {user.email && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">ایمیل</p>
                      <p className="text-sm font-bold text-white dir-ltr">{user.email}</p>
                    </div>
                  )}
                  {user.customer_profile?.account_code && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">کد حساب</p>
                      <p className="text-sm font-bold text-white dir-ltr text-right">
                        {toPersianDigits(user.customer_profile.account_code)}
                      </p>
                    </div>
                  )}
                  {user.birth_date && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">تاریخ تولد</p>
                      <p className="text-sm font-bold text-white">{toPersianDigits(user.birth_date)}</p>
                    </div>
                  )}
                  {user.date_joined_jalali && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">تاریخ عضویت</p>
                      <p className="text-sm font-bold text-white">{toPersianDigits(user.date_joined_jalali)}</p>
                    </div>
                  )}
                  {user.national_card_image && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 md:col-span-2">
                      <p className="text-xs text-slate-400 mb-3">عکس کارت ملی</p>
                      <div className="relative w-full max-w-md mx-auto">
                        <img 
                          src={user.national_card_image} 
                          alt="عکس کارت ملی" 
                          className="w-full h-auto rounded-lg border border-slate-600 shadow-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* موجودی */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <Wallet size={16} />
                  موجودی
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-gold-500/20 to-gold-500/10 p-4 rounded-xl border border-gold-500/30">
                    <p className="text-xs text-gold-400 mb-1">موجودی طلا</p>
                    <p className="text-2xl font-black text-gold-400">
                      {toPersianDigits(Number(user.gold_balance || 0).toFixed(3))} <span className="text-sm">گرم</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/10 p-4 rounded-xl border border-blue-500/30">
                    <p className="text-xs text-blue-400 mb-1">موجودی ریالی</p>
                    <p className="text-2xl font-black text-blue-400">
                      {toPersianDigits(Number(user.rial_balance || 0).toLocaleString())} <span className="text-sm">تومان</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* آمار معاملات */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} />
                  آمار معاملات
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">تعداد معاملات</p>
                    <p className="text-xl font-black text-white">{toPersianDigits(user.total_trades)}</p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">حجم کل معاملات</p>
                    <p className="text-xl font-black text-white">
                      {toPersianDigits(Number(user.total_volume || 0).toFixed(2))} <span className="text-xs">گرم</span>
                    </p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">تاریخ عضویت</p>
                    <p className="text-sm font-bold text-white">
                      {user.date_joined_jalali ? toPersianDigits(user.date_joined_jalali) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* وضعیت */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <Shield size={16} />
                  وضعیت حساب
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">وضعیت حساب</p>
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 w-fit whitespace-nowrap">
                          <CheckCircle2 size={12} />
                          فعال
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 w-fit whitespace-nowrap">
                          <Ban size={12} />
                          مسدود
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">وضعیت احراز هویت</p>
                    <div className="flex items-center gap-2">
                      {user.is_phone_verified ? (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 w-fit whitespace-nowrap">
                          <Shield size={12} />
                          احراز شده
                        </span>
                      ) : (
                        <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 w-fit whitespace-nowrap">
                          <XCircle size={12} />
                          احراز نشده
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* آخرین ورود */}
              {user.last_login_jalali && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">آخرین ورود</p>
                  <p className="text-sm font-bold text-white">{toPersianDigits(user.last_login_jalali)}</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            بستن
          </button>
          <button
            onClick={async () => {
              await onToggleStatus(user);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              user.is_active
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {user.is_active ? "مسدود کردن کاربر" : "فعال کردن کاربر"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
