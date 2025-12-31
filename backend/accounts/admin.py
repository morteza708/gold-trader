from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from jalali_date import datetime2jalali
from jalali_date.widgets import AdminJalaliDateWidget
from jalali_date.fields import JalaliDateField
from .models import CustomUser, UserRole, CustomerProfile
from .services import send_message


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = [
        'get_avatar_thumbnail',
        'phone_number',
        'first_name',
        'last_name',
        'role',
        'get_account_code',
        'get_verification_status',
        'is_phone_verified',
        'profile_completed',
        'is_active',
        'get_jalali_date_joined'
    ]
    list_filter = [
        'role',
        'is_phone_verified',
        'profile_completed',
        'is_active',
        'is_staff',
        'is_superuser',
        'date_joined',
        ('avatar', admin.EmptyFieldListFilter),
        ('national_card_image', admin.EmptyFieldListFilter),
    ]
    search_fields = [
        'phone_number',
        'first_name',
        'last_name',
        'national_id',
        'email'
    ]
    ordering = ['-date_joined']
    
    def get_fieldsets(self, request, obj=None):
        """محدود کردن دسترسی به فیلد role فقط برای سوپر ادمین"""
        # برای ویرایش کاربر موجود
        fieldsets = (
            (None, {'fields': ('phone_number', 'password')}),
            ('اطلاعات شخصی', {
                'fields': (
                    'first_name',
                    'last_name',
                    'email',
                    'national_id',
                    'national_card_image',
                    'birth_date',
                    'avatar',
                    'get_avatar_preview'
                )
            }),
            ('وضعیت احراز هویت', {
                'fields': (
                    'is_phone_verified',
                    'get_national_id_status',
                    'profile_completed',
                    'get_verification_summary'
                ),
                'description': 'وضعیت احراز هویت و تکمیل اطلاعات کاربر'
            }),
            ('وضعیت', {
                'fields': (
                    'is_active',
                    'is_staff',
                    'is_superuser'
                )
            }),
            ('OTP', {
                'fields': (
                    'otp_code',
                    'otp_code_created'
                ),
                'classes': ('collapse',)
            }),
            ('تاریخ‌ها', {
                'fields': (
                    'get_jalali_date_joined',
                    'get_jalali_last_login'
                )
            }),
            ('دسترسی‌ها', {
                'fields': (
                    'groups',
                    'user_permissions'
                )
            }),
        )
        
        # فقط سوپر ادمین می‌تواند نقش را ببیند و تغییر دهد
        if request.user.is_superuser:
            # اضافه کردن role به بخش وضعیت
            status_fields = list(fieldsets[2][1]['fields'])
            status_fields.insert(0, 'role')
            fieldsets_list = list(fieldsets)
            fieldsets_list[2] = ('وضعیت', {'fields': tuple(status_fields)})
            fieldsets = tuple(fieldsets_list)
        
        return fieldsets
    
    def get_add_fieldsets(self, request, obj=None):
        """محدود کردن دسترسی به فیلد role در فرم ایجاد کاربر جدید"""
        if request.user.is_superuser:
            return (
                (None, {
                    'classes': ('wide',),
                    'fields': ('phone_number', 'password1', 'password2', 'role'),
                }),
            )
        else:
            # برای مدیر سایت، نقش پیش‌فرض CUSTOMER است
            return (
                (None, {
                    'classes': ('wide',),
                    'fields': ('phone_number', 'password1', 'password2'),
                }),
            )
    
    def get_readonly_fields(self, request, obj=None):
        """برای کاربران جدید، برخی فیلدها readonly نیستند"""
        readonly = list(self.readonly_fields)
        if obj is None:  # کاربر جدید
            readonly.remove('date_joined')
            readonly.remove('get_jalali_date_joined')
        
        # فقط سوپر ادمین می‌تواند نقش را تغییر دهد
        if not request.user.is_superuser:
            if 'role' not in readonly:
                readonly.append('role')
        
        return readonly
    
    def save_model(self, request, obj, form, change):
        """تنظیم نقش پیش‌فرض CUSTOMER برای کاربران جدید ایجاد شده توسط مدیر سایت"""
        if not change:  # کاربر جدید
            if not request.user.is_superuser and not obj.role:
                # اگر مدیر سایت است و نقش مشخص نشده، نقش CUSTOMER تنظیم می‌شود
                obj.role = UserRole.CUSTOMER
        super().save_model(request, obj, form, change)
    
    
    def get_form(self, request, obj=None, **kwargs):
        """استفاده از widget تاریخ شمسی برای birth_date"""
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['birth_date'] = JalaliDateField(
            label='تاریخ تولد',
            widget=AdminJalaliDateWidget
        )
        return form
    
    def get_jalali_date_joined(self, obj):
        """نمایش تاریخ عضویت به شمسی"""
        if obj.date_joined:
            jalali_date = datetime2jalali(obj.date_joined)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_date_joined.short_description = 'تاریخ عضویت'
    
    def get_jalali_last_login(self, obj):
        """نمایش آخرین ورود به شمسی"""
        if obj.last_login:
            jalali_date = datetime2jalali(obj.last_login)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_last_login.short_description = 'آخرین ورود'
    
    def get_account_code(self, obj):
        """نمایش کد حساب مشتری"""
        if obj.role == UserRole.CUSTOMER and hasattr(obj, 'customer_profile'):
            return obj.customer_profile.account_code
        return '-'
    get_account_code.short_description = 'کد حساب'
    get_account_code.admin_order_field = 'customer_profile__account_code'
    
    def get_avatar_thumbnail(self, obj):
        """نمایش thumbnail آواتار در لیست"""
        if obj.avatar:
            return format_html(
                '<img src="{}" width="40" height="40" style="border-radius: 50%; object-fit: cover;" />',
                obj.avatar.url
            )
        return format_html(
            '<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #f2d479); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">👤</div>'
        )
    get_avatar_thumbnail.short_description = 'آواتار'
    
    def get_avatar_preview(self, obj):
        """نمایش پیش‌نمایش آواتار در فرم"""
        if obj.avatar:
            return format_html(
                '<img src="{}" width="120" height="120" style="border-radius: 50%; object-fit: cover; border: 3px solid #d4af37;" />',
                obj.avatar.url
            )
        return format_html(
            '<div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #f2d479); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">👤</div>'
        )
    get_avatar_preview.short_description = 'پیش‌نمایش آواتار'
    
    def get_birth_date_jalali(self, obj):
        """نمایش تاریخ تولد به شمسی"""
        if obj.birth_date:
            return obj.birth_date.strftime('%Y/%m/%d')
        return '-'
    get_birth_date_jalali.short_description = 'تاریخ تولد (شمسی)'
    
    def get_national_id_status(self, obj):
        """نمایش وضعیت تایید کارت ملی"""
        has_national_id = bool(obj.national_id)
        has_national_card_image = bool(obj.national_card_image)
        
        if has_national_id and has_national_card_image:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ تایید شده</span>'
            )
        elif has_national_id or has_national_card_image:
            return format_html(
                '<span style="color: orange; font-weight: bold;">⚠ ناقص</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ تایید نشده</span>'
            )
    get_national_id_status.short_description = 'وضعیت کارت ملی'
    
    def get_verification_status(self, obj):
        """نمایش وضعیت احراز هویت در لیست"""
        phone_verified = obj.is_phone_verified
        national_id_verified = bool(obj.national_id and obj.national_card_image)
        profile_completed = obj.profile_completed
        
        status_icons = []
        if phone_verified:
            status_icons.append('<span style="color: green;" title="تایید شماره موبایل">📱</span>')
        else:
            status_icons.append('<span style="color: gray;" title="تایید نشده">📱</span>')
            
        if national_id_verified:
            status_icons.append('<span style="color: green;" title="تایید کارت ملی">🆔</span>')
        else:
            status_icons.append('<span style="color: gray;" title="تایید نشده">🆔</span>')
            
        if profile_completed:
            status_icons.append('<span style="color: green;" title="پروفایل تکمیل شده">✓</span>')
        else:
            status_icons.append('<span style="color: gray;" title="پروفایل ناقص">✗</span>')
        
        return format_html(' '.join(status_icons))
    get_verification_status.short_description = 'وضعیت احراز'
    
    def get_verification_summary(self, obj):
        """نمایش خلاصه وضعیت احراز هویت در فرم"""
        phone_verified = obj.is_phone_verified
        national_id_verified = bool(obj.national_id and obj.national_card_image)
        profile_completed = obj.profile_completed
        
        summary_parts = []
        if phone_verified:
            summary_parts.append('<span style="color: green;">✓ شماره موبایل تایید شده</span>')
        else:
            summary_parts.append('<span style="color: red;">✗ شماره موبایل تایید نشده</span>')
            
        if national_id_verified:
            summary_parts.append('<span style="color: green;">✓ کارت ملی تایید شده</span>')
        else:
            summary_parts.append('<span style="color: red;">✗ کارت ملی تایید نشده</span>')
            
        if profile_completed:
            summary_parts.append('<span style="color: green;">✓ پروفایل تکمیل شده</span>')
        else:
            summary_parts.append('<span style="color: orange;">⚠ پروفایل ناقص</span>')
        
        return format_html('<br>'.join(summary_parts))
    get_verification_summary.short_description = 'خلاصه وضعیت احراز هویت'
    
    # تعریف readonly_fields بعد از تعریف همه متدها
    readonly_fields = [
        'date_joined', 
        'last_login', 
        'otp_code_created', 
        'get_jalali_date_joined', 
        'get_jalali_last_login',
        'get_avatar_preview',
        'get_verification_summary',
        'get_national_id_status',
        'get_birth_date_jalali'
    ]
    
    actions = ['verify_phone_numbers', 'unverify_phone_numbers']
    
    def verify_phone_numbers(self, request, queryset):
        """تایید شماره موبایل کاربران انتخاب شده و ارسال پیام دعوت"""
        count = 0
        for user in queryset:
            was_verified = user.is_phone_verified
            user.is_phone_verified = True
            user.save()
            
            # اگر قبلا تایید نشده بود، پیام دعوت ارسال کن
            if not was_verified:
                try:
                    # دریافت account_code از customer_profile
                    account_code = ''
                    if hasattr(user, 'customer_profile'):
                        account_code = user.customer_profile.account_code
                    send_message(user.phone_number, account_code, template='invite-sms')
                    count += 1
                except Exception as e:
                    # اگر ارسال پیامک با خطا مواجه شد، لاگ کن اما ادامه بده
                    print(f"خطا در ارسال پیام دعوت به {user.phone_number}: {e}")
        
        self.message_user(
            request,
            f'{queryset.count()} کاربر با موفقیت تایید شدند و پیام دعوت برای {count} کاربر ارسال شد.'
        )
    verify_phone_numbers.short_description = 'تایید شماره موبایل کاربران انتخاب شده'
    
    def unverify_phone_numbers(self, request, queryset):
        """لغو تایید شماره موبایل کاربران انتخاب شده"""
        updated = queryset.update(is_phone_verified=False)
        self.message_user(
            request,
            f'تایید {updated} کاربر لغو شد.'
        )
    unverify_phone_numbers.short_description = 'لغو تایید شماره موبایل کاربران انتخاب شده'


