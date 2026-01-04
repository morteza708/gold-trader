"use client";

import { useState, useEffect } from "react";
import { 
  Settings, DollarSign, Bell, Users, 
  Building2, Globe, Save, RefreshCw, Plus, 
  Trash2, Edit2, CheckCircle2, XCircle, 
  Clock, CreditCard, Lock, 
  Phone, MapPin,
  AlertTriangle, X, Loader2, Power, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { toPersianDigits, toEnglishDigits, validateMobile } from "@/lib/utils/numberUtils";
import { systemSettingsAPI, depositAccountsAPI, DepositAccount } from "@/lib/api/auth";
import { adminTradesAPI, GoldPriceAdmin } from "@/lib/api/trades";
import { useGoldPrice } from "@/hooks/useGoldPrice";
import { useTradesStatus } from "@/hooks/useTradesStatus";

// تایپ‌ها (DepositAccount از API import شده است)

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<"price" | "financial" | "general" | "notifications">("price");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddPhoneModalOpen, setIsAddPhoneModalOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");

  // تنظیم title صفحه
  useEffect(() => {
    document.title = "تنظیمات سیستم | پنل مدیریت";
  }, []);

  // تنظیمات قیمت
  const { prices } = useGoldPrice(5000);
  const { status: tradesStatus } = useTradesStatus(5000);
  const [currentPrice, setCurrentPrice] = useState<GoldPriceAdmin | null>(null);
  const [priceSettings, setPriceSettings] = useState({
    buyBasePrice: 0,
    sellBasePrice: 0,
    buyMargin: 0,
    sellMargin: 0,
  });
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isTogglingTrades, setIsTogglingTrades] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null);

  // حساب‌های بانکی واریز
  const [depositAccounts, setDepositAccounts] = useState<DepositAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // تنظیمات عمومی
  const [generalSettings, setGeneralSettings] = useState({
    adminPhoneNumbers: [] as string[],
    goldPickupAddress: "",
  });

  // بارگذاری تنظیمات سیستم
  useEffect(() => {
    fetchSystemSettings();
    fetchCurrentPrice();
    fetchDepositAccounts();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const settings = await systemSettingsAPI.getSettings();
      setGeneralSettings(prev => ({
        ...prev,
        adminPhoneNumbers: settings.admin_phone_numbers || [],
        goldPickupAddress: settings.gold_pickup_address || "",
      }));
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      // در صورت خطا، از مقادیر پیش‌فرض استفاده می‌شود
    }
  };

  const fetchCurrentPrice = async () => {
    setIsLoadingPrice(true);
    try {
      const price = await adminTradesAPI.getCurrentPrice();
      setCurrentPrice(price);
      setPriceSettings({
        buyBasePrice: Number(price.buy_base_price),
        sellBasePrice: Number(price.sell_base_price),
        buyMargin: Number(price.buy_margin),
        sellMargin: Number(price.sell_margin),
      });
    } catch (error: any) {
      console.error('Error fetching current price:', error);
      toast.error("خطا در دریافت قیمت فعلی");
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!priceSettings.buyBasePrice || !priceSettings.sellBasePrice) {
      return toast.error("لطفا قیمت‌های پایه را وارد کنید");
    }

    if (priceSettings.buyMargin < 0 || priceSettings.sellMargin < 0) {
      return toast.error("حاشیه سود نمی‌تواند منفی باشد");
    }

    setIsUpdatingPrice(true);
    try {
      await adminTradesAPI.updatePrice({
        buy_base_price: priceSettings.buyBasePrice,
        sell_base_price: priceSettings.sellBasePrice,
        buy_margin: priceSettings.buyMargin,
        sell_margin: priceSettings.sellMargin,
      });
      
      toast.success("قیمت با موفقیت به‌روزرسانی شد");
      fetchCurrentPrice();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "خطا در به‌روزرسانی قیمت";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleToggleTradesStatus = () => {
    if (isTogglingTrades) return;
    
    const newStatus = !tradesStatus?.trades_enabled;
    setPendingStatus(newStatus);
    
    // نمایش مودال تایید برای خاموش کردن
    if (!newStatus) {
      setShowConfirmModal(true);
    } else {
      // برای روشن کردن، مستقیماً اجرا می‌کنیم
      executeToggle(newStatus);
    }
  };

  const executeToggle = async (newStatus: boolean) => {
    setIsTogglingTrades(true);
    setShowConfirmModal(false);
    
    try {
      const response = await adminTradesAPI.toggleTradesStatus(newStatus);
      
      if (newStatus) {
        toast.success(
          `معاملات فعال شد. ${response.resumed_orders} سفارش دوباره فعال شد.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `معاملات غیرفعال شد. ${response.suspended_orders} سفارش معلق شد.`,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'خطا در تغییر وضعیت معاملات';
      toast.error(errorMessage);
    } finally {
      setIsTogglingTrades(false);
      setPendingStatus(null);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus !== null) {
      executeToggle(pendingStatus);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
  };

  const handleSaveSystemSettings = async () => {
    setIsSaving(true);
    try {
      await systemSettingsAPI.updateSettings({
        admin_phone_numbers: generalSettings.adminPhoneNumbers,
        gold_pickup_address: generalSettings.goldPickupAddress,
      });
      toast.success("تنظیمات با موفقیت ذخیره شد");
    } catch (error: any) {
      console.error('Error saving system settings:', error);
      toast.error(error.response?.data?.error || "خطا در ذخیره تنظیمات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAdminPhone = () => {
    setIsAddPhoneModalOpen(true);
    setNewPhoneNumber("");
  };

  const handleSavePhoneNumber = () => {
    // تبدیل اعداد فارسی به انگلیسی
    const englishPhone = toEnglishDigits(newPhoneNumber);
    // حذف فاصله‌ها
    const cleanPhone = englishPhone.replace(/\s+/g, '');
    
    // بررسی اعتبار شماره
    if (!validateMobile(cleanPhone)) {
      toast.error("شماره موبایل نامعتبر است. شماره باید با 09 شروع شود و 11 رقم باشد");
      return;
    }
    
    // بررسی تکراری نبودن
    if (generalSettings.adminPhoneNumbers.includes(cleanPhone)) {
      toast.error("این شماره قبلاً اضافه شده است");
      return;
    }
    
    // افزودن شماره
    setGeneralSettings({
      ...generalSettings,
      adminPhoneNumbers: [...generalSettings.adminPhoneNumbers, cleanPhone],
    });
    
    setIsAddPhoneModalOpen(false);
    setNewPhoneNumber("");
    toast.success("شماره موبایل با موفقیت اضافه شد");
  };

  const handleRemoveAdminPhone = (phone: string) => {
    setGeneralSettings({
      ...generalSettings,
      adminPhoneNumbers: generalSettings.adminPhoneNumbers.filter(p => p !== phone),
    });
  };

  // تنظیمات اعلان‌ها
  const [notificationSettings, setNotificationSettings] = useState({
    smsEnabled: true,
    emailEnabled: true,
    smsTemplate: "کد تایید شما: {code}",
  });

  // حساب‌های بانکی
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<DepositAccount | null>(null);


  // ذخیره تنظیمات
  // بارگذاری حساب‌های بانکی
  const fetchDepositAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const accounts = await depositAccountsAPI.getAllAccounts();
      setDepositAccounts(accounts);
    } catch (error: any) {
      console.error('Error fetching deposit accounts:', error);
      toast.error("خطا در دریافت حساب‌های بانکی");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // مدیریت حساب‌های بانکی
  const handleAddBank = async (bank: {
    bank_name: string;
    owner_name: string;
    card_number: string;
    sheba_number: string;
    is_active?: boolean;
    order?: number;
  }) => {
    try {
      await depositAccountsAPI.createAccount(bank);
      toast.success("حساب بانکی اضافه شد");
      setIsAddBankModalOpen(false);
      fetchDepositAccounts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "خطا در افزودن حساب بانکی";
      toast.error(errorMessage);
    }
  };

  const handleEditBank = (bank: DepositAccount) => {
    setEditingBank(bank);
    setIsAddBankModalOpen(true);
  };

  const handleUpdateBank = async (updatedBank: DepositAccount) => {
    try {
      await depositAccountsAPI.updateAccount(updatedBank.id, {
        bank_name: updatedBank.bank_name,
        owner_name: updatedBank.owner_name,
        card_number: updatedBank.card_number,
        sheba_number: updatedBank.sheba_number,
        is_active: updatedBank.is_active,
        order: updatedBank.order,
      });
      toast.success("حساب بانکی به‌روزرسانی شد");
      setIsAddBankModalOpen(false);
      setEditingBank(null);
      fetchDepositAccounts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "خطا در به‌روزرسانی حساب بانکی";
      toast.error(errorMessage);
    }
  };

  const handleDeleteBank = async (id: number) => {
    if (confirm("آیا از حذف این حساب بانکی اطمینان دارید؟")) {
      try {
        await depositAccountsAPI.deleteAccount(id);
        toast.success("حساب بانکی حذف شد");
        fetchDepositAccounts();
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || "خطا در حذف حساب بانکی";
        toast.error(errorMessage);
      }
    }
  };

  const handleToggleBankActive = async (account: DepositAccount) => {
    try {
      await depositAccountsAPI.updateAccount(account.id, {
        is_active: !account.is_active,
      });
      toast.success(account.is_active ? "حساب غیرفعال شد" : "حساب فعال شد");
      fetchDepositAccounts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "خطا در تغییر وضعیت حساب";
      toast.error(errorMessage);
    }
  };

  const tabs = [
    { id: "price", name: "قیمت و بازار", icon: DollarSign },
    { id: "financial", name: "مالی", icon: CreditCard },
    { id: "general", name: "عمومی", icon: Globe },
    { id: "notifications", name: "اعلان‌ها", icon: Bell },
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">تنظیمات سیستم</h1>
          <p className="text-sm text-slate-400">مدیریت و پیکربندی سیستم</p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-2">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-2 min-w-max md:flex-wrap md:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-gold-500 text-white shadow-lg shadow-gold-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  <Icon size={16} className="md:w-[18px] md:h-[18px]" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* محتوای تب‌ها */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <AnimatePresence mode="wait">
          
          {/* تب 1: تنظیمات قیمت */}
          {activeTab === "price" && (
            <motion.div
              key="price"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <DollarSign size={24} />
                  تنظیمات قیمت و بازار
                </h2>
                <button
                  onClick={fetchCurrentPrice}
                  disabled={isLoadingPrice}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isLoadingPrice ? "animate-spin" : ""} />
                  به‌روزرسانی
                </button>
              </div>

              {/* نمایش قیمت فعلی */}
              {isLoadingPrice ? (
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-center">
                  <p className="text-slate-400">در حال بارگذاری...</p>
                </div>
              ) : currentPrice ? (
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-bold text-white mb-4">قیمت فعلی</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">قیمت نهایی خرید</p>
                      <p className="text-2xl font-black text-green-400">
                        {toPersianDigits(Number(currentPrice.buy_final_price).toLocaleString())} ریال
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        پایه: {toPersianDigits(Number(currentPrice.buy_base_price).toLocaleString())} + 
                        حاشیه: {toPersianDigits(Number(currentPrice.buy_margin).toLocaleString())}
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">قیمت نهایی فروش</p>
                      <p className="text-2xl font-black text-red-400">
                        {toPersianDigits(Number(currentPrice.sell_final_price).toLocaleString())} ریال
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        پایه: {toPersianDigits(Number(currentPrice.sell_base_price).toLocaleString())} + 
                        حاشیه: {toPersianDigits(Number(currentPrice.sell_margin).toLocaleString())}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    آخرین به‌روزرسانی: {toPersianDigits(currentPrice.created_at_jalali || '-')}
                  </p>
                </div>
              ) : null}

              {/* وضعیت معاملات */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">وضعیت معاملات</h3>
                <div className={`bg-slate-800 p-4 rounded-lg border ${
                  tradesStatus?.trades_enabled 
                    ? "border-green-500/50 bg-green-500/5" 
                    : "border-red-500/50 bg-red-500/5"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-sm font-bold ${
                          tradesStatus?.trades_enabled ? "text-green-400" : "text-red-400"
                        }`}>
                          {tradesStatus?.trades_enabled ? "بازار باز است" : "بازار بسته است"}
                        </span>
                        <span className="text-xs text-slate-500">(Kill Switch)</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {tradesStatus?.trades_enabled 
                          ? "کاربران می‌توانند معامله انجام دهند" 
                          : "معاملات غیرفعال است و کاربران نمی‌توانند معامله انجام دهند"}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleTradesStatus}
                      disabled={isTogglingTrades}
                      className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        tradesStatus?.trades_enabled
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {isTogglingTrades ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          در حال پردازش...
                        </>
                      ) : (
                        <>
                          <Power size={16} />
                          {tradesStatus?.trades_enabled ? "غیرفعال کردن" : "فعال کردن"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* فرم به‌روزرسانی قیمت */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">به‌روزرسانی قیمت</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">قیمت پایه خرید (ریال)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toPersianDigits(priceSettings.buyBasePrice.toLocaleString())}
                      onChange={(e) => {
                        const english = toEnglishDigits(e.target.value);
                        const num = Number(english.replace(/,/g, ""));
                        if (!isNaN(num)) {
                          setPriceSettings({ ...priceSettings, buyBasePrice: num });
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:border-gold-500"
                      placeholder="قیمت پایه خرید"
                    />
                    <p className="text-xs text-slate-500 mt-1">قیمت پایه خرید هر گرم طلا</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">قیمت پایه فروش (ریال)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toPersianDigits(priceSettings.sellBasePrice.toLocaleString())}
                      onChange={(e) => {
                        const english = toEnglishDigits(e.target.value);
                        const num = Number(english.replace(/,/g, ""));
                        if (!isNaN(num)) {
                          setPriceSettings({ ...priceSettings, sellBasePrice: num });
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:border-gold-500"
                      placeholder="قیمت پایه فروش"
                    />
                    <p className="text-xs text-slate-500 mt-1">قیمت پایه فروش هر گرم طلا</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">حاشیه سود خرید (ریال)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toPersianDigits(priceSettings.buyMargin.toLocaleString())}
                      onChange={(e) => {
                        const english = toEnglishDigits(e.target.value);
                        const num = Number(english.replace(/,/g, ""));
                        if (!isNaN(num)) {
                          setPriceSettings({ ...priceSettings, buyMargin: num });
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:border-gold-500"
                      placeholder="حاشیه سود خرید"
                    />
                    <p className="text-xs text-slate-500 mt-1">حاشیه سود که به قیمت پایه خرید اضافه می‌شود</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">حاشیه سود فروش (ریال)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toPersianDigits(priceSettings.sellMargin.toLocaleString())}
                      onChange={(e) => {
                        const english = toEnglishDigits(e.target.value);
                        const num = Number(english.replace(/,/g, ""));
                        if (!isNaN(num)) {
                          setPriceSettings({ ...priceSettings, sellMargin: num });
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:border-gold-500"
                      placeholder="حاشیه سود فروش"
                    />
                    <p className="text-xs text-slate-500 mt-1">حاشیه سود که به قیمت پایه فروش اضافه می‌شود</p>
                  </div>
                </div>

                {/* نمایش قیمت نهایی */}
                <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-sm font-bold text-slate-400 mb-2">قیمت نهایی (محاسبه خودکار)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">قیمت نهایی خرید:</p>
                      <p className="text-lg font-black text-green-400">
                        {toPersianDigits((priceSettings.buyBasePrice + priceSettings.buyMargin).toLocaleString())} ریال
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">قیمت نهایی فروش:</p>
                      <p className="text-lg font-black text-red-400">
                        {toPersianDigits((priceSettings.sellBasePrice + priceSettings.sellMargin).toLocaleString())} ریال
                      </p>
                    </div>
                  </div>
                </div>

                {/* دکمه ذخیره */}
                <button
                  onClick={handleUpdatePrice}
                  disabled={isUpdatingPrice}
                  className="mt-6 w-full px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingPrice ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      در حال به‌روزرسانی...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      به‌روزرسانی قیمت
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* تب 2: تنظیمات مالی */}
          {activeTab === "financial" && (
            <motion.div
              key="financial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <CreditCard size={20} className="md:w-6 md:h-6" />
                  تنظیمات مالی
                </h2>
                <button
                  onClick={() => setIsAddBankModalOpen(true)}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-xs md:text-sm font-bold transition-colors flex items-center gap-1.5 md:gap-2"
                >
                  <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                  افزودن حساب بانکی
                </button>
              </div>

              {/* لیست حساب‌های بانکی */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Building2 size={20} />
                  حساب‌های بانکی واریز
                </h3>
                {isLoadingAccounts ? (
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-center">
                    <p className="text-slate-400">در حال بارگذاری...</p>
                  </div>
                ) : depositAccounts.length === 0 ? (
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-center">
                    <p className="text-slate-400">هیچ حساب بانکی ثبت نشده است</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {depositAccounts.map((account) => (
                      <div key={account.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-sm font-bold text-white">{account.bank_name}</h4>
                            {account.is_active ? (
                              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                فعال
                              </span>
                            ) : (
                              <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <XCircle size={12} />
                                غیرفعال
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mb-1">{account.owner_name}</p>
                          <p className="text-xs text-slate-400 dir-ltr font-mono mb-1">{account.card_number}</p>
                          <p className="text-xs text-slate-400 dir-ltr font-mono">{account.sheba_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBankActive(account)}
                            className={`p-2 rounded-lg transition-colors ${
                              account.is_active
                                ? "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                                : "bg-gray-500/20 hover:bg-gray-500/30 text-gray-400"
                            }`}
                            title={account.is_active ? "غیرفعال کردن" : "فعال کردن"}
                          >
                            {account.is_active ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </button>
                          <button
                            onClick={() => handleEditBank(account)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-blue-400"
                            title="ویرایش"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteBank(account.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* تب 3: تنظیمات عمومی */}
          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Globe size={24} />
                تنظیمات عمومی
              </h2>

              <div className="space-y-6">
                {/* شماره مدیران برای دریافت پیامک */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 md:col-span-2">
                  <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                    <Users size={16} />
                    شماره مدیران برای دریافت پیامک
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={handleAddAdminPhone}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      <Plus size={16} />
                      افزودن شماره مدیر
                    </button>
                    {generalSettings.adminPhoneNumbers.length > 0 ? (
                      <div className="space-y-2">
                        {generalSettings.adminPhoneNumbers.map((phone, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
                          >
                            <span className="text-sm font-bold text-white dir-ltr">{toPersianDigits(phone)}</span>
                            <button
                              onClick={() => handleRemoveAdminPhone(phone)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-4">شماره مدیری ثبت نشده است</p>
                    )}
                  </div>
                </div>

                {/* آدرس مراجعه حضوری */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 md:col-span-2">
                  <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                    <MapPin size={16} />
                    آدرس مراجعه حضوری برای دریافت طلا
                  </div>
                  <textarea
                    value={generalSettings.goldPickupAddress}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, goldPickupAddress: e.target.value })}
                    placeholder="آدرس مراجعه حضوری برای دریافت طلا را وارد کنید..."
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500 resize-none"
                  />
                </div>
              </div>

              {/* دکمه ذخیره */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveSystemSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      ذخیره تنظیمات
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* تب 4: تنظیمات اعلان‌ها */}
          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Bell size={24} />
                تنظیمات اعلان‌ها
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsEnabled}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, smsEnabled: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="text-sm font-bold text-slate-300">فعال‌سازی اعلان‌های SMS</span>
                  </label>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, emailEnabled: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="text-sm font-bold text-slate-300">فعال‌سازی اعلان‌های ایمیل</span>
                  </label>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 md:col-span-2">
                  <label className="block text-sm font-bold text-slate-400 mb-2">متن قالب پیامک</label>
                  <textarea
                    value={notificationSettings.smsTemplate}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, smsTemplate: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500 resize-none"
                    placeholder="مثال: کد تایید شما: {code}"
                  />
                  <p className="text-xs text-slate-500 mt-1">از {`{code}`} برای کد تایید استفاده کنید</p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* مدال افزودن/ویرایش حساب بانکی */}
      <AnimatePresence>
        {isAddBankModalOpen && (
          <BankAccountModal
            isOpen={isAddBankModalOpen}
            onClose={() => {
              setIsAddBankModalOpen(false);
              setEditingBank(null);
            }}
            onSave={editingBank ? (bank) => handleUpdateBank(bank as DepositAccount) : (bank) => handleAddBank(bank as Omit<DepositAccount, 'id' | 'created_at' | 'updated_at'>)}
            bank={editingBank}
          />
        )}
      </AnimatePresence>

      {/* مدال افزودن شماره موبایل مدیر */}
      <AnimatePresence>
        {isAddPhoneModalOpen && (
          <AddPhoneModal
            isOpen={isAddPhoneModalOpen}
            onClose={() => {
              setIsAddPhoneModalOpen(false);
              setNewPhoneNumber("");
            }}
            onSave={handleSavePhoneNumber}
            phoneNumber={newPhoneNumber}
            setPhoneNumber={setNewPhoneNumber}
          />
        )}
      </AnimatePresence>

      {/* مودال تایید تغییر وضعیت معاملات */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-700 bg-red-500/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">تایید غیرفعال کردن معاملات</h3>
                    <p className="text-sm text-slate-400 mt-1">این عمل قابل بازگشت است</p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-400 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-white font-bold mb-2">توجه!</p>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        با غیرفعال کردن معاملات:
                      </p>
                      <ul className="text-slate-300 text-sm mt-2 space-y-1 list-disc list-inside">
                        <li>کاربران نمی‌توانند معامله جدید ثبت کنند</li>
                        <li>تمام سفارشات در انتظار (Limit Orders) معلق می‌شوند</li>
                        <li>سفارشات معلق تا زمان فعال شدن معاملات اجرا نخواهند شد</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">آیا مطمئن هستید که می‌خواهید معاملات را غیرفعال کنید؟</p>
                  <p className="text-white font-bold">
                    می‌توانید در هر زمان معاملات را دوباره فعال کنید
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-700 flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isTogglingTrades}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  انصراف
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isTogglingTrades}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTogglingTrades ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Power size={18} />
                      غیرفعال کردن
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// کامپوننت مدال افزودن شماره موبایل
function AddPhoneModal({
  isOpen,
  onClose,
  onSave,
  phoneNumber,
  setPhoneNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
}) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // تبدیل اعداد فارسی به انگلیسی
    const englishValue = toEnglishDigits(e.target.value);
    // حذف فاصله‌ها و کاراکترهای غیر عددی
    const cleaned = englishValue.replace(/\D/g, '');
    // محدود کردن به 11 رقم
    if (cleaned.length <= 11) {
      setPhoneNumber(cleaned);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Phone size={20} />
            افزودن شماره موبایل مدیر
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              شماره موبایل
            </label>
            <input
              type="text"
              value={toPersianDigits(phoneNumber)}
              onChange={handlePhoneChange}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-center text-lg font-bold dir-ltr focus:outline-none focus:border-gold-500"
              dir="ltr"
              maxLength={11}
            />
            <p className="text-xs text-slate-400 mt-2 text-center">
              شماره موبایل باید با 09 شروع شود و 11 رقم باشد
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-4 py-3 bg-gold-500 hover:bg-gold-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              افزودن
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// کامپوننت مدال حساب بانکی
function BankAccountModal({
  isOpen,
  onClose,
  onSave,
  bank,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bank: DepositAccount | Omit<DepositAccount, 'id' | 'created_at' | 'updated_at'>) => void | Promise<void>;
  bank?: DepositAccount | null;
}) {
  const [formData, setFormData] = useState({
    bank_name: bank?.bank_name || "",
    owner_name: bank?.owner_name || "",
    card_number: bank?.card_number || "",
    sheba_number: bank?.sheba_number || "",
    is_active: bank?.is_active ?? true,
    order: bank?.order ?? 0,
  });

  useEffect(() => {
    if (bank) {
      setFormData({
        bank_name: bank.bank_name,
        owner_name: bank.owner_name,
        card_number: bank.card_number,
        sheba_number: bank.sheba_number,
        is_active: bank.is_active,
        order: bank.order,
      });
    } else {
      setFormData({
        bank_name: "",
        owner_name: "",
        card_number: "",
        sheba_number: "",
        is_active: true,
        order: 0,
      });
    }
  }, [bank, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bank) {
      onSave({ ...bank, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl relative z-10 p-6"
      >
        <h3 className="text-xl font-black text-white mb-6">
          {bank ? "ویرایش حساب بانکی" : "افزودن حساب بانکی"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">نام بانک</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">نام صاحب حساب</label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">شماره کارت (16 رقم)</label>
            <input
              type="text"
              value={formData.card_number}
              onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
              required
              maxLength={16}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono dir-ltr focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">شماره شبا (24 رقم، بدون IR)</label>
            <input
              type="text"
              value={formData.sheba_number}
              onChange={(e) => setFormData({ ...formData, sheba_number: e.target.value })}
              required
              maxLength={24}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono dir-ltr focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">ترتیب نمایش</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
              min={0}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500"
            />
            <p className="text-xs text-slate-500 mt-1">عدد کمتر = اولویت بیشتر</p>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-gold-500 focus:ring-gold-500"
              />
              <span className="text-sm font-bold text-slate-300">حساب فعال است</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {bank ? "به‌روزرسانی" : "افزودن"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

