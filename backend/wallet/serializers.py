from rest_framework import serializers
from .models import Wallet, BankCard, WithdrawalRequest, DepositRequest, DepositAccountAssignment, DepositReceipt, DepositWithdrawalLink
from accounts.services import persian_to_english_numbers
import re


class BankCardSerializer(serializers.ModelSerializer):
    """Serializer برای کارت بانکی"""
    
    class Meta:
        model = BankCard
        fields = ['id', 'bank_name', 'card_number', 'sheba_number', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_card_number(self, value):
        """اعتبارسنجی شماره کارت"""
        value = persian_to_english_numbers(value)
        value = re.sub(r'\s+|-', '', value)
        if len(value) != 16 or not value.isdigit():
            raise serializers.ValidationError('شماره کارت باید 16 رقم باشد')
        return value
    
    def validate_sheba_number(self, value):
        """اعتبارسنجی شماره شبا"""
        value = persian_to_english_numbers(value)
        value = re.sub(r'\s+|-', '', value)
        if not value.upper().startswith('IR'):
            value = 'IR' + value
        if len(value) != 26:
            raise serializers.ValidationError('شماره شبا باید 24 رقم باشد (با IR = 26 کاراکتر)')
        return value.upper()


class WalletSerializer(serializers.ModelSerializer):
    """Serializer برای کیف پول"""
    available_rial_balance = serializers.SerializerMethodField()
    available_gold_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Wallet
        fields = [
            'rial_balance', 'gold_balance', 
            'pending_withdrawal_rial', 'pending_withdrawal_gold',
            'available_rial_balance', 'available_gold_balance',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'rial_balance', 'gold_balance', 
            'pending_withdrawal_rial', 'pending_withdrawal_gold',
            'available_rial_balance', 'available_gold_balance',
            'created_at', 'updated_at'
        ]
    
    def get_available_rial_balance(self, obj):
        """موجودی ریالی قابل استفاده"""
        return obj.get_available_rial_balance()
    
    def get_available_gold_balance(self, obj):
        """موجودی طلای قابل استفاده"""
        return obj.get_available_gold_balance()


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """Serializer برای درخواست برداشت"""
    bank_card = BankCardSerializer(read_only=True)
    bank_card_id = serializers.IntegerField(write_only=True, required=False)
    user_info = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()
    completed_at_jalali = serializers.SerializerMethodField()
    receipt_image = serializers.SerializerMethodField()
    gold_pickup_address = serializers.SerializerMethodField()
    deposit_receipts_info = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    is_fully_paid = serializers.SerializerMethodField()
    
    class Meta:
        model = WithdrawalRequest
        fields = [
            'id', 'withdrawal_type', 'amount', 'status', 'request_code',
            'bank_card', 'bank_card_id', 'receipt_image', 'admin_note',
            'user_info', 'created_at', 'created_at_jalali', 'completed_at',
            'completed_at_jalali', 'updated_at', 'gold_pickup_address',
            'deposit_receipts_info', 'paid_amount', 'remaining_amount', 'is_fully_paid'
        ]
        read_only_fields = ['id', 'status', 'request_code', 'created_at', 'updated_at', 'completed_at']
    
    def get_user_info(self, obj):
        """اطلاعات کاربر"""
        return {
            'id': obj.user.id,
            'phone_number': obj.user.phone_number,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'account_code': obj.user.customer_profile.account_code if hasattr(obj.user, 'customer_profile') else None,
        }
    
    def get_created_at_jalali(self, obj):
        """تبدیل تاریخ به شمسی"""
        if obj.created_at:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_completed_at_jalali(self, obj):
        """تبدیل تاریخ تسویه به شمسی"""
        if obj.completed_at:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.completed_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_gold_pickup_address(self, obj):
        """برگرداندن آدرس مراجعه حضوری (فقط برای برداشت طلا)"""
        if obj.withdrawal_type == 'GOLD':
            from settings.models import SystemSettings
            settings = SystemSettings.get_settings()
            return settings.gold_pickup_address or ''
        return None
    
    def get_receipt_image(self, obj):
        """برگرداندن URL کامل تصویر فیش واریزی"""
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None
    
    def get_paid_amount(self, obj):
        """مبلغ پرداخت شده از طریق لینک‌های واریز"""
        return float(obj.get_paid_amount())
    
    def get_remaining_amount(self, obj):
        """باقی‌مانده درخواست برداشت"""
        return float(obj.get_remaining_amount())
    
    def get_is_fully_paid(self, obj):
        """بررسی اینکه آیا کل مبلغ پرداخت شده است"""
        return obj.is_fully_paid()
    
    def get_deposit_receipts_info(self, obj):
        """اطلاعات فیش‌های واریزی مرتبط (همه لینک‌ها، نه فقط auto_approved)"""
        # نمایش همه لینک‌ها، چه auto_approved=True و چه False
        
        # پاک کردن cache و refresh کردن object
        try:
            obj.refresh_from_db()
            # پاک کردن cache مربوط به deposit_links
            if hasattr(obj, '_prefetched_objects_cache'):
                obj._prefetched_objects_cache.pop('deposit_links', None)
        except Exception:
            pass
        
        # دریافت لینک‌های مرتبط
        # استفاده از query مستقیم از دیتابیس به جای استفاده از related manager
        # چون ممکن است prefetch_related درست کار نکند
        from wallet.models import DepositWithdrawalLink
        
        # بررسی مستقیم از دیتابیس - همه لینک‌ها (نه فقط auto_approved=True)
        direct_links = DepositWithdrawalLink.objects.filter(
            withdrawal_request_id=obj.id
        ).select_related(
            'deposit_receipt',
            'deposit_receipt__deposit_request',
            'deposit_receipt__deposit_request__user',
            'deposit_receipt__deposit_request__user__customer_profile'
        )
        
        if not direct_links.exists():
            return []
        
        links = direct_links
        
        request = self.context.get('request')
        receipts_info = []
        
        for link in links:
            receipt = link.deposit_receipt
            deposit_request = receipt.deposit_request
            depositor_user = deposit_request.user
            
            # اطلاعات واریزکننده
            depositor_info = {
                'id': depositor_user.id,
                'phone_number': depositor_user.phone_number,
                'first_name': depositor_user.first_name or '',
                'last_name': depositor_user.last_name or '',
                'full_name': f"{depositor_user.first_name or ''} {depositor_user.last_name or ''}".strip() or depositor_user.phone_number,
                'account_code': depositor_user.customer_profile.account_code if hasattr(depositor_user, 'customer_profile') else None,
            }
            
            # URL تصویر فیش
            receipt_image_url = None
            if receipt.receipt_image:
                if request:
                    receipt_image_url = request.build_absolute_uri(receipt.receipt_image.url)
                else:
                    receipt_image_url = receipt.receipt_image.url
            
            # تاریخ واریز به شمسی
            deposit_date_jalali = None
            if receipt.deposit_date:
                from jalali_date import date2jalali
                from datetime import date
                if isinstance(receipt.deposit_date, date):
                    jalali_date = date2jalali(receipt.deposit_date)
                    deposit_date_jalali = jalali_date.strftime('%Y/%m/%d')
            
            # تاریخ ایجاد receipt به شمسی
            created_at_jalali = None
            if receipt.created_at:
                from jalali_date import datetime2jalali
                jalali_date = datetime2jalali(receipt.created_at)
                created_at_jalali = jalali_date.strftime('%Y/%m/%d %H:%M')
            
            receipts_info.append({
                'id': receipt.id,
                'deposit_request_code': deposit_request.request_code,
                'depositor_info': depositor_info,
                'amount': str(receipt.amount),
                'tracking_number': receipt.tracking_number or '',
                'deposit_date': receipt.deposit_date.isoformat() if receipt.deposit_date else None,
                'deposit_date_jalali': deposit_date_jalali,
                'receipt_image_url': receipt_image_url,
                'status': receipt.status,
                'created_at': receipt.created_at.isoformat() if receipt.created_at else None,
                'created_at_jalali': created_at_jalali,
                'link_amount': str(link.amount),  # مبلغی که از این receipt به این withdrawal اختصاص یافته
            })
        
        return receipts_info
    
    def validate_amount(self, value):
        """اعتبارسنجی مقدار"""
        if value <= 0:
            raise serializers.ValidationError('مقدار باید بیشتر از صفر باشد')
        return value
    
    def validate(self, attrs):
        """اعتبارسنجی کلی"""
        withdrawal_type = attrs.get('withdrawal_type')
        bank_card_id = attrs.get('bank_card_id')
        
        # برای برداشت وجه، کارت بانکی الزامی است
        if withdrawal_type == 'RIAL' and not bank_card_id:
            raise serializers.ValidationError({
                'bank_card_id': 'برای برداشت وجه، انتخاب کارت بانکی الزامی است'
            })
        
        return attrs


class CreateWithdrawalRequestSerializer(serializers.Serializer):
    """Serializer برای ایجاد درخواست برداشت"""
    withdrawal_type = serializers.ChoiceField(choices=WithdrawalRequest.WITHDRAWAL_TYPE_CHOICES)
    amount = serializers.DecimalField(max_digits=15, decimal_places=3, coerce_to_string=False)
    bank_card_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_amount(self, value):
        """اعتبارسنجی مقدار"""
        if value <= 0:
            raise serializers.ValidationError('مقدار باید بیشتر از صفر باشد')
        return value
    
    def validate(self, attrs):
        """اعتبارسنجی کلی"""
        withdrawal_type = attrs.get('withdrawal_type')
        bank_card_id = attrs.get('bank_card_id')
        amount = attrs.get('amount')
        
        # برای برداشت وجه، کارت بانکی الزامی است
        if withdrawal_type == 'RIAL':
            if not bank_card_id:
                raise serializers.ValidationError({
                    'bank_card_id': 'برای برداشت وجه، انتخاب کارت بانکی الزامی است'
                })
            # برای ریال، amount باید عدد صحیح باشد (بدون اعشار)
            if amount and amount % 1 != 0:
                raise serializers.ValidationError({
                    'amount': 'مبلغ ریالی باید عدد صحیح باشد'
                })
        
        return attrs


class DepositRequestSerializer(serializers.ModelSerializer):
    """Serializer برای درخواست واریز"""
    created_at_jalali = serializers.SerializerMethodField()
    deposit_date_jalali = serializers.SerializerMethodField()
    user_info = serializers.SerializerMethodField()
    receipt_image_url = serializers.SerializerMethodField()
    assignments = serializers.SerializerMethodField()
    receipts = serializers.SerializerMethodField()
    
    class Meta:
        model = DepositRequest
        fields = [
            'id', 'amount', 'tracking_number', 'deposit_date', 'deposit_date_jalali', 
            'receipt_image', 'receipt_image_url',
            'status', 'request_code', 'admin_note', 'user_info', 'created_at', 
            'created_at_jalali', 'updated_at', 'assignments', 'receipts'
        ]
        read_only_fields = ['id', 'status', 'request_code', 'created_at', 'updated_at', 'receipt_image_url']
        extra_kwargs = {
            'receipt_image': {'write_only': False, 'required': False},
            'tracking_number': {'required': False, 'allow_blank': True, 'allow_null': True},
            'deposit_date': {'required': False, 'allow_null': True},
        }
    
    def get_user_info(self, obj):
        """اطلاعات کاربر"""
        return {
            'id': obj.user.id,
            'phone_number': obj.user.phone_number,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'account_code': obj.user.customer_profile.account_code if hasattr(obj.user, 'customer_profile') else None,
        }
    
    def get_created_at_jalali(self, obj):
        """تبدیل تاریخ به شمسی"""
        if obj.created_at:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_deposit_date_jalali(self, obj):
        """تبدیل تاریخ واریز به شمسی"""
        if obj.deposit_date:
            from jalali_date import date2jalali
            from datetime import date
            # اگر deposit_date یک string است، آن را به date تبدیل کن
            if isinstance(obj.deposit_date, str):
                from datetime import datetime
                try:
                    deposit_date = datetime.strptime(obj.deposit_date, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    return None
            elif isinstance(obj.deposit_date, date):
                deposit_date = obj.deposit_date
            else:
                return None
            jalali_date = date2jalali(deposit_date)
            return jalali_date.strftime('%Y/%m/%d')
        return None
    
    def get_receipt_image_url(self, obj):
        """برگرداندن URL کامل تصویر فیش واریزی"""
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None
    
    def get_assignments(self, obj):
        """لیست حساب‌های تخصیص یافته"""
        assignments = obj.account_assignments.all()
        return DepositAccountAssignmentSerializer(assignments, many=True, context=self.context).data
    
    def get_receipts(self, obj):
        """لیست فیش‌های واریزی"""
        receipts = obj.receipts.all()
        return DepositReceiptSerializer(receipts, many=True, context=self.context).data
    
    def validate_amount(self, value):
        """اعتبارسنجی مقدار"""
        if value <= 0:
            raise serializers.ValidationError('مبلغ باید بیشتر از صفر باشد')
        return value
    
    def validate_tracking_number(self, value):
        """اعتبارسنجی شماره پیگیری (اختیاری)"""
        if value:
            return value.strip()
        return value


class DepositAccountAssignmentSerializer(serializers.ModelSerializer):
    """Serializer برای تخصیص حساب‌های واریز"""
    account_display = serializers.SerializerMethodField()
    withdrawal_request_info = serializers.SerializerMethodField()
    deposit_account_info = serializers.SerializerMethodField()
    
    class Meta:
        model = DepositAccountAssignment
        fields = [
            'id', 'account_type', 'withdrawal_request', 'deposit_account',
            'custom_bank_name', 'custom_owner_name', 'custom_card_number', 'custom_sheba_number',
            'amount', 'order', 'account_display', 'withdrawal_request_info',
            'deposit_account_info', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_account_display(self, obj):
        """نمایش حساب"""
        return obj.get_account_display()
    
    def get_withdrawal_request_info(self, obj):
        """اطلاعات درخواست برداشت"""
        if obj.withdrawal_request:
            return {
                'id': obj.withdrawal_request.id,
                'request_code': obj.withdrawal_request.request_code,
                'amount': str(obj.withdrawal_request.amount),
                'user_info': {
                    'phone_number': obj.withdrawal_request.user.phone_number,
                    'full_name': f"{obj.withdrawal_request.user.first_name or ''} {obj.withdrawal_request.user.last_name or ''}".strip() or obj.withdrawal_request.user.phone_number,
                    'account_code': obj.withdrawal_request.user.customer_profile.account_code if hasattr(obj.withdrawal_request.user, 'customer_profile') else None,
                },
                'bank_card_info': {
                    'bank_name': obj.withdrawal_request.bank_card.bank_name if obj.withdrawal_request.bank_card else None,
                    'card_number': obj.withdrawal_request.bank_card.card_number if obj.withdrawal_request.bank_card else None,
                    'card_number_last_4': obj.withdrawal_request.bank_card.card_number[-4:] if obj.withdrawal_request.bank_card else None,
                    'sheba_number': obj.withdrawal_request.bank_card.sheba_number if obj.withdrawal_request.bank_card else None,
                } if obj.withdrawal_request.withdrawal_type == 'RIAL' and obj.withdrawal_request.bank_card else None,
                'created_at': obj.withdrawal_request.created_at.isoformat() if obj.withdrawal_request.created_at else None,
                'withdrawal_type': obj.withdrawal_request.withdrawal_type,
            }
        return None
    
    def get_deposit_account_info(self, obj):
        """اطلاعات حساب پیش‌فرض"""
        if obj.deposit_account:
            return {
                'id': obj.deposit_account.id,
                'bank_name': obj.deposit_account.bank_name,
                'owner_name': obj.deposit_account.owner_name,
                'card_number': obj.deposit_account.card_number,
                'sheba_number': obj.deposit_account.sheba_number,
            }
        return None


class CreateDepositAccountAssignmentSerializer(serializers.Serializer):
    """Serializer برای ایجاد تخصیص حساب"""
    account_type = serializers.ChoiceField(choices=DepositAccountAssignment.ACCOUNT_TYPE_CHOICES)
    withdrawal_request_id = serializers.IntegerField(required=False, allow_null=True)
    deposit_account_id = serializers.IntegerField(required=False, allow_null=True)
    custom_bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    custom_owner_name = serializers.CharField(max_length=200, required=False, allow_blank=True, allow_null=True)
    custom_card_number = serializers.CharField(max_length=19, required=False, allow_blank=True, allow_null=True)
    custom_sheba_number = serializers.CharField(max_length=26, required=False, allow_blank=True, allow_null=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=0)
    order = serializers.IntegerField(required=False, default=0)
    
    def validate_amount(self, value):
        """اعتبارسنجی مبلغ"""
        if value <= 0:
            raise serializers.ValidationError('مبلغ باید بیشتر از صفر باشد')
        return value
    
    def validate(self, attrs):
        """اعتبارسنجی کلی"""
        account_type = attrs.get('account_type')
        withdrawal_request_id = attrs.get('withdrawal_request_id')
        deposit_account_id = attrs.get('deposit_account_id')
        custom_bank_name = attrs.get('custom_bank_name')
        custom_card_number = attrs.get('custom_card_number')
        custom_sheba_number = attrs.get('custom_sheba_number')
        
        if account_type == 'WITHDRAWAL' and not withdrawal_request_id:
            raise serializers.ValidationError({
                'withdrawal_request_id': 'برای نوع WITHDRAWAL، withdrawal_request_id الزامی است'
            })
        
        if account_type == 'DEPOSIT_ACCOUNT' and not deposit_account_id:
            raise serializers.ValidationError({
                'deposit_account_id': 'برای نوع DEPOSIT_ACCOUNT، deposit_account_id الزامی است'
            })
        
        if account_type == 'CUSTOM':
            if not custom_bank_name or not custom_card_number:
                raise serializers.ValidationError({
                    'custom_bank_name': 'برای نوع CUSTOM، نام بانک و شماره کارت الزامی است'
                })
            # custom_sheba_number و custom_owner_name اختیاری هستند
        
        return attrs


class DepositReceiptSerializer(serializers.ModelSerializer):
    """Serializer برای فیش واریزی"""
    account_assignment_info = serializers.SerializerMethodField()
    receipt_image_url = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()
    deposit_date_jalali = serializers.SerializerMethodField()
    
    class Meta:
        model = DepositReceipt
        fields = [
            'id', 'deposit_request', 'account_assignment', 'account_assignment_info',
            'tracking_number', 'deposit_date', 'deposit_date_jalali',
            'receipt_image', 'receipt_image_url', 'amount', 'status',
            'admin_note', 'created_at', 'created_at_jalali', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'receipt_image_url']
    
    def get_account_assignment_info(self, obj):
        """اطلاعات حساب تخصیص داده شده"""
        return DepositAccountAssignmentSerializer(obj.account_assignment).data
    
    def get_receipt_image_url(self, obj):
        """URL کامل تصویر فیش"""
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None
    
    def get_created_at_jalali(self, obj):
        """تبدیل تاریخ به شمسی"""
        if obj.created_at:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_deposit_date_jalali(self, obj):
        """تبدیل تاریخ واریز به شمسی"""
        if obj.deposit_date:
            from jalali_date import date2jalali
            from datetime import date
            # اگر deposit_date یک string است، آن را به date تبدیل کن
            if isinstance(obj.deposit_date, str):
                from datetime import datetime
                try:
                    deposit_date = datetime.strptime(obj.deposit_date, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    return None
            elif isinstance(obj.deposit_date, date):
                deposit_date = obj.deposit_date
            else:
                return None
            jalali_date = date2jalali(deposit_date)
            return jalali_date.strftime('%Y/%m/%d')
        return None


class DepositWithdrawalLinkSerializer(serializers.ModelSerializer):
    """Serializer برای ارتباط واریز-برداشت"""
    deposit_receipt_info = serializers.SerializerMethodField()
    withdrawal_request_info = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()
    
    class Meta:
        model = DepositWithdrawalLink
        fields = [
            'id', 'deposit_receipt', 'withdrawal_request', 'amount',
            'auto_approved', 'deposit_receipt_info', 'withdrawal_request_info',
            'created_at', 'created_at_jalali'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_deposit_receipt_info(self, obj):
        """اطلاعات فیش واریزی"""
        return {
            'id': obj.deposit_receipt.id,
            'deposit_request_code': obj.deposit_receipt.deposit_request.request_code,
            'tracking_number': obj.deposit_receipt.tracking_number,
            'amount': str(obj.deposit_receipt.amount),
        }
    
    def get_withdrawal_request_info(self, obj):
        """اطلاعات درخواست برداشت"""
        return {
            'id': obj.withdrawal_request.id,
            'request_code': obj.withdrawal_request.request_code,
            'user_phone': obj.withdrawal_request.user.phone_number,
            'amount': str(obj.withdrawal_request.amount),
        }
    
    def get_created_at_jalali(self, obj):
        """تبدیل تاریخ به شمسی"""
        if obj.created_at:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None


