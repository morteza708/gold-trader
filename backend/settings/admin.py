from django.contrib import admin
from jalali_date import datetime2jalali
from .models import SystemSettings, DepositAccount


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['get_admin_phones_display', 'has_gold_pickup_address', 'get_jalali_updated_at']
    
    def has_add_permission(self, request):
        # فقط یک رکورد تنظیمات باید وجود داشته باشد
        return not SystemSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # جلوگیری از حذف تنظیمات
        return False
    
    def get_admin_phones_display(self, obj):
        if obj.admin_phone_numbers:
            return ', '.join(obj.admin_phone_numbers)
        return 'ثبت نشده'
    get_admin_phones_display.short_description = 'شماره مدیران'
    
    def has_gold_pickup_address(self, obj):
        return bool(obj.gold_pickup_address)
    has_gold_pickup_address.short_description = 'آدرس مراجعه'
    has_gold_pickup_address.boolean = True
    
    def get_jalali_updated_at(self, obj):
        if obj.updated_at:
            jalali_date = datetime2jalali(obj.updated_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_updated_at.short_description = 'تاریخ به‌روزرسانی'


@admin.register(DepositAccount)
class DepositAccountAdmin(admin.ModelAdmin):
    list_display = ['bank_name', 'owner_name', 'card_number', 'sheba_number', 'is_active', 'order', 'get_jalali_created_at']
    list_filter = ['is_active', 'bank_name']
    search_fields = ['bank_name', 'owner_name', 'card_number', 'sheba_number']
    list_editable = ['is_active', 'order']
    ordering = ['order', 'created_at']
    
    fieldsets = (
        ('اطلاعات حساب', {
            'fields': ('bank_name', 'owner_name', 'card_number', 'sheba_number')
        }),
        ('تنظیمات', {
            'fields': ('is_active', 'order')
        }),
    )
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'

