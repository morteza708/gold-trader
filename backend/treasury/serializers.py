from rest_framework import serializers

from .models import CompanyTreasury, OperationalJournal, VaultMovement
from . import services


class CoverageSnapshotSerializer(serializers.Serializer):
    company_gold_balance = serializers.DecimalField(max_digits=18, decimal_places=6)
    avg_cost_per_gram = serializers.DecimalField(max_digits=18, decimal_places=0)
    customer_gold_liability = serializers.DecimalField(max_digits=18, decimal_places=6)
    pending_gold_delivery = serializers.DecimalField(max_digits=18, decimal_places=6)
    obligated_gold = serializers.DecimalField(max_digits=18, decimal_places=6)
    cover_ratio = serializers.DecimalField(max_digits=10, decimal_places=4)
    cover_percent = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    status_label = serializers.CharField()
    buy_blocked = serializers.BooleanField()
    auto_block_user_buy = serializers.BooleanField()
    warning_cover_ratio = serializers.DecimalField(max_digits=6, decimal_places=4)
    critical_cover_ratio = serializers.DecimalField(max_digits=6, decimal_places=4)
    shortfall_gold = serializers.DecimalField(max_digits=18, decimal_places=6)
    customer_rial_balance_total = serializers.DecimalField(
        max_digits=18, decimal_places=0, required=False
    )


class TreasurySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyTreasury
        fields = [
            'warning_cover_ratio',
            'critical_cover_ratio',
            'auto_block_user_buy',
            'gold_balance',
            'avg_cost_per_gram',
            'updated_at',
        ]
        read_only_fields = ['gold_balance', 'avg_cost_per_gram', 'updated_at']

    def validate_warning_cover_ratio(self, value):
        if value <= 0 or value > 2:
            raise serializers.ValidationError('آستانه هشدار باید بین ۰ و ۲ باشد (مثلاً ۰.۹۸)')
        return value

    def validate_critical_cover_ratio(self, value):
        if value <= 0 or value > 2:
            raise serializers.ValidationError('آستانه بحرانی باید بین ۰ و ۲ باشد (مثلاً ۱.۰)')
        return value

    def validate(self, attrs):
        warning = attrs.get('warning_cover_ratio', getattr(self.instance, 'warning_cover_ratio', None))
        critical = attrs.get('critical_cover_ratio', getattr(self.instance, 'critical_cover_ratio', None))
        if warning is not None and critical is not None and warning < critical:
            raise serializers.ValidationError({
                'warning_cover_ratio': 'آستانه هشدار باید بزرگ‌تر یا مساوی آستانه بحرانی باشد'
            })
        return attrs


class VaultMovementCreateSerializer(serializers.Serializer):
    movement_type = serializers.ChoiceField(choices=VaultMovement.MovementType.choices)
    amount = serializers.DecimalField(max_digits=18, decimal_places=6)
    unit_price = serializers.DecimalField(max_digits=18, decimal_places=0, required=False, default=0)
    counterparty = serializers.CharField(required=False, allow_blank=True, default='')
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        mtype = attrs['movement_type']
        amount = attrs['amount']
        note = (attrs.get('note') or '').strip()
        if mtype == VaultMovement.MovementType.ADJUST and not note:
            raise serializers.ValidationError({'note': 'برای تعدیل، نوشتن دلیل الزامی است'})
        if mtype in (VaultMovement.MovementType.IN, VaultMovement.MovementType.OUT) and amount <= 0:
            raise serializers.ValidationError({'amount': 'مقدار باید بیشتر از صفر باشد'})
        if mtype == VaultMovement.MovementType.ADJUST and amount == 0:
            raise serializers.ValidationError({'amount': 'مقدار تعدیل نمی‌تواند صفر باشد'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        try:
            return services.apply_vault_movement(
                movement_type=validated_data['movement_type'],
                amount=validated_data['amount'],
                unit_price=validated_data.get('unit_price') or 0,
                counterparty=validated_data.get('counterparty') or '',
                note=validated_data.get('note') or '',
                created_by=request.user,
            )
        except services.TreasuryError as e:
            raise serializers.ValidationError({'error': e.message})


class VaultMovementSerializer(serializers.ModelSerializer):
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()

    class Meta:
        model = VaultMovement
        fields = [
            'id', 'created_at', 'created_at_jalali', 'movement_type', 'movement_type_display',
            'amount', 'unit_price', 'counterparty', 'note', 'created_by_name',
            'avg_cost_before', 'realized_inventory_pnl',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        u = obj.created_by
        name = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        return name or u.phone_number

    def get_created_at_jalali(self, obj):
        if not obj.created_at:
            return None
        from jalali_date import datetime2jalali
        return datetime2jalali(obj.created_at).strftime('%Y/%m/%d %H:%M')


class PnlSnapshotSerializer(serializers.Serializer):
    date_from = serializers.CharField()
    date_to = serializers.CharField()
    spread_pnl = serializers.DecimalField(max_digits=18, decimal_places=0)
    inventory_realized_pnl = serializers.DecimalField(max_digits=18, decimal_places=0)
    inventory_unrealized_pnl = serializers.DecimalField(max_digits=18, decimal_places=0)
    operating_total = serializers.DecimalField(max_digits=18, decimal_places=0)
    company_gold_balance = serializers.DecimalField(max_digits=18, decimal_places=6)
    avg_cost_per_gram = serializers.DecimalField(max_digits=18, decimal_places=0)
    market_ref_price = serializers.DecimalField(max_digits=18, decimal_places=0)
    market_ref_label = serializers.CharField()


class OperationalJournalSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    asset_display = serializers.CharField(source='get_asset_display', read_only=True)
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()

    class Meta:
        model = OperationalJournal
        fields = [
            'id', 'created_at', 'created_at_jalali', 'asset', 'asset_display',
            'amount', 'unit_price', 'event_type', 'event_type_display',
            'user_phone', 'user_name', 'balance_after',
            'reference_type', 'reference_id', 'note',
        ]

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else None

    def get_user_name(self, obj):
        if not obj.user:
            return None
        name = f'{obj.user.first_name or ""} {obj.user.last_name or ""}'.strip()
        return name or None

    def get_created_at_jalali(self, obj):
        if not obj.created_at:
            return None
        from jalali_date import datetime2jalali
        return datetime2jalali(obj.created_at).strftime('%Y/%m/%d %H:%M')
