from rest_framework import serializers
from jalali_date import datetime2jalali
from .models import GoldPrice, Trade, Order


class GoldPriceSerializer(serializers.ModelSerializer):
    """Serializer برای نمایش قیمت به کاربر (فقط قیمت نهایی)"""
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = GoldPrice
        fields = [
            'buy',  # قیمت نهایی خرید (از SerializerMethodField)
            'sell',  # قیمت نهایی فروش
            'trades_enabled',  # وضعیت معاملات
            'updated_at',
            'created_at_jalali'
        ]
        read_only_fields = ['buy', 'sell', 'trades_enabled', 'updated_at', 'created_at_jalali']
    
    def to_representation(self, instance):
        """فقط قیمت‌های نهایی را نمایش می‌دهد"""
        from settings.models import SystemSettings
        
        settings = SystemSettings.get_settings()
        
        return {
            'buy': instance.buy_final_price,
            'sell': instance.sell_final_price,
            'trades_enabled': settings.trades_enabled,
            'updated_at': instance.created_at.isoformat(),
            'created_at_jalali': self.get_created_at_jalali(instance)
        }


class GoldPriceAdminSerializer(serializers.ModelSerializer):
    """Serializer برای پنل مدیریت (قیمت پایه + حاشیه سود)"""
    created_at_jalali = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.phone_number
        return None
    
    class Meta:
        model = GoldPrice
        fields = [
            'id',
            'buy_base_price', 'sell_base_price',
            'buy_margin', 'sell_margin',
            'buy_final_price', 'sell_final_price',
            'is_active', 'source',
            'created_at', 'created_at_jalali',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['buy_final_price', 'sell_final_price', 'created_at']


class CreateGoldPriceSerializer(serializers.Serializer):
    """Serializer برای ایجاد قیمت جدید"""
    buy_base_price = serializers.DecimalField(max_digits=15, decimal_places=0)
    sell_base_price = serializers.DecimalField(max_digits=15, decimal_places=0)
    buy_margin = serializers.DecimalField(max_digits=15, decimal_places=0, default=0)
    sell_margin = serializers.DecimalField(max_digits=15, decimal_places=0, default=0)
    
    def validate(self, data):
        if data['buy_base_price'] <= 0 or data['sell_base_price'] <= 0:
            raise serializers.ValidationError("قیمت‌های پایه باید بیشتر از صفر باشند")
        if data['buy_margin'] < 0 or data['sell_margin'] < 0:
            raise serializers.ValidationError("حاشیه سود نمی‌تواند منفی باشد")
        return data


class GoldPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer برای تاریخچه قیمت‌ها (برای نمودار)"""
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = GoldPrice
        fields = [
            'buy_final_price', 'sell_final_price',
            'created_at', 'created_at_jalali'
        ]


class TradeSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_mobile = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.phone_number
    
    def get_user_mobile(self, obj):
        return obj.user.phone_number
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = Trade
        fields = [
            'id', 'user', 'user_name', 'user_mobile',
            'trade_type', 'amount', 'price', 'total', 'fee', 'margin_profit',
            'status', 'tracking_code', 'invoice_number',
            'admin_note', 'created_at', 'created_at_jalali'
        ]


class OrderSerializer(serializers.ModelSerializer):
    created_at_jalali = serializers.SerializerMethodField()
    executed_trade = TradeSerializer(read_only=True)
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'order_type', 'target_price', 'amount',
            'status', 'executed_trade', 'expires_at',
            'created_at', 'created_at_jalali'
        ]


class CreateOrderSerializer(serializers.Serializer):
    """Serializer برای ایجاد سفارش هوشمند"""
    order_type = serializers.ChoiceField(choices=Order.ORDER_TYPE_CHOICES)
    target_price = serializers.DecimalField(max_digits=15, decimal_places=0)
    amount = serializers.DecimalField(max_digits=10, decimal_places=3)
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("مقدار باید بیشتر از صفر باشد")
        return value
    
    def validate_target_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("قیمت هدف باید بیشتر از صفر باشد")
        return value

