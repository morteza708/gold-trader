from django.contrib import admin
from jalali_date import datetime2jalali
from .models import GoldPrice, Trade, Order


@admin.register(GoldPrice)
class GoldPriceAdmin(admin.ModelAdmin):
    list_display = [
        'get_buy_price_display',
        'get_sell_price_display',
        'get_margins_display',
        'is_active',
        'source',
        'get_jalali_created_at',
        'created_by'
    ]
    list_filter = ['is_active', 'source', 'created_at']
    search_fields = ['buy_base_price', 'sell_base_price']
    readonly_fields = ['buy_final_price', 'sell_final_price', 'created_at']
    
    fieldsets = (
        ('قیمت‌های پایه', {
            'fields': ('buy_base_price', 'sell_base_price')
        }),
        ('حاشیه سود', {
            'fields': ('buy_margin', 'sell_margin')
        }),
        ('قیمت‌های نهایی (محاسبه خودکار)', {
            'fields': ('buy_final_price', 'sell_final_price'),
            'classes': ('collapse',)
        }),
        ('وضعیت', {
            'fields': ('is_active', 'source', 'created_by')
        }),
        ('تاریخ', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_buy_price_display(self, obj):
        return f"{obj.buy_final_price:,} ریال"
    get_buy_price_display.short_description = 'قیمت خرید'
    
    def get_sell_price_display(self, obj):
        return f"{obj.sell_final_price:,} ریال"
    get_sell_price_display.short_description = 'قیمت فروش'
    
    def get_margins_display(self, obj):
        return f"خرید: {obj.buy_margin:,} | فروش: {obj.sell_margin:,}"
    get_margins_display.short_description = 'حاشیه سود'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ثبت'
    
    def has_delete_permission(self, request, obj=None):
        # جلوگیری از حذف قیمت‌ها (برای حفظ تاریخچه)
        return False


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = [
        'tracking_code',
        'invoice_number',
        'user',
        'trade_type',
        'get_formatted_amount',
        'get_formatted_price',
        'get_formatted_total',
        'status',
        'get_jalali_created_at'
    ]
    list_filter = ['status', 'trade_type', 'created_at']
    search_fields = ['tracking_code', 'invoice_number', 'user__phone_number']
    readonly_fields = ['tracking_code', 'invoice_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('اطلاعات معامله', {
            'fields': ('user', 'trade_type', 'amount', 'price', 'total', 'fee', 'status')
        }),
        ('کدها', {
            'fields': ('tracking_code', 'invoice_number')
        }),
        ('یادداشت', {
            'fields': ('admin_note',)
        }),
        ('تاریخ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_formatted_amount(self, obj):
        return f"{obj.amount} گرم"
    get_formatted_amount.short_description = 'مقدار'
    
    def get_formatted_price(self, obj):
        return f"{obj.price:,} ریال"
    get_formatted_price.short_description = 'قیمت واحد'
    
    def get_formatted_total(self, obj):
        return f"{obj.total:,} ریال"
    get_formatted_total.short_description = 'مبلغ کل'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'user',
        'order_type',
        'get_formatted_target_price',
        'get_formatted_amount',
        'status',
        'get_jalali_created_at'
    ]
    list_filter = ['status', 'order_type', 'created_at']
    search_fields = ['user__phone_number', 'target_price']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('اطلاعات سفارش', {
            'fields': ('user', 'order_type', 'target_price', 'amount', 'status')
        }),
        ('معامله اجرا شده', {
            'fields': ('executed_trade',)
        }),
        ('تاریخ انقضا', {
            'fields': ('expires_at',)
        }),
        ('تاریخ', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_formatted_target_price(self, obj):
        return f"{obj.target_price:,} ریال"
    get_formatted_target_price.short_description = 'قیمت هدف'
    
    def get_formatted_amount(self, obj):
        return f"{obj.amount} گرم"
    get_formatted_amount.short_description = 'مقدار'
    
    def get_jalali_created_at(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return '-'
    get_jalali_created_at.short_description = 'تاریخ ایجاد'

