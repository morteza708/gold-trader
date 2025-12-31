# 🔧 الگوها و استانداردهای کدنویسی

این فایل شامل الگوهای رایج و قابل استفاده مجدد در پروژه است.

---

## 📊 تبدیل اعداد به فارسی/انگلیسی

### Frontend (`frontend/lib/utils/numberUtils.ts`)

```typescript
import { toPersianDigits, toEnglishDigits, formatNumber } from '@/lib/utils/numberUtils';

// تبدیل به فارسی (برای نمایش)
const persian = toPersianDigits(1234567); // "۱۲۳۴۵۶۷"
const formatted = toPersianDigits((1234567).toLocaleString()); // "۱,۲۳۴,۵۶۷"

// تبدیل به انگلیسی (برای پردازش)
const english = toEnglishDigits("۱۲۳۴۵۶۷"); // "1234567"
// همچنین نقطه اعشار فارسی (٫) را به (.) تبدیل می‌کند

// فرمت با کاما
const withComma = formatNumber("1234567"); // "1,234,567"
```

### الگو در Input Fields:
```typescript
<Input 
  value={toPersianDigits(amount)} // نمایش فارسی
  onChange={(e) => {
    const english = toEnglishDigits(e.target.value); // تبدیل به انگلیسی
    setAmount(english); // ذخیره انگلیسی
  }}
/>
```

### الگو در نمایش مبالغ:
```typescript
// ریال
{toPersianDigits(amount.toLocaleString())} ریال

// طلا
{toPersianDigits(amount.toFixed(3))} گرم
```

---

## 📅 تبدیل تاریخ به شمسی

### Backend

```python
from jalali_date import datetime2jalali
from django_jalali.db import models as jmodels

# در Model
birth_date = jmodels.jDateField(...)

# در Serializer
class MySerializer(serializers.ModelSerializer):
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None

# در Admin
def get_jalali_created_at(self, obj):
    if obj.created_at:
        jalali_date = datetime2jalali(obj.created_at)
        return jalali_date.strftime('%Y/%m/%d %H:%M')
    return '-'
get_jalali_created_at.short_description = 'تاریخ ایجاد'
```

### Frontend

```typescript
// از API فیلد *_jalali را دریافت کنید
const date = request.created_at_jalali; // "1403/10/03 14:30"
// یا
const date = toPersianDigits(request.created_at_jalali);
```

---

## 🖼️ مدیریت تصاویر (Image URLs)

### Backend Serializer

```python
class MySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None
```

### Backend View

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_view(request):
    obj = MyModel.objects.get(...)
    serializer = MySerializer(obj, context={'request': request})
    return Response(serializer.data)
```

### Frontend

```typescript
// استفاده از image_url از API
<img src={request.image_url || '/placeholder.png'} alt="..." />
```

---

## 💰 فرمت کردن مبالغ

### Backend (برای SMS)

```python
# ریال با سه رقم جداکننده
formatted_amount = f"{int(amount):,}"  # 5000000 -> "5,000,000"

# در SMS template
message = f"مبلغ {formatted_amount} ریال واریز شد."
```

### Frontend

```typescript
// ریال
const formatted = Number(amount).toLocaleString(); // 5000000 -> "5,000,000"
const display = toPersianDigits(formatted) + " ریال"; // "۵,۰۰۰,۰۰۰ ریال"

// طلا
const formatted = Number(amount).toFixed(3); // 2.5 -> "2.500"
const display = toPersianDigits(formatted) + " گرم"; // "۲.۵۰۰ گرم"
```

---

## 🔍 Query Optimization

### اصول کلی:

#### 1. **select_related() - برای ForeignKey و OneToOne**

```python
# ❌ بد - N+1 Query Problem
trades = Trade.objects.all()
for trade in trades:
    print(trade.user.phone_number)  # هر بار یک query جدید!

# ✅ خوب - یک query برای همه
trades = Trade.objects.select_related('user').all()
for trade in trades:
    print(trade.user.phone_number)  # همه در یک query
```

**زمان استفاده:**
- وقتی به فیلدهای ForeignKey نیاز دارید
- برای OneToOne relationships
- فقط یک سطح عمق (نه بیشتر از 2-3 سطح)

```python
# چند سطحی
queryset = Trade.objects.select_related(
    'user',                    # ForeignKey
    'user__customer_profile',  # OneToOne از user
    'executed_trade'          # OneToOne
)
```

---

#### 2. **prefetch_related() - برای ManyToMany و reverse ForeignKey**

```python
# ❌ بد
users = CustomUser.objects.all()
for user in users:
    print(user.trades.count())  # هر بار یک query جدید!

# ✅ خوب
users = CustomUser.objects.prefetch_related('trades').all()
for user in users:
    print(user.trades.count())  # همه در یک query
```

**زمان استفاده:**
- برای reverse ForeignKey (related_name)
- برای ManyToMany relationships
- وقتی به مجموعه‌ای از objects نیاز دارید

```python
# ترکیب
queryset = CustomUser.objects.prefetch_related(
    'trades',              # reverse ForeignKey
    'orders',              # reverse ForeignKey
    'bank_cards'           # reverse ForeignKey
)
```

---

#### 3. **only() و defer() - انتخاب فیلدهای خاص**

```python
# فقط فیلدهای مورد نیاز را بارگذاری کنید
queryset = Trade.objects.only('id', 'amount', 'price', 'status')

# فیلدهای غیرضروری را حذف کنید
queryset = Trade.objects.defer('admin_note', 'updated_at')
```

**زمان استفاده:**
- وقتی جدول فیلدهای زیادی دارد
- وقتی به همه فیلدها نیاز ندارید
- برای کاهش حجم داده‌های انتقالی

---

#### 4. **select_for_update() - برای Race Conditions**

```python
from django.db import transaction

@transaction.atomic
def update_balance(user, amount):
    # قفل کردن رکورد تا transaction تمام شود
    wallet = Wallet.objects.select_for_update().get(user=user)
    wallet.rial_balance += amount
    wallet.save()
```

**زمان استفاده:**
- برای عملیات مالی (کیف پول، موجودی)
- وقتی چند request همزمان ممکن است یک رکورد را تغییر دهند
- همیشه با `@transaction.atomic` استفاده کنید

---

#### 5. **Indexes در Models - برای جستجوی سریع**

```python
class Trade(models.Model):
    user = models.ForeignKey(CustomUser, db_index=True)
    status = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            # Index ترکیبی برای کوئری‌های رایج
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['trade_type', 'status']),
        ]
```

**زمان استفاده:**
- برای فیلدهایی که زیاد جستجو می‌شوند
- برای فیلدهای مرتب‌سازی (ordering)
- برای فیلترهای ترکیبی

---

#### 6. **count() vs len() - انتخاب درست**

```python
# ❌ بد - همه objects را از دیتابیس می‌آورد
queryset = Trade.objects.filter(status='SUCCESS')
count = len(queryset)  # SELECT * FROM trades WHERE ...

# ✅ خوب - فقط count را می‌گیرد
count = Trade.objects.filter(status='SUCCESS').count()  # SELECT COUNT(*) FROM ...
```

**نکته:** اگر قبلاً queryset را گرفته‌اید و در memory است، `len()` بهتر است.

---

#### 7. **exists() - برای بررسی وجود**

```python
# ❌ بد
if Trade.objects.filter(user=user).count() > 0:
    ...

# ✅ خوب
if Trade.objects.filter(user=user).exists():
    ...
```

---

#### 8. **bulk_create() و bulk_update() - برای عملیات دسته‌ای**

```python
# ❌ بد - N queries
for item in items:
    Trade.objects.create(...)

# ✅ خوب - 1 query
Trade.objects.bulk_create(trades)
```

---

### مثال کامل و بهینه:

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_trades_list(request):
    """
    لیست معاملات با بهینه‌سازی کامل
    """
    # 1. استفاده از select_related برای ForeignKey
    # 2. استفاده از prefetch_related برای reverse relations
    # 3. استفاده از only برای فیلدهای مورد نیاز
    # 4. استفاده از indexes برای مرتب‌سازی
    
    queryset = Trade.objects.select_related(
        'user',
        'user__customer_profile',
        'executed_trade'
    ).prefetch_related(
        'order'  # اگر reverse relation وجود دارد
    ).only(
        'id', 'trade_type', 'amount', 'price', 'total',
        'status', 'tracking_code', 'invoice_number',
        'created_at'
    ).order_by('-created_at')
    
    # فیلتر کردن (از indexes استفاده می‌کند)
    status = request.query_params.get('status')
    if status:
        queryset = queryset.filter(status=status)
    
    trade_type = request.query_params.get('type')
    if trade_type:
        queryset = queryset.filter(trade_type=trade_type)
    
    # Pagination (برای جلوگیری از بارگذاری همه داده‌ها)
    from django.core.paginator import Paginator
    paginator = Paginator(queryset, 50)  # 50 item per page
    page = paginator.get_page(request.query_params.get('page', 1))
    
    serializer = TradeSerializer(
        page.object_list, 
        many=True, 
        context={'request': request}
    )
    
    return Response({
        'results': serializer.data,
        'count': paginator.count,
        'next': page.next_page_number() if page.has_next() else None,
        'previous': page.previous_page_number() if page.has_previous() else None,
    })
```

---

### Checklist برای هر Query:

- [ ] آیا به ForeignKey نیاز دارم؟ → `select_related()`
- [ ] آیا به reverse relations نیاز دارم؟ → `prefetch_related()`
- [ ] آیا به همه فیلدها نیاز دارم؟ → `only()` یا `defer()`
- [ ] آیا عملیات مالی است؟ → `select_for_update()`
- [ ] آیا فیلدهای پرجستجو index دارند؟ → اضافه کردن `db_index=True`
- [ ] آیا کوئری‌های ترکیبی دارم؟ → اضافه کردن `Index` در Meta
- [ ] آیا تعداد زیادی record دارم؟ → استفاده از Pagination
- [ ] آیا فقط بررسی وجود نیاز دارم؟ → `exists()` به جای `count() > 0`

---

### ابزارهای Debug:

```python
# فعال کردن query logging
from django.db import connection
from django.db import reset_queries

reset_queries()
# ... کد شما ...
print(f"تعداد queries: {len(connection.queries)}")
for query in connection.queries:
    print(query['sql'])
```

**یا استفاده از django-debug-toolbar:**
```python
# settings.py
INSTALLED_APPS = [
    ...
    'debug_toolbar',
]

# urls.py
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
```

---

### نکات مهم:

1. **N+1 Query Problem:**
   - همیشه از `select_related()` و `prefetch_related()` استفاده کنید
   - قبل از deploy، تعداد queries را بررسی کنید

2. **Indexes:**
   - فقط برای فیلدهای پرجستجو index اضافه کنید
   - Index زیاد = کندی در INSERT/UPDATE

3. **Pagination:**
   - همیشه برای لیست‌های بزرگ از pagination استفاده کنید
   - پیش‌فرض: 20-50 item per page

4. **Caching:**
   - برای داده‌های ثابت (مثل قیمت طلا) از cache استفاده کنید
   ```python
   from django.core.cache import cache
   
   price = cache.get('current_gold_price')
   if not price:
       price = GoldPrice.get_current_price()
       cache.set('current_gold_price', price, 60)  # 60 ثانیه
   ```

5. **QuerySet Lazy Evaluation:**
   - QuerySets تا زمانی که evaluate نشوند، query اجرا نمی‌کنند
   - Evaluation در: `list()`, `len()`, `for`, `[0]`, `exists()`, `count()`

---

## 📱 SMS با Kavenegar

### الگو:

```python
from kavenegar import KavenegarAPI, APIException, HTTPException

api = KavenegarAPI(settings.KAVENEGAR_API_KEY)

try:
    # فرمت کردن اعداد برای SMS
    formatted_amount = f"{int(amount):,}"
    
    params = {
        'receptor': user.phone_number,
        'template': 'template-name',
        'token': value1,
        'token2': formatted_amount,  # برای مبالغ ریالی
        'token3': value3,
    }
    
    response = api.sms_send(params)
except APIException as e:
    print(f"API Exception: {e}")
except HTTPException as e:
    print(f"HTTP Exception: {e}")
```

---

## 🎨 فرمت کردن در Admin Panel

### Backend Admin

```python
@admin.register(MyModel)
class MyModelAdmin(admin.ModelAdmin):
    list_display = ['get_formatted_amount', 'get_jalali_created_at']
    
    def get_formatted_amount(self, obj):
        return f"{obj.amount:,} ریال"
    get_formatted_amount.short_description = 'مبلغ'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'
```

---

## 🔐 Permission Classes

### الگوهای رایج:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

# فقط کاربران لاگین شده
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    ...

# فقط ادمین‌ها
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_view(request):
    ...

# عمومی (بدون نیاز به لاگین)
@api_view(['GET'])
def public_view(request):
    ...
```

---

## 📝 Serializer Patterns

### با SerializerMethodField:

```python
class MySerializer(serializers.ModelSerializer):
    custom_field = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    
    def get_custom_field(self, obj):
        # منطق سفارشی
        return f"{obj.field1} - {obj.field2}"
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None
    
    class Meta:
        model = MyModel
        fields = ['id', 'custom_field', 'image_url', ...]
```

---

## 🎯 API Client Pattern (Frontend)

### الگو:

```typescript
// frontend/lib/api/auth.ts
import apiClient from './client';

export const myAPI = {
  getList: async (): Promise<MyType[]> => {
    const response = await apiClient.get<MyType[]>('/my-endpoint/');
    return response.data;
  },
  
  create: async (data: CreateData): Promise<MyType> => {
    const response = await apiClient.post<MyType>('/my-endpoint/', data);
    return response.data;
  },
  
  update: async (id: number, data: UpdateData): Promise<MyType> => {
    const response = await apiClient.put<MyType>(`/my-endpoint/${id}/`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/my-endpoint/${id}/`);
  },
};
```

---

## 🎭 Modal Pattern (Frontend)

### الگو با Framer Motion:

```typescript
import { motion, AnimatePresence } from 'framer-motion';

function MyModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="bg-white rounded-3xl p-6 relative z-10 max-w-md w-full"
      >
        {/* Content */}
        <button onClick={onClose}>بستن</button>
      </motion.div>
    </div>
  );
}
```

---

## 🔄 State Management Pattern (Frontend)

### با Context:

```typescript
// contexts/MyContext.tsx
const MyContext = createContext<MyContextType | undefined>(undefined);

export function MyProvider({ children }) {
  const [state, setState] = useState<StateType>(initialState);
  
  const updateState = useCallback((newState: Partial<StateType>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);
  
  return (
    <MyContext.Provider value={{ state, updateState }}>
      {children}
    </MyContext.Provider>
  );
}

export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) throw new Error('useMyContext must be used within MyProvider');
  return context;
}
```

---

## ✅ Validation Patterns

### Backend:

```python
from rest_framework import serializers

class MySerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("مبلغ باید بیشتر از صفر باشد")
        return value
```

### Frontend:

```typescript
const validateAmount = (amount: string): boolean => {
  const num = Number(toEnglishDigits(amount));
  return num > 0 && !isNaN(num);
};

if (!validateAmount(amount)) {
  toast.error("مبلغ نامعتبر است");
  return;
}
```

---

## 🎨 Badge/Status Pattern (Frontend)

```typescript
function StatusBadge({ status }: { status: string }) {
  const config = {
    SUCCESS: { label: 'موفق', className: 'bg-green-50 text-green-600 border-green-100' },
    PENDING: { label: 'در انتظار', className: 'bg-orange-50 text-orange-600 border-orange-100' },
    REJECTED: { label: 'رد شده', className: 'bg-red-50 text-red-600 border-red-100' },
  };
  
  const { label, className } = config[status] || config.PENDING;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${className} inline-block whitespace-nowrap`}>
      {label}
    </span>
  );
}
```

---

## 📋 Checklist برای هر Feature جدید

- [ ] تبدیل اعداد به فارسی در نمایش
- [ ] تبدیل تاریخ به شمسی
- [ ] Query optimization (select_related/prefetch_related)
- [ ] Image URLs با SerializerMethodField
- [ ] Error handling مناسب
- [ ] Toast notifications در Frontend
- [ ] تست در حالت موبایل
- [ ] تست با اعداد فارسی
- [ ] Permission classes مناسب

---

**نکته:** این الگوها باید در تمام بخش‌های جدید پروژه استفاده شوند تا یکپارچگی و سازگاری حفظ شود.

