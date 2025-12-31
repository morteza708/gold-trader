from django.contrib import admin
from jalali_date import datetime2jalali
from .models import Wallet, BankCard, WithdrawalRequest, DepositRequest


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_formatted_rial_balance', 'get_formatted_gold_balance', 'get_jalali_created_at', 'get_jalali_updated_at']
    list_filter = ['created_at']
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly']
    
    def get_formatted_rial_balance(self, obj):
        """فرمت کردن موجودی ریالی با جداکننده سه‌رقمی"""
        return f"{int(obj.rial_balance):,} ریال"
    get_formatted_rial_balance.short_description = 'موجودی ریالی'
    
    def get_formatted_gold_balance(self, obj):
        """فرمت کردن موجودی طلا"""
        return f"{float(obj.gold_balance):.3f} گرم"
    get_formatted_gold_balance.short_description = 'موجودی طلا'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'
    
    def get_jalali_created_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        return self.get_jalali_created_at(obj)
    get_jalali_created_at_readonly.short_description = 'تاریخ ایجاد'
    
    def get_jalali_updated_at(self, obj):
        if obj.updated_at:
            jalali_date = datetime2jalali(obj.updated_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_updated_at.short_description = 'تاریخ به‌روزرسانی'
    
    def get_jalali_updated_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        return self.get_jalali_updated_at(obj)
    get_jalali_updated_at_readonly.short_description = 'تاریخ به‌روزرسانی'


@admin.register(BankCard)
class BankCardAdmin(admin.ModelAdmin):
    list_display = ['user', 'bank_name', 'card_number', 'sheba_number', 'is_active', 'get_jalali_created_at']
    list_filter = ['is_active', 'bank_name', 'created_at']
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name', 'card_number', 'sheba_number']
    readonly_fields = ['created_at', 'updated_at', 'get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly']
    
    fieldsets = (
        ('اطلاعات کارت', {
            'fields': ('user', 'bank_name', 'card_number', 'sheba_number', 'is_active')
        }),
        ('تاریخ‌ها', {
            'fields': ('get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly')
        }),
    )
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'
    
    def get_jalali_created_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        return self.get_jalali_created_at(obj)
    get_jalali_created_at_readonly.short_description = 'تاریخ ایجاد'
    
    def get_jalali_updated_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        if obj.updated_at:
            jalali_date = datetime2jalali(obj.updated_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_updated_at_readonly.short_description = 'تاریخ به‌روزرسانی'


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ['request_code', 'user', 'withdrawal_type', 'get_formatted_amount', 'status', 'bank_card', 'get_jalali_created_at']
    list_filter = ['withdrawal_type', 'status', 'created_at']
    search_fields = ['request_code', 'user__phone_number', 'user__first_name', 'user__last_name']
    readonly_fields = ['request_code', 'created_at', 'updated_at', 'completed_at', 'get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly', 'get_jalali_completed_at_readonly']
    
    fieldsets = (
        ('اطلاعات درخواست', {
            'fields': ('user', 'withdrawal_type', 'amount', 'status', 'request_code', 'bank_card')
        }),
        ('اطلاعات پردازش', {
            'fields': ('receipt_image', 'admin_note')
        }),
        ('تاریخ‌ها', {
            'fields': ('get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly', 'get_jalali_completed_at_readonly')
        }),
    )
    
    def get_formatted_amount(self, obj):
        """فرمت کردن مبلغ با جداکننده سه‌رقمی"""
        if obj.withdrawal_type == 'RIAL':
            return f"{int(obj.amount):,} ریال"
        else:
            return f"{float(obj.amount):.3f} گرم"
    get_formatted_amount.short_description = 'مبلغ'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'
    
    def get_jalali_created_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        return self.get_jalali_created_at(obj)
    get_jalali_created_at_readonly.short_description = 'تاریخ ایجاد'
    
    def get_jalali_updated_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        if obj.updated_at:
            jalali_date = datetime2jalali(obj.updated_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_updated_at_readonly.short_description = 'تاریخ به‌روزرسانی'
    
    def get_jalali_completed_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        if obj.completed_at:
            jalali_date = datetime2jalali(obj.completed_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_completed_at_readonly.short_description = 'تاریخ تسویه'


@admin.register(DepositRequest)
class DepositRequestAdmin(admin.ModelAdmin):
    list_display = ['request_code', 'user', 'get_formatted_amount', 'tracking_number', 'get_jalali_deposit_date', 'status', 'get_jalali_created_at']
    list_filter = ['status', 'created_at', 'deposit_date']
    search_fields = ['request_code', 'tracking_number', 'user__phone_number', 'user__first_name', 'user__last_name']
    readonly_fields = ['request_code', 'created_at', 'updated_at', 'get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly', 'get_jalali_deposit_date_readonly']
    
    fieldsets = (
        ('اطلاعات درخواست', {
            'fields': ('user', 'amount', 'tracking_number', 'deposit_date', 'status', 'request_code')
        }),
        ('فیش واریزی', {
            'fields': ('receipt_image',)
        }),
        ('اطلاعات پردازش', {
            'fields': ('admin_note',)
        }),
        ('تاریخ‌ها', {
            'fields': ('get_jalali_deposit_date_readonly', 'get_jalali_created_at_readonly', 'get_jalali_updated_at_readonly')
        }),
    )
    
    def get_formatted_amount(self, obj):
        """فرمت کردن مبلغ با جداکننده سه‌رقمی"""
        return f"{int(obj.amount):,} ریال"
    get_formatted_amount.short_description = 'مبلغ'
    
    def get_jalali_deposit_date(self, obj):
        """تبدیل تاریخ واریز به شمسی"""
        if obj.deposit_date:
            from jalali_date import date2jalali
            jalali_date = date2jalali(obj.deposit_date)
            return jalali_date.strftime('%Y/%m/%d')
        return '-'
    get_jalali_deposit_date.short_description = 'تاریخ واریز'
    
    def get_jalali_deposit_date_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        return self.get_jalali_deposit_date(obj)
    get_jalali_deposit_date_readonly.short_description = 'تاریخ واریز'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'
    
    def get_jalali_created_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        return self.get_jalali_created_at(obj)
    get_jalali_created_at_readonly.short_description = 'تاریخ ایجاد'
    
    def get_jalali_updated_at_readonly(self, obj):
        """برای نمایش در readonly_fields"""
        if obj.updated_at:
            jalali_date = datetime2jalali(obj.updated_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_updated_at_readonly.short_description = 'تاریخ به‌روزرسانی'
