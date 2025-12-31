# 📊 خلاصه پروژه Gold Trading Platform

## 🎯 وضعیت فعلی پروژه

### ✅ بخش‌های کامل شده

#### 1. **احراز هویت و مدیریت کاربران**
- ✅ سیستم OTP با Kavenegar
- ✅ JWT Authentication (Access + Refresh Token)
- ✅ نقش‌های کاربری: SUPER_ADMIN, SITE_ADMIN, CUSTOMER
- ✅ پروفایل کاربری با KYC
- ✅ تایید شماره موبایل توسط مدیر
- ✅ پنل مدیریت کاربران

#### 2. **کیف پول و تراکنش‌های مالی** (✅ کامل)
- ✅ مدیریت کیف پول (ریال و طلا)
- ✅ سیستم موجودی مسدود شده (Pending Balance) برای درخواست‌های برداشت
- ✅ درخواست واریز (Deposit) - سیستم جدید با چند حساب مقصد
- ✅ درخواست برداشت وجه ریالی (Withdrawal RIAL)
- ✅ درخواست برداشت طلا (Withdrawal GOLD)
- ✅ مدیریت کارت‌های بانکی
- ✅ مدیریت حساب‌های بانکی واریز (DepositAccount) - چند حساب بانکی
- ✅ سیستم تخصیص حساب‌های مقصد (DepositAccountAssignment)
  - تخصیص حساب‌های برداشت دیگر کاربران
  - تخصیص حساب‌های بانکی پیش‌تعریف شده
  - تخصیص حساب‌های سفارشی (CUSTOM)
- ✅ آپلود دسته‌ای فیش‌های واریزی (Batch Upload)
- ✅ تایید/رد درخواست‌ها توسط مدیر
- ✅ تایید خودکار درخواست‌های برداشت (وقتی واریز انجام می‌شود)
- ✅ نمایش فیش‌های واریزی در پنل مدیریت و کاربری
- ✅ تسویه درخواست‌های برداشت طلا
- ✅ تاریخچه تراکنش‌ها (واریز و برداشت)
- ✅ نمایش آدرس مراجعه حضوری
- ✅ نمایش لیست حساب‌های تخصیص داده شده در پنل کاربری
- ✅ پنل مدیریت تراکنش‌های مالی
- ✅ آمار کلی (جمع واریز، جمع برداشت، تسویه شده‌ها)
- ✅ پنل سوپر ادمین (کیف پول و تراکنش‌ها)
- ✅ سیستم پیامک برای اطلاع‌رسانی واریز و برداشت

#### 3. **تنظیمات سیستم**
- ✅ SystemSettings (Singleton pattern)
- ✅ مدیریت شماره موبایل مدیران
- ✅ آدرس مراجعه حضوری برای برداشت طلا
- ✅ پنل مدیریت تنظیمات با 4 تب:
  - **قیمت و بازار:** مدیریت قیمت طلا، Kill Switch (فعال/غیرفعال کردن معاملات)
  - **مالی:** مدیریت حساب‌های بانکی واریز (DepositAccount)
  - **عمومی:** شماره مدیران برای دریافت پیامک، آدرس مراجعه حضوری
  - **اعلان‌ها:** (آماده برای پیاده‌سازی)
- ✅ مدل `DepositAccount` برای مدیریت حساب‌های بانکی واریز
- ✅ CRUD کامل برای حساب‌های بانکی در Django Admin و پنل مدیریت
- ✅ جدا شدن به app مستقل (`settings`)

#### 4. **سیستم معاملات (Trade System)** (✅ کامل)
- ✅ مدل `GoldPrice` برای مدیریت قیمت‌های لحظه‌ای طلا
- ✅ مدل `Trade` برای ذخیره معاملات خرید و فروش (با فیلد `margin_profit` برای ذخیره سود حاشیه)
- ✅ مدل `Order` برای سفارشات هوشمند (Limit Orders)
- ✅ API endpoints برای معاملات فوری (Buy/Sell)
- ✅ API endpoints برای سفارشات هوشمند
- ✅ منطق کسب و کار در `TradeService`:
  - بررسی موجودی قابل استفاده قبل از معامله (کل - مسدود شده)
  - کسر/افزودن موجودی بعد از معامله
  - تولید کد رهگیری و شماره فاکتور
  - اجرای خودکار سفارشات هوشمند (Signal Handler)
  - محاسبه و ذخیره سود حاشیه در زمان معامله (`margin_profit`)
- ✅ سیستم قیمت‌گذاری: قیمت نهایی = قیمت پایه + حاشیه سود
- ✅ کاربر با قیمت نهایی معامله می‌کند (بدون کارمزد اضافی)
- ✅ مدیریت وضعیت معاملات (فعال/غیرفعال)
- ✅ تاریخچه قیمت‌ها برای نمودار
- ✅ محاسبه و نمایش سود خالص در پنل مدیریت (از `margin_profit`)

#### 5. **سیستم فاکتور و PDF** (✅ کامل)
- ✅ تولید فاکتور PDF با WeasyPrint
- ✅ پشتیبانی کامل از فونت فارسی (IRANYekan)
- ✅ طراحی حرفه‌ای فاکتور با قالب HTML/CSS
- ✅ دانلود فاکتور در پنل کاربری
- ✅ نمایش و دانلود فاکتور در پنل مدیریت
- ✅ ذخیره‌سازی On-the-Fly (تولید در لحظه)

#### 6. **فرانت‌اند - پنل کاربری**
- ✅ صفحه اصلی (Dashboard)
- ✅ صفحه معامله هوشمند (Trade) - **متصل به بک‌اند**
- ✅ صفحه تاریخچه معاملات (History) - **متصل به بک‌اند**
- ✅ صفحه کیف پول (Wallet) - **متصل به بک‌اند**
- ✅ صفحه پروفایل (Profile)
- ✅ صفحات درباره ما و قوانین
- ✅ نمایش سفارشات هوشمند با UI بهینه برای موبایل
- ✅ تبدیل تاریخ و اعداد به فارسی

#### 7. **فرانت‌اند - پنل مدیریت**
- ✅ اتاق فرمان (Dashboard)
- ✅ مدیریت کاربران
- ✅ تراکنش‌های مالی - **متصل به بک‌اند**
- ✅ مانیتورینگ معاملات - **متصل به بک‌اند**
- ✅ نمایش و دانلود فاکتور در پنل مدیریت
- ✅ مدیریت قیمت طلا
- ✅ تغییر وضعیت معاملات (فعال/غیرفعال)
- ✅ تایید شماره موبایل
- ✅ تنظیمات سیستم

#### 8. **فرانت‌اند - پنل سوپر ادمین**
- ✅ کیف پول و تراکنش‌ها - **متصل به بک‌اند**

---

## ⚠️ بخش‌های ناقص یا نیازمند تکمیل

### 🔴 اولویت بالا

#### 1. **بهینه‌سازی اجرای خودکار سفارشات**
**وضعیت:** ⚠️ پیاده‌سازی شده اما نیاز به بهبود
- ✅ Signal Handler برای بررسی سفارشات هنگام به‌روزرسانی قیمت
- ⚠️ Management Command برای بررسی دوره‌ای (اختیاری)
- ⚠️ Celery برای اجرای background tasks (برای آینده)

---

### 🟡 اولویت متوسط

#### 5. **بهینه‌سازی و امنیت**
- ✅ Query optimization (select_related, prefetch_related) - انجام شده
- ⚠️ Rate limiting برای API
- ⚠️ Input validation بیشتر
- ⚠️ Logging و monitoring
- ⚠️ Error handling بهتر

#### 6. **تست‌ها**
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E tests

#### 7. **مستندات API**
- ❌ Swagger/OpenAPI documentation

---

### 🟢 اولویت پایین

#### 8. **ویژگی‌های اضافی**
- ❌ اعلان‌ها (Notifications)
- ❌ گزارش‌گیری پیشرفته
- ❌ داشبورد تحلیلی
- ❌ Export به Excel
- ❌ چارت قیمت طلا

---

## 🛠️ الگوها و ابزارهای استفاده شده

### Backend (Django)

#### **الگوهای طراحی:**
1. **Singleton Pattern**: `SystemSettings.get_settings()`
2. **Serializer Pattern**: DRF Serializers با `SerializerMethodField`
3. **View Pattern**: Function-based views با `@api_view` decorator
4. **Permission Pattern**: `@permission_classes([IsAuthenticated, IsAdminUser])`

#### **کتابخانه‌ها:**
- Django 5.2.8
- Django REST Framework
- django-jalali (برای تاریخ شمسی)
- django-cors-headers
- djangorestframework-simplejwt
- Kavenegar (SMS)
- Pillow (تصاویر)
- WeasyPrint (تولید PDF با پشتیبانی فارسی)
- pdfkit (پشتیبان - اختیاری)
- PostgreSQL

#### **الگوهای کدنویسی:**
```python
# تبدیل تاریخ به شمسی
from jalali_date import datetime2jalali
jalali_date = datetime2jalali(datetime_obj)
formatted = jalali_date.strftime('%Y/%m/%d %H:%M')

# ساخت URL کامل برای تصاویر
receipt_image_url = request.build_absolute_uri(obj.receipt_image.url)

# Query optimization
queryset = Model.objects.select_related('user', 'bank_card').prefetch_related('...')

# فرمت کردن اعداد برای SMS
formatted_amount = f"{int(amount):,}"  # 5000000 -> "5,000,000"

# تولید PDF با WeasyPrint
from weasyprint import HTML, CSS
html_string = render_to_string('invoice.html', context)
html_doc = HTML(string=html_string)
pdf_data = html_doc.write_pdf(stylesheets=[page_css])

# اجرای خودکار سفارشات (Signal Handler)
@receiver(post_save, sender=GoldPrice)
def check_pending_orders_on_price_update(sender, instance, created, **kwargs):
    if instance.is_active:
        TradeService.check_and_execute_pending_orders()

# تبدیل اعداد به فارسی در Backend
def to_persian_digits(text):
    persian_digits = '۰۱۲۳۴۵۶۷۸۹'
    english_digits = '0123456789'
    for i, digit in enumerate(english_digits):
        text = str(text).replace(digit, persian_digits[i])
    return text

# محاسبه سود حاشیه (برای ذخیره در دیتابیس)
if trade_type == 'BUY':
    margin_profit = price_obj.buy_margin * amount
else:  # SELL
    margin_profit = price_obj.sell_margin * amount
margin_profit = margin_profit.quantize(Decimal('1'), rounding='ROUND_HALF_UP')

# قیمت نهایی = قیمت پایه + حاشیه سود (همان قیمتی که کاربر می‌بیند)
final_price = base_price + margin
total = amount * final_price  # کاربر با همین قیمت معامله می‌کند

# بررسی موجودی قابل استفاده
available_rial = wallet.get_available_rial_balance()  # موجودی کل - مسدود شده
available_gold = wallet.get_available_gold_balance()  # موجودی کل - مسدود شده

# کسر موجودی و اضافه به pending (در زمان ایجاد درخواست برداشت)
wallet.rial_balance -= amount
wallet.pending_withdrawal_rial += amount
wallet.save()

# آزاد کردن موجودی مسدود شده بعد از تایید خودکار
wallet.pending_withdrawal_rial -= withdrawal_request.amount
wallet.save()

# استفاده از transaction.atomic() برای عملیات مالی پیچیده
from django.db import transaction
with transaction.atomic():
    # عملیات مالی
    pass

# نمایش اعداد در محیط RTL با <bdi>
<bdi dir="ltr" style={{ unicodeBidi: 'isolate', textAlign: 'left' }}>
  {cardNumber}
</bdi>
```

---

### Frontend (Next.js + TypeScript)

#### **الگوهای طراحی:**
1. **Context Pattern**: `AuthContext` برای مدیریت state
2. **Protected Route Pattern**: `ProtectedRoute` component
3. **API Client Pattern**: `apiClient` با axios interceptors
4. **Hook Pattern**: Custom hooks (`useAuth`, `useDebounce`)

#### **کتابخانه‌ها:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- react-hot-toast (notifications)
- axios
- react-multi-date-picker (تقویم شمسی)

#### **الگوهای کدنویسی:**
```typescript
// تبدیل اعداد به فارسی
import { toPersianDigits, toEnglishDigits } from '@/lib/utils/numberUtils';

// نمایش عدد در input (فارسی نمایش، انگلیسی ذخیره)
<Input 
  value={toPersianDigits(amount)}
  onChange={(e) => {
    const english = toEnglishDigits(e.target.value);
    setAmount(english);
  }}
/>

// فرمت کردن عدد با کاما
const formatted = Number(amount).toLocaleString(); // 5000000 -> "5,000,000"
const persian = toPersianDigits(formatted); // "۵,۰۰۰,۰۰۰"

// تبدیل تاریخ به شمسی (از API)
// API باید created_at_jalali برگرداند
// یا در frontend با react-multi-date-picker

// مدیریت state با Context
const { user, login, logout, refreshUser } = useAuth();

// API calls
const data = await walletAPI.getWallet();

// آپلود دسته‌ای فیش‌های واریزی
const formData = new FormData();
receipts.forEach((receipt, index) => {
  formData.append(`receipts[${index}].assignment_id`, receipt.assignmentId);
  formData.append(`receipts[${index}].amount`, receipt.amount);
  formData.append(`receipts[${index}].tracking_number`, receipt.trackingNumber);
  formData.append(`receipts[${index}].deposit_date`, receipt.depositDate);
  formData.append(`receipts[${index}].receipt_image`, receipt.imageFile);
});
await walletAPI.uploadDepositReceiptsBatch(depositRequestId, formData);

// نمایش اعداد در محیط RTL با <bdi>
<bdi dir="ltr" style={{ unicodeBidi: 'isolate', textAlign: 'left' }}>
  {formatNumber(cardNumber)}
</bdi>

// فرمت کردن عدد با جداکننده هزارگان
const formatNumber = (num: number) => {
  return num.toLocaleString('fa-IR');
};
```

---

## 📋 استانداردهای پروژه

### 1. **تبدیل اعداد به فارسی**
- ✅ همیشه از `toPersianDigits()` برای نمایش استفاده شود
- ✅ در input fields: نمایش فارسی، ذخیره انگلیسی
- ✅ در API: همیشه اعداد انگلیسی ارسال شود
- ✅ در SMS: اعداد با سه رقم جداکننده (`,`) فرمت شوند

### 2. **تبدیل تاریخ به شمسی**
- ✅ در Backend: استفاده از `datetime2jalali` و `jmodels.jDateField`
- ✅ در Serializers: فیلد `*_jalali` با `SerializerMethodField`
- ✅ در Frontend: استفاده از `created_at_jalali` از API
- ✅ در Admin Panel: متدهای `get_jalali_*` در admin classes

### 3. **فرمت کردن مبالغ**
- ✅ ریال: با سه رقم جداکننده + واحد "ریال"
- ✅ طلا: با 3 رقم اعشار + واحد "گرم"
- ✅ در جدول‌ها: `toLocaleString()` + `toPersianDigits()`

### 4. **مدیریت تصاویر**
- ✅ در Serializers: `SerializerMethodField` برای URL کامل
- ✅ در Views: `context={'request': request}` به serializer
- ✅ در Frontend: استفاده از `receipt_image_url` یا `avatar`

### 5. **Query Optimization**
- ✅ همیشه `select_related()` برای ForeignKey
- ✅ `prefetch_related()` برای ManyToMany یا reverse ForeignKey
- ✅ استفاده از `only()` یا `defer()` برای فیلدهای خاص

### 6. **مدیریت موجودی و برداشت**
- ✅ استفاده از `pending_withdrawal_rial` و `pending_withdrawal_gold` برای مسدود کردن موجودی
- ✅ موجودی قابل استفاده = موجودی کل - موجودی مسدود شده
- ✅ استفاده از `transaction.atomic()` برای عملیات مالی
- ✅ بررسی موجودی قابل استفاده در تمام معاملات

### 7. **Error Handling**
- ✅ در Backend: استفاده از `Response` با status codes مناسب
- ✅ در Frontend: try-catch با toast notifications
- ✅ Validation errors: نمایش به کاربر

### 8. **تولید PDF**
- ✅ استفاده از WeasyPrint در Backend
- ✅ Template HTML/CSS برای طراحی
- ✅ Embed کردن فونت فارسی به صورت base64
- ✅ استفاده از `@page` برای تنظیمات صفحه (A5)
- ✅ تبدیل اعداد به فارسی قبل از رندر

### 9. **اجرای خودکار سفارشات**
- ✅ Signal Handler برای بررسی هنگام به‌روزرسانی قیمت
- ✅ متد `check_and_execute_pending_orders()` در TradeService
- ✅ استفاده از `@transaction.atomic` برای اطمینان از atomicity
- ✅ بررسی موجودی قابل استفاده قبل از اجرا

### 10. **محاسبه حاشیه سود و سود خالص**
- ✅ قیمت نهایی = قیمت پایه + حاشیه سود (همان قیمتی که کاربر می‌بیند)
- ✅ کاربر با قیمت نهایی معامله می‌کند (بدون کارمزد اضافی)
- ✅ سود حاشیه = حاشیه سود × مقدار (گرم) - در زمان معامله محاسبه و در فیلد `margin_profit` ذخیره می‌شود
- ✅ محاسبه سود خالص = مجموع `margin_profit` از تمام معاملات موفق
- ✅ نمایش سود خالص در پنل مدیریت با واحد ریال

---

## 🎯 پیشنهادات برای ادامه کار

### ✅ **گام 1: پیاده‌سازی سیستم معاملات (Trade System)** - **تکمیل شده**

#### ✅ الف) ایجاد مدل‌ها:
- ✅ `GoldPrice` - مدیریت قیمت‌های لحظه‌ای با حاشیه سود
- ✅ `Trade` - ذخیره معاملات خرید و فروش
- ✅ `Order` - سفارشات هوشمند (Limit Orders)

#### ✅ ب) ایجاد API endpoints:
- ✅ `POST /api/trades/buy/` - خرید فوری
- ✅ `POST /api/trades/sell/` - فروش فوری
- ✅ `POST /api/trades/orders/` - ثبت سفارش هوشمند
- ✅ `GET /api/trades/orders/` - دریافت لیست سفارشات
- ✅ `DELETE /api/trades/orders/<id>/` - لغو سفارش
- ✅ `GET /api/trades/` - تاریخچه معاملات
- ✅ `GET /api/trades/price/` - قیمت فعلی طلا
- ✅ `GET /api/trades/<id>/invoice/` - دانلود فاکتور PDF
- ✅ Admin endpoints برای مدیریت معاملات و قیمت

#### ✅ ج) منطق کسب و کار:
- ✅ بررسی موجودی قبل از معامله
- ✅ کسر/افزودن موجودی بعد از معامله موفق
- ✅ تولید کد رهگیری و شماره فاکتور
- ✅ اجرای خودکار سفارشات هوشمند (Signal Handler)

---

### ✅ **گام 2: اتصال فرانت‌اند به بک‌اند** - **تکمیل شده**

#### ✅ الف) ایجاد API functions:
- ✅ `tradesAPI` - تمام API های مربوط به معاملات
- ✅ `adminTradesAPI` - API های مدیریتی

#### ✅ ب) به‌روزرسانی صفحات:
- ✅ `/dashboard/trade` → استفاده از `tradesAPI`
- ✅ `/dashboard/history` → استفاده از `tradesAPI.getTrades()`
- ✅ `/admin/trades` → استفاده از `adminTradesAPI`

---

### **گام 3: سیستم قیمت‌گذاری**

#### گزینه 1: قیمت دستی (توسط مدیر)
- API برای به‌روزرسانی قیمت
- نمایش در پنل مدیریت

#### گزینه 2: قیمت خودکار (از API خارجی)
- اتصال به API قیمت طلا
- به‌روزرسانی خودکار با Celery/Cron

---

### **گام 4: تولید فاکتور PDF** ✅ **تکمیل شده**

#### پیاده‌سازی:
- ✅ استفاده از **WeasyPrint** برای تولید PDF در Backend
- ✅ Template HTML/CSS برای طراحی حرفه‌ای فاکتور
- ✅ پشتیبانی کامل از فونت فارسی (IRANYekan)
- ✅ Embed کردن فونت به صورت base64 در CSS
- ✅ دانلود فاکتور در پنل کاربری و مدیریت
- ✅ طراحی Responsive و بهینه برای A5
- ✅ ذخیره‌سازی On-the-Fly (تولید در لحظه، بدون ذخیره در DB)

---

## 📝 نکات مهم برای ادامه کار

1. **همیشه از الگوهای موجود استفاده کنید:**
   - تبدیل اعداد به فارسی: `toPersianDigits()`
   - تبدیل تاریخ: `*_jalali` fields
   - Query optimization: `select_related()`, `prefetch_related()`
   - Image URLs: `SerializerMethodField` + `request.build_absolute_uri()`

2. **قبل از شروع هر بخش جدید:**
   - بررسی کنید آیا مدل/API مشابهی وجود دارد
   - از الگوهای موجود استفاده کنید
   - Query optimization را فراموش نکنید

3. **تست کنید:**
   - در حالت موبایل
   - با اعداد فارسی
   - با تاریخ‌های شمسی
   - با تصاویر

4. **مستندسازی:**
   - کامنت‌های واضح برای منطق پیچیده
   - Docstrings برای functions

---

## 🚀 وضعیت پیاده‌سازی

### ✅ **فاز 1: سیستم معاملات (Trade System)** - **تکمیل شده**
- ✅ پیاده‌سازی مدل‌های Trade و Order
- ✅ API endpoints برای معاملات
- ✅ منطق کسب و کار (بررسی موجودی، کسر/افزودن)
- ✅ سیستم قیمت‌گذاری با حاشیه سود
- ✅ اجرای خودکار سفارشات هوشمند (Signal Handler)

### ✅ **فاز 2: اتصال فرانت‌اند** - **تکمیل شده**
- ✅ اتصال فرانت‌اند به بک‌اند
- ✅ صفحه معامله هوشمند (`/dashboard/trade`)
- ✅ صفحه تاریخچه معاملات (`/dashboard/history`)
- ✅ صفحه مانیتورینگ معاملات (`/admin/trades`)
- ✅ تست end-to-end

### ✅ **فاز 3: تولید فاکتور PDF** - **تکمیل شده**
- ✅ سیستم قیمت‌گذاری
- ✅ تولید فاکتور PDF با WeasyPrint
- ✅ طراحی حرفه‌ای فاکتور
- ✅ دانلود فاکتور در پنل کاربری و مدیریت

### ✅ **فاز 4: سیستم جدید واریز با چند حساب مقصد** - **تکمیل شده**
- ✅ پیاده‌سازی مدل‌های `DepositAccountAssignment`, `DepositReceipt`, `DepositWithdrawalLink`
- ✅ API endpoints برای تخصیص حساب‌ها و آپلود دسته‌ای فیش‌ها
- ✅ تایید خودکار درخواست‌های برداشت
- ✅ نمایش فیش‌های واریزی در پنل مدیریت و کاربری
- ✅ بهبود UI/UX برای آپلود فیش‌ها

### ⚠️ **فاز 5: بهینه‌سازی و امنیت** - **در حال انجام**
- ✅ Query optimization
- ⚠️ Rate limiting برای API
- ⚠️ Logging و monitoring بهتر
- ⚠️ Unit tests و Integration tests

---

## 📋 تغییرات اخیر (1404/10/06)

### ✅ **سیستم معاملات:**
1. **پیاده‌سازی کامل Trade System:**
   - مدل‌های `GoldPrice`, `Trade`, `Order`
   - API endpoints برای معاملات فوری و سفارشات هوشمند
   - منطق کسب و کار در `TradeService`

2. **اجرای خودکار سفارشات:**
   - Signal Handler برای بررسی سفارشات هنگام به‌روزرسانی قیمت
   - متد `check_and_execute_pending_orders()` برای بررسی دوره‌ای
   - اجرای خودکار وقتی قیمت به هدف می‌رسد

3. **سیستم قیمت‌گذاری:**
   - قیمت پایه + حاشیه سود = قیمت نهایی
   - مدیریت قیمت توسط Admin
   - تاریخچه قیمت‌ها برای نمودار

### ✅ **سیستم فاکتور PDF:**
1. **تولید PDF با WeasyPrint:**
   - پشتیبانی کامل از فونت فارسی (IRANYekan)
   - طراحی حرفه‌ای با HTML/CSS
   - Embed کردن فونت به صورت base64

2. **دسترسی به فاکتور:**
   - دانلود در پنل کاربری (`/dashboard/history`)
   - نمایش و دانلود در پنل مدیریت (`/admin/trades`)
   - Admin می‌تواند فاکتور هر معامله‌ای را ببیند

3. **بهبود UI:**
   - اصلاح طراحی فاکتور برای A5
   - بهبود فاصله‌گذاری و typography
   - جلوگیری از wrap شدن محتوا

### ✅ **بهبودهای Frontend:**
1. **صفحه معامله هوشمند:**
   - اتصال کامل به Backend
   - نمایش سفارشات با UI بهینه
   - جلوگیری از wrap شدن در موبایل
   - تبدیل تاریخ و اعداد به فارسی

2. **پنل مدیریت:**
   - نمایش تاریخ و زمان به فارسی
   - نمایش فاکتور در لیست معاملات
   - بهبود UX و طراحی
   - اتصال اطلاعات واقعی کیف پول و آمار معاملات در مودال جزئیات کاربر
   - محاسبه و نمایش سود خالص بر اساس کارمزدهای دریافتی

3. **صفحه اصلی Dashboard:**
   - اتصال اطلاعات واقعی کیف پول در هدر
   - اتصال تراکنش‌های اخیر به API
   - اتصال دکمه‌های واریز و برداشت به صفحه کیف پول

---

### ✅ **سیستم موجودی مسدود شده (Pending Balance):**
1. **مدیریت موجودی در انتظار برداشت:**
   - افزودن فیلدهای `pending_withdrawal_rial` و `pending_withdrawal_gold` به مدل `Wallet`
   - کسر موجودی در زمان ایجاد درخواست برداشت
   - جلوگیری از استفاده موجودی در انتظار برداشت در معاملات
   - برگرداندن موجودی در صورت رد درخواست توسط مدیر

2. **منطق موجودی قابل استفاده:**
   - موجودی قابل استفاده = موجودی کل - موجودی مسدود شده
   - بررسی موجودی قابل استفاده در تمام معاملات
   - نمایش موجودی قابل استفاده در API

### ✅ **اصلاح محاسبه کارمزد و سود:**
1. **محاسبه کارمزد بر اساس حاشیه سود:**
   - تغییر از محاسبه درصدی به محاسبه بر اساس حاشیه سود (ریالی)
   - کارمزد خرید = `buy_margin × مقدار (گرم)`
   - کارمزد فروش = `sell_margin × مقدار (گرم)`

2. **محاسبه سود خالص:**
   - سود خالص = مجموع کارمزدهای دریافتی از تمام معاملات موفق
   - نمایش در پنل مدیریت با واحد ریال

### ✅ **بهینه‌سازی پنل تنظیمات سیستم:**
1. **ساده‌سازی و سازماندهی تب‌ها:**
   - **تب "قیمت و بازار":** مدیریت قیمت طلا + Kill Switch (فعال/غیرفعال کردن معاملات)
   - **تب "مالی":** فقط مدیریت حساب‌های بانکی واریز (DepositAccount)
   - **تب "عمومی":** فقط شماره مدیران برای دریافت پیامک + آدرس مراجعه حضوری
   - **تب "اعلان‌ها":** آماده برای پیاده‌سازی
   - حذف تب‌های غیرضروری: "تنظیمات بازار"، "امنیتی"، "کاربران"

2. **مدیریت حساب‌های بانکی واریز:**
   - ایجاد مدل `DepositAccount` در app `settings`
   - CRUD کامل در Django Admin
   - نمایش لیست حساب‌های فعال در پنل کاربری (تب واریز)
   - امکان فعال/غیرفعال کردن حساب‌ها
   - ترتیب نمایش حساب‌ها

3. **بهبود UX:**
   - استفاده از مودال تایید برای Kill Switch (مشابه پنل اصلی)
   - فرمت کردن قیمت‌ها با جداکننده هزارگان و اعداد فارسی
   - نمایش تاریخ و ساعت آخرین بروزرسانی قیمت به فارسی

---

---

## 📋 تغییرات اخیر (1404/10/15)

### ✅ **سیستم جدید واریز با چند حساب مقصد:**

1. **تغییر فرآیند واریز:**
   - کاربر فقط مبلغ را وارد می‌کند و درخواست ایجاد می‌شود
   - مدیر حساب‌های مقصد را تخصیص می‌دهد (درخواست‌های برداشت دیگر کاربران، حساب‌های پیش‌تعریف شده، یا حساب‌های سفارشی)
   - کاربر فیش‌های واریزی را برای هر حساب مقصد آپلود می‌کند
   - مدیر درخواست را تایید می‌کند و کیف پول شارژ می‌شود

2. **مدل‌های جدید:**
   - `DepositAccountAssignment`: تخصیص حساب‌های مقصد به درخواست واریز
   - `DepositReceipt`: فیش‌های واریزی برای هر assignment
   - `DepositWithdrawalLink`: لینک بین فیش واریزی و درخواست برداشت (برای تایید خودکار)

3. **ویژگی‌های جدید:**
   - آپلود دسته‌ای فیش‌های واریزی (یک دکمه برای همه)
   - نمایش کامل اطلاعات حساب (نام صاحب حساب، نام بانک، شماره کارت کامل، شماره شبا)
   - قابلیت کپی شماره حساب و شبا
   - فرمت کردن مبالغ با جداکننده هزارگان
   - نمایش فیش‌های واریزی در پنل مدیریت و کاربری برای درخواست‌های برداشت خودکار تایید شده

4. **تایید خودکار درخواست‌های برداشت:**
   - وقتی کاربر به حساب مقصد (درخواست برداشت دیگر کاربر) واریز می‌کند
   - و مدیر درخواست واریز را تایید می‌کند
   - درخواست برداشت به صورت خودکار تایید می‌شود
   - موجودی مسدود شده آزاد می‌شود
   - پیامک به کاربر درخواست کننده برداشت ارسال می‌شود

5. **نمایش فیش‌های واریزی:**
   - در پنل مدیریت: در مودال جزئیات درخواست برداشت (برای درخواست‌های خودکار تایید شده)
   - در پنل کاربری: در تب تاریخچه تراکنش‌ها (برای درخواست‌های برداشت خودکار تایید شده)
   - نمایش اطلاعات واریزکننده (نام، شماره موبایل، کد حساب)
   - نمایش تصویر فیش واریزی

6. **بهبودهای UI/UX:**
   - حذف حساب ثابت مدیر از پنل کاربری
   - نمایش فقط حساب‌های تخصیص داده شده (pending)
   - استفاده از `<bdi>` برای نمایش صحیح اعداد در محیط RTL
   - بهبود فرمت نمایش مبالغ و تاریخ‌ها

7. **سیستم پیامک:**
   - پیامک به کاربر بعد از تایید درخواست واریز
   - پیامک به مدیر بعد از آپلود فیش‌های واریزی
   - پیامک به کاربر درخواست کننده برداشت بعد از تایید خودکار

8. **بهینه‌سازی دیتابیس:**
   - نگه داشتن `assignments` برای حفظ `receipts` و `links` (دیگر حذف نمی‌شوند)
   - استفاده از `prefetch_related` برای بهینه‌سازی query ها
   - استفاده از `transaction.atomic()` برای اطمینان از atomicity

---

---

## 📋 تغییرات اخیر (1404/10/16)

### ✅ **اصلاح منطق محاسبه حاشیه سود و سود خالص:**

1. **منطق جدید قیمت‌گذاری:**
   - قیمت نهایی = قیمت پایه + حاشیه سود (همان قیمتی که کاربر می‌بیند)
   - کاربر با قیمت نهایی معامله می‌کند (بدون کارمزد اضافی)
   - هیچ مبلغ اضافی در حین معامله اضافه یا کم نمی‌شود
   - `fee` در دیتابیس = 0 (چون حاشیه سود قبلاً در قیمت نهایی است)

2. **ذخیره سود حاشیه در دیتابیس:**
   - اضافه کردن فیلد `margin_profit` به مدل `Trade`
   - محاسبه سود حاشیه در زمان ایجاد معامله: `margin_profit = حاشیه سود × مقدار (گرم)`
   - ذخیره در دیتابیس برای گزارش‌گیری و تحلیل‌های آینده
   - Migration ایجاد و اعمال شد (`0004_trade_margin_profit.py`)

3. **محاسبه و نمایش سود خالص:**
   - سود خالص = مجموع `margin_profit` از تمام معاملات موفق
   - نمایش در پنل مدیریت (بخش مانیتورینگ معاملات)
   - استفاده از `margin_profit` به جای `fee` برای محاسبه سود

4. **تغییرات در `TradeService`:**
   - `execute_instant_trade`: استفاده از `final_price` برای محاسبه `total`، محاسبه و ذخیره `margin_profit`
   - `execute_trade_with_price`: `price` به عنوان قیمت نهایی در نظر گرفته می‌شود، محاسبه و ذخیره `margin_profit`
   - `create_limit_order`: مقایسه `target_price` با `final_price` (نه `base_price`)
   - `execute_limit_order`: مقایسه با `current_final_price`

5. **به‌روزرسانی Serializer و Frontend:**
   - اضافه کردن `margin_profit` به `TradeSerializer`
   - اضافه کردن `margin_profit` به interface `Trade` در frontend
   - استفاده از `margin_profit` برای نمایش سود خالص در پنل مدیریت

---

**تاریخ به‌روزرسانی:** 1404/10/16
**نسخه:** 2.4

