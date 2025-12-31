from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from jalali_date import datetime2jalali
import uuid

from accounts.models import CustomUser, UserRole
from accounts.services import send_double_token_message
from .models import Wallet, BankCard, WithdrawalRequest, DepositRequest, DepositAccountAssignment, DepositReceipt, DepositWithdrawalLink
from settings.models import SystemSettings, DepositAccount
from .serializers import (
    WalletSerializer,
    BankCardSerializer,
    WithdrawalRequestSerializer,
    CreateWithdrawalRequestSerializer,
    DepositRequestSerializer,
    DepositAccountAssignmentSerializer,
    CreateDepositAccountAssignmentSerializer,
    DepositReceiptSerializer,
    DepositWithdrawalLinkSerializer
)


# ==================== User Wallet Views ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_info(request):
    """
    دریافت اطلاعات کیف پول کاربر
    """
    try:
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        serializer = WalletSerializer(wallet)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در wallet_info: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bank_cards(request):
    """
    دریافت لیست کارت‌های بانکی یا افزودن کارت جدید
    """
    try:
        if request.method == 'GET':
            cards = BankCard.objects.select_related('user').filter(user=request.user, is_active=True)
            serializer = BankCardSerializer(cards, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            serializer = BankCardSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        import traceback
        print(f"خطا در bank_cards: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def bank_card_detail(request, card_id):
    """
    ویرایش یا حذف کارت بانکی
    """
    try:
        try:
            card = BankCard.objects.get(id=card_id, user=request.user)
        except BankCard.DoesNotExist:
            return Response(
                {'error': 'کارت بانکی یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'PUT':
            serializer = BankCardSerializer(card, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            card.delete()
            return Response(
                {'message': 'کارت بانکی با موفقیت حذف شد'},
                status=status.HTTP_200_OK
            )
            
    except Exception as e:
        import traceback
        print(f"خطا در bank_card_detail: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_deposit_request(request):
    """
    ایجاد درخواست واریز (فقط مبلغ - بدون tracking_number, deposit_date, receipt_image)
    """
    try:
        serializer = DepositRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        amount = serializer.validated_data['amount']
        # فیلدهای اختیاری - در flow جدید اینها بعدا در receipts ثبت می‌شوند
        tracking_number = serializer.validated_data.get('tracking_number')
        deposit_date = serializer.validated_data.get('deposit_date')
        receipt_image = serializer.validated_data.get('receipt_image')
        
        # تولید کد درخواست منحصر به فرد
        request_code = f"DR-{uuid.uuid4().hex[:8].upper()}"
        
        # ایجاد درخواست (فقط با amount)
        deposit_request = DepositRequest.objects.create(
            user=request.user,
            amount=amount,
            tracking_number=tracking_number,
            deposit_date=deposit_date,
            receipt_image=receipt_image,
            request_code=request_code,
            status='PENDING'
        )
        
        # ارسال پیامک به مدیران
        settings = SystemSettings.get_settings()
        admin_phones = settings.admin_phone_numbers or []
        
        print(f"DEBUG: admin_phone_numbers = {admin_phones}")
        print(f"DEBUG: admin_phone_numbers type = {type(admin_phones)}")
        print(f"DEBUG: admin_phone_numbers length = {len(admin_phones) if admin_phones else 0}")
        
        if admin_phones and len(admin_phones) > 0:
            account_code = request.user.customer_profile.account_code if hasattr(request.user, 'customer_profile') else 'N/A'
            print(f"DEBUG: ارسال پیامک برای درخواست واریز - account_code: {account_code}, amount: {amount}")
            
            for admin_phone in admin_phones:
                try:
                    print(f"DEBUG: در حال ارسال پیامک به {admin_phone}...")
                    result = send_double_token_message(
                        phone_number=admin_phone,
                        token=account_code,
                        token2=f"{int(amount):,}",
                        template='deposit-request-notification-admin'
                    )
                    if result:
                        print(f"✓ پیامک با موفقیت ارسال شد به {admin_phone}")
                    else:
                        print(f"✗ خطا در ارسال پیامک به {admin_phone}")
                except Exception as e:
                    print(f"✗ خطا در ارسال پیامک به {admin_phone}: {e}")
                    import traceback
                    traceback.print_exc()
        else:
            print("⚠ هشدار: شماره مدیران برای دریافت پیامک ثبت نشده است یا لیست خالی است")
            print(f"   تنظیمات فعلی: {settings.admin_phone_numbers}")
        
        # Serialize و برگرداندن
        response_serializer = DepositRequestSerializer(deposit_request, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        print(f"خطا در create_deposit_request: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_withdrawal_request(request):
    """
    ایجاد درخواست برداشت (وجه یا طلا)
    """
    try:
        print(f"دریافت داده‌های درخواست برداشت: {request.data}")
        serializer = CreateWithdrawalRequestSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"خطا در validation serializer: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        withdrawal_type = serializer.validated_data['withdrawal_type']
        amount = serializer.validated_data['amount']
        bank_card_id = serializer.validated_data.get('bank_card_id')
        
        # دریافت یا ایجاد کیف پول
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        
        # بررسی موجودی قابل استفاده (کل - مسدود شده)
        if withdrawal_type == 'RIAL':
            available_balance = wallet.get_available_rial_balance()
            # تبدیل amount به Decimal برای مقایسه صحیح
            from decimal import Decimal
            amount_decimal = Decimal(str(amount))
            print(f"موجودی ریالی: {wallet.rial_balance}, مسدود شده: {wallet.pending_withdrawal_rial}, قابل استفاده: {available_balance}, درخواست: {amount_decimal}")
            if available_balance < amount_decimal:
                return Response(
                    {'error': f'موجودی ریالی کافی نیست. موجودی قابل استفاده: {available_balance}، درخواست: {amount_decimal}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                bank_card = BankCard.objects.get(id=bank_card_id, user=request.user, is_active=True)
            except BankCard.DoesNotExist:
                return Response(
                    {'error': 'کارت بانکی یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:  # GOLD
            available_balance = wallet.get_available_gold_balance()
            # تبدیل amount به Decimal برای مقایسه صحیح
            from decimal import Decimal
            amount_decimal = Decimal(str(amount))
            print(f"موجودی طلا: {wallet.gold_balance}, مسدود شده: {wallet.pending_withdrawal_gold}, قابل استفاده: {available_balance}, درخواست: {amount_decimal}")
            if available_balance < amount_decimal:
                return Response(
                    {'error': f'موجودی طلا کافی نیست. موجودی قابل استفاده: {available_balance}، درخواست: {amount_decimal}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            bank_card = None
        
        # کسر موجودی و اضافه به pending (قبل از ایجاد درخواست)
        from django.db import transaction
        from decimal import Decimal
        amount_decimal = Decimal(str(amount))
        with transaction.atomic():
            if withdrawal_type == 'RIAL':
                wallet.rial_balance -= amount_decimal
                wallet.pending_withdrawal_rial += amount_decimal
            else:  # GOLD
                wallet.gold_balance -= amount_decimal
                wallet.pending_withdrawal_gold += amount_decimal
            wallet.save()
        
        # تولید کد درخواست منحصر به فرد
        request_code = f"WR-{uuid.uuid4().hex[:8].upper()}"
        
        # ایجاد درخواست
        withdrawal_request = WithdrawalRequest.objects.create(
            user=request.user,
            withdrawal_type=withdrawal_type,
            amount=amount_decimal,
            bank_card=bank_card,
            request_code=request_code,
            status='PENDING'
        )
        
        # ارسال پیامک به مدیران
        try:
            settings = SystemSettings.get_settings()
            admin_phones_str = settings.admin_phone_numbers or ''
            
            # تبدیل string به list (اگر string است)
            if isinstance(admin_phones_str, str):
                admin_phones = [phone.strip() for phone in admin_phones_str.split(',') if phone.strip()]
            else:
                admin_phones = admin_phones_str if admin_phones_str else []
            
            if admin_phones:
                account_code = request.user.customer_profile.account_code if hasattr(request.user, 'customer_profile') else 'N/A'
                
                if withdrawal_type == 'RIAL':
                    template = 'withdrawal-request-notification-admin'
                    token2 = f"{int(amount):,}"  # مبلغ به ریال با فرمت جداکننده
                else:  # GOLD
                    template = 'gold-withdrawal-request-notification-admin'
                    token2 = str(float(amount))  # مقدار به گرم (تبدیل به string)
                
                for admin_phone in admin_phones:
                    try:
                        result = send_double_token_message(
                            phone_number=admin_phone,
                            token=account_code,
                            token2=token2,
                            template=template
                        )
                        if result:
                            print(f"✓ پیامک {template} با موفقیت ارسال شد به {admin_phone}")
                        else:
                            print(f"✗ خطا در ارسال پیامک {template} به {admin_phone}")
                    except Exception as e:
                        print(f"✗ خطا در ارسال پیامک {template} به {admin_phone}: {e}")
        except Exception as sms_error:
            print(f"✗ خطا در ارسال پیامک به مدیران: {sms_error}")
            import traceback
            traceback.print_exc()
            # خطای پیامک نباید باعث شکست کل عملیات شود
        
        # Serialize و برگرداندن
        response_serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        print(f"خطا در create_withdrawal_request: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def withdrawal_requests_list(request):
    """
    دریافت لیست درخواست‌های برداشت کاربر
    """
    try:
        requests = WithdrawalRequest.objects.select_related(
            'user', 'user__customer_profile', 'bank_card'
        ).prefetch_related(
            'deposit_links__deposit_receipt',
            'deposit_links__deposit_receipt__deposit_request',
            'deposit_links__deposit_receipt__deposit_request__user',
            'deposit_links__deposit_receipt__deposit_request__user__customer_profile'
        ).filter(user=request.user).order_by('-created_at')
        serializer = WithdrawalRequestSerializer(requests, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در withdrawal_requests_list: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deposit_requests_list(request):
    """
    دریافت لیست درخواست‌های واریز کاربر
    """
    try:
        requests = DepositRequest.objects.select_related('user', 'user__customer_profile').filter(user=request.user).order_by('-created_at')
        serializer = DepositRequestSerializer(requests, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در deposit_requests_list: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gold_pickup_address(request):
    """
    دریافت آدرس مراجعه حضوری برای دریافت طلا
    """
    try:
        settings = SystemSettings.get_settings()
        return Response({
            'address': settings.gold_pickup_address or ''
        }, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در gold_pickup_address: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Admin Wallet Views ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_withdrawal_requests_list(request):
    """
    دریافت لیست درخواست‌های برداشت برای پنل مدیریت
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت پارامترهای فیلتر
        withdrawal_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        
        queryset = WithdrawalRequest.objects.select_related(
            'user', 'user__customer_profile', 'bank_card'
        ).prefetch_related(
            'deposit_links__deposit_receipt',
            'deposit_links__deposit_receipt__deposit_request',
            'deposit_links__deposit_receipt__deposit_request__user',
            'deposit_links__deposit_receipt__deposit_request__user__customer_profile'
        ).all()
        
        if withdrawal_type:
            queryset = queryset.filter(withdrawal_type=withdrawal_type)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        queryset = queryset.order_by('-created_at')
        
        serializer = WithdrawalRequestSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_withdrawal_requests_list: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_withdrawal_request_detail(request, request_id):
    """
    دریافت جزئیات درخواست برداشت
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            withdrawal_request = WithdrawalRequest.objects.select_related(
                'user', 'user__customer_profile', 'bank_card'
            ).prefetch_related(
                'deposit_links__deposit_receipt',
                'deposit_links__deposit_receipt__deposit_request',
                'deposit_links__deposit_receipt__deposit_request__user',
                'deposit_links__deposit_receipt__deposit_request__user__customer_profile'
            ).get(id=request_id)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_withdrawal_request_detail: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_approve_withdrawal(request, request_id):
    """
    تایید درخواست برداشت
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            withdrawal_request = WithdrawalRequest.objects.select_related('user', 'user__customer_profile').get(id=request_id)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if withdrawal_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت یا ایجاد کیف پول
        wallet, created = Wallet.objects.get_or_create(user=withdrawal_request.user)
        
        # بررسی موجودی مسدود شده (باید موجود باشد)
        if withdrawal_request.withdrawal_type == 'RIAL':
            if wallet.pending_withdrawal_rial < withdrawal_request.amount:
                return Response(
                    {'error': 'موجودی ریالی مسدود شده کافی نیست'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:  # GOLD
            if wallet.pending_withdrawal_gold < withdrawal_request.amount:
                return Response(
                    {'error': 'موجودی طلای مسدود شده کافی نیست'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # تایید درخواست و حذف از pending (چون قبلاً از موجودی کسر شده)
        from django.db import transaction
        with transaction.atomic():
            if withdrawal_request.withdrawal_type == 'RIAL':
                wallet.pending_withdrawal_rial -= withdrawal_request.amount
                wallet.save()
                withdrawal_request.status = 'COMPLETED'
                withdrawal_request.save()
            else:  # GOLD
                wallet.pending_withdrawal_gold -= withdrawal_request.amount
                wallet.save()
                withdrawal_request.status = 'APPROVED'
                withdrawal_request.save()
        
        # ارسال پیامک به کاربر
        account_code = withdrawal_request.user.customer_profile.account_code if hasattr(withdrawal_request.user, 'customer_profile') else 'N/A'
        
        if withdrawal_request.withdrawal_type == 'RIAL':
            template = 'withdrawal-approved-user'
            token2 = f"{int(withdrawal_request.amount):,}"  # مبلغ به ریال با فرمت جداکننده
        else:  # GOLD
            template = 'gold-withdrawal-approved-user'
            token2 = float(withdrawal_request.amount)
        
        send_double_token_message(
            phone_number=withdrawal_request.user.phone_number,
            token=account_code,
            token2=token2,
            template=template
        )
        
        serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
        return Response({
            'message': 'درخواست با موفقیت تایید شد',
            'withdrawal_request': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_approve_withdrawal: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_reject_withdrawal(request, request_id):
    """
    رد درخواست برداشت
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            withdrawal_request = WithdrawalRequest.objects.select_related('user', 'user__customer_profile', 'bank_card').get(id=request_id)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if withdrawal_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت دلیل رد
        admin_note = request.data.get('admin_note', '')
        
        # دریافت یا ایجاد کیف پول
        wallet, created = Wallet.objects.get_or_create(user=withdrawal_request.user)
        
        # برگرداندن موجودی از pending به موجودی اصلی
        from django.db import transaction
        with transaction.atomic():
            if withdrawal_request.withdrawal_type == 'RIAL':
                wallet.pending_withdrawal_rial -= withdrawal_request.amount
                wallet.rial_balance += withdrawal_request.amount
            else:  # GOLD
                wallet.pending_withdrawal_gold -= withdrawal_request.amount
                wallet.gold_balance += withdrawal_request.amount
            wallet.save()
            
            # رد درخواست
            withdrawal_request.status = 'REJECTED'
            withdrawal_request.admin_note = admin_note
            withdrawal_request.save()
        
        serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
        return Response({
            'message': 'درخواست رد شد',
            'withdrawal_request': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_reject_withdrawal: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_complete_gold_withdrawal(request, request_id):
    """
    تسویه درخواست برداشت طلا (بعد از تحویل حضوری)
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            withdrawal_request = WithdrawalRequest.objects.select_related('user', 'user__customer_profile').get(id=request_id)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if withdrawal_request.withdrawal_type != 'GOLD':
            return Response(
                {'error': 'فقط برای درخواست‌های برداشت طلا می‌توان تسویه انجام داد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if withdrawal_request.status != 'APPROVED':
            return Response(
                {'error': 'فقط درخواست‌های تایید شده قابل تسویه هستند'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت یا ایجاد کیف پول
        wallet, created = Wallet.objects.get_or_create(user=withdrawal_request.user)
        
        # تسویه درخواست (موجودی قبلاً در زمان تایید کسر شده است)
        from django.utils import timezone
        withdrawal_request.status = 'COMPLETED'
        withdrawal_request.completed_at = timezone.now()
        withdrawal_request.save()
        
        # ارسال پیامک به کاربر
        account_code = withdrawal_request.user.customer_profile.account_code if hasattr(withdrawal_request.user, 'customer_profile') else 'N/A'
        token2 = float(withdrawal_request.amount)
        
        try:
            result = send_double_token_message(
                phone_number=withdrawal_request.user.phone_number,
                token=account_code,
                token2=token2,
                template='gold-withdrawal-completed-user'
            )
            if not result:
                print(f"خطا در ارسال پیامک تسویه طلا به کاربر {withdrawal_request.user.phone_number}")
        except Exception as e:
            print(f"خطا در ارسال پیامک تسویه طلا به کاربر {withdrawal_request.user.phone_number}: {e}")
            import traceback
            traceback.print_exc()
        
        serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
        return Response({
            'message': 'درخواست با موفقیت تسویه شد و موجودی طلا کاهش یافت',
            'withdrawal_request': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_complete_gold_withdrawal: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_upload_receipt(request, request_id):
    """
    آپلود فیش واریزی برای درخواست برداشت وجه
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            withdrawal_request = WithdrawalRequest.objects.select_related('user', 'user__customer_profile', 'bank_card').get(id=request_id)
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if withdrawal_request.withdrawal_type != 'RIAL':
            return Response(
                {'error': 'فقط برای درخواست‌های برداشت وجه می‌توان فیش آپلود کرد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # آپلود فیش
        if 'receipt_image' in request.FILES:
            withdrawal_request.receipt_image = request.FILES['receipt_image']
            withdrawal_request.save()
            
            # ارسال پیامک به کاربر
            try:
                from accounts.services import send_double_token_message
                account_code = withdrawal_request.user.customer_profile.account_code if hasattr(withdrawal_request.user, 'customer_profile') else 'N/A'
                token2 = f"{int(withdrawal_request.amount):,}"  # مبلغ به ریال با فرمت جداکننده
                
                result = send_double_token_message(
                    phone_number=withdrawal_request.user.phone_number,
                    token=account_code,
                    token2=token2,
                    template='withdrawal-receipt-uploaded-user'
                )
                if not result:
                    print(f"خطا در ارسال پیامک فیش واریزی به کاربر {withdrawal_request.user.phone_number}")
            except Exception as e:
                print(f"خطا در ارسال پیامک فیش واریزی به کاربر {withdrawal_request.user.phone_number}: {e}")
                import traceback
                traceback.print_exc()
            
            serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
            return Response({
                'message': 'فیش واریزی با موفقیت آپلود شد',
                'withdrawal_request': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'فایل فیش واریزی ارسال نشده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_upload_receipt: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Admin Deposit Requests Views ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_deposit_requests_list(request):
    """
    لیست درخواست‌های واریز برای ادمین
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # فیلترها
        status_filter = request.GET.get('status')
        query = DepositRequest.objects.select_related('user', 'user__customer_profile').all()
        
        if status_filter:
            query = query.filter(status=status_filter)
        
        # مرتب‌سازی
        query = query.order_by('-created_at')
        
        serializer = DepositRequestSerializer(query, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_deposit_requests_list: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_deposit_request_detail(request, request_id):
    """
    جزئیات درخواست واریز
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            deposit_request = DepositRequest.objects.select_related('user', 'user__customer_profile').get(id=request_id)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = DepositRequestSerializer(deposit_request, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_deposit_request_detail: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_approve_deposit(request, request_id):
    """
    تایید درخواست واریز و افزودن مبلغ به کیف پول
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            deposit_request = DepositRequest.objects.select_related('user', 'user__customer_profile').get(id=request_id)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if deposit_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت یا ایجاد کیف پول
        wallet, created = Wallet.objects.get_or_create(user=deposit_request.user)
        
        # افزودن مبلغ به کیف پول
        wallet.rial_balance += deposit_request.amount
        wallet.save()
        
        # تایید درخواست
        deposit_request.status = 'APPROVED'
        deposit_request.save()
        
        # ارسال پیامک به کاربر
        account_code = deposit_request.user.customer_profile.account_code if hasattr(deposit_request.user, 'customer_profile') else 'N/A'
        
        try:
            result = send_double_token_message(
                phone_number=deposit_request.user.phone_number,
                token=account_code,
                token2=f"{int(deposit_request.amount):,}",  # مبلغ به ریال با فرمت جداکننده
                template='deposit-approved-user'
            )
            if not result:
                print(f"خطا در ارسال پیامک تایید واریز به کاربر {deposit_request.user.phone_number}")
        except Exception as e:
            print(f"خطا در ارسال پیامک تایید واریز به کاربر {deposit_request.user.phone_number}: {e}")
            import traceback
            traceback.print_exc()
        
        serializer = DepositRequestSerializer(deposit_request, context={'request': request})
        return Response({
            'message': 'درخواست با موفقیت تایید شد و مبلغ به کیف پول اضافه شد',
            'deposit_request': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_approve_deposit: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_reject_deposit(request, request_id):
    """
    رد درخواست واریز
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            deposit_request = DepositRequest.objects.select_related('user', 'user__customer_profile').get(id=request_id)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if deposit_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت یادداشت مدیر
        admin_note = request.data.get('admin_note', '')
        
        # رد درخواست
        deposit_request.status = 'REJECTED'
        deposit_request.admin_note = admin_note
        deposit_request.save()
        
        serializer = DepositRequestSerializer(deposit_request, context={'request': request})
        return Response({
            'message': 'درخواست با موفقیت رد شد',
            'deposit_request': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_reject_deposit: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== New Deposit Flow Endpoints ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_deposit_withdrawal_requests(request, request_id):
    """
    دریافت لیست درخواست‌های برداشت برای انتخاب در مودال واریز
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            deposit_request = DepositRequest.objects.select_related('user').get(id=request_id)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست واریز یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # دریافت درخواست‌های برداشت ریالی که در انتظار هستند
        withdrawal_requests = WithdrawalRequest.objects.filter(
            withdrawal_type='RIAL',
            status='PENDING'
        ).select_related('user', 'user__customer_profile', 'bank_card').order_by('-created_at')
        
        # Serialize
        serializer = WithdrawalRequestSerializer(withdrawal_requests, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_get_deposit_withdrawal_requests: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_assign_deposit_accounts(request, request_id):
    """
    ثبت حساب‌های مقصد برای درخواست واریز
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            deposit_request = DepositRequest.objects.select_related('user', 'user__customer_profile').get(id=request_id)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست واریز یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if deposit_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی اینکه آیا قبلاً حساب‌هایی تخصیص داده شده است
        if deposit_request.account_assignments.exists():
            return Response(
                {'error': 'حساب‌ها قبلاً تخصیص داده شده‌اند'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت لیست حساب‌ها از request
        accounts_data = request.data.get('accounts', [])
        if not accounts_data or not isinstance(accounts_data, list):
            return Response(
                {'error': 'لیست حساب‌ها الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # اعتبارسنجی و ایجاد حساب‌ها
        total_amount = 0
        assignments = []
        
        from django.db import transaction
        with transaction.atomic():
            for idx, account_data in enumerate(accounts_data):
                serializer = CreateDepositAccountAssignmentSerializer(data=account_data)
                if not serializer.is_valid():
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                validated_data = serializer.validated_data
                total_amount += validated_data['amount']
                
                # ایجاد تخصیص حساب
                assignment = DepositAccountAssignment.objects.create(
                    deposit_request=deposit_request,
                    account_type=validated_data['account_type'],
                    withdrawal_request_id=validated_data.get('withdrawal_request_id'),
                    deposit_account_id=validated_data.get('deposit_account_id'),
                    custom_bank_name=validated_data.get('custom_bank_name'),
                    custom_owner_name=validated_data.get('custom_owner_name'),
                    custom_card_number=validated_data.get('custom_card_number'),
                    custom_sheba_number=validated_data.get('custom_sheba_number'),
                    amount=validated_data['amount'],
                    order=validated_data.get('order', idx)
                )
                assignments.append(assignment)
            
            # بررسی اینکه مجموع مبالغ برابر با مبلغ درخواست است
            if total_amount != deposit_request.amount:
                return Response(
                    {'error': f'مجموع مبالغ ({total_amount}) باید برابر با مبلغ درخواست ({deposit_request.amount}) باشد'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # ارسال پیامک به کاربر برای ورود به پنل و مشاهده لیست حساب‌ها
        account_code = deposit_request.user.customer_profile.account_code if hasattr(deposit_request.user, 'customer_profile') else 'N/A'
        
        try:
            # استفاده از send_message با یک token (کد حساب کاربری)
            from accounts.services import send_message
            send_message(
                phone_number=deposit_request.user.phone_number,
                message=account_code,  # فقط کد حساب کاربری
                template='deposit-accounts-sms'  # template جدید
            )
        except Exception as e:
            print(f"خطا در ارسال پیامک حساب‌ها به کاربر {deposit_request.user.phone_number}: {e}")
            import traceback
            traceback.print_exc()
        
        # Serialize و برگرداندن
        response_serializer = DepositAccountAssignmentSerializer(assignments, many=True)
        return Response({
            'message': 'حساب‌ها با موفقیت تخصیص داده شد و پیامک به کاربر ارسال شد',
            'assignments': response_serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_assign_deposit_accounts: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_get_deposit_accounts(request, request_id):
    """
    دریافت لیست حساب‌های تخصیص داده شده برای درخواست واریز (برای کاربر)
    """
    try:
        try:
            deposit_request = DepositRequest.objects.select_related('user').get(id=request_id, user=request.user)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست واریز یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # دریافت تخصیص‌های حساب
        assignments = deposit_request.account_assignments.all().select_related(
            'withdrawal_request', 'withdrawal_request__bank_card',
            'deposit_account'
        ).order_by('order')
        
        serializer = DepositAccountAssignmentSerializer(assignments, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در user_get_deposit_accounts: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_upload_deposit_receipt(request, request_id):
    """
    آپلود فیش واریزی برای یک حساب خاص
    """
    try:
        try:
            deposit_request = DepositRequest.objects.select_related('user').get(id=request_id, user=request.user)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست واریز یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # دریافت assignment_id
        assignment_id = request.data.get('assignment_id')
        if not assignment_id:
            return Response(
                {'error': 'assignment_id الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            assignment = DepositAccountAssignment.objects.get(
                id=assignment_id,
                deposit_request=deposit_request
            )
        except DepositAccountAssignment.DoesNotExist:
            return Response(
                {'error': 'حساب تخصیص داده شده یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # بررسی اینکه آیا قبلاً فیشی برای این حساب آپلود شده است
        if assignment.receipts.exists():
            return Response(
                {'error': 'برای این حساب قبلاً فیش واریزی آپلود شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت داده‌های فیش
        tracking_number = request.data.get('tracking_number')
        deposit_date_str = request.data.get('deposit_date')
        receipt_image = request.FILES.get('receipt_image')
        amount = request.data.get('amount')
        
        if not all([tracking_number, deposit_date_str, receipt_image, amount]):
            return Response(
                {'error': 'تمام فیلدها الزامی هستند'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تبدیل تاریخ از string به date object
        from datetime import datetime
        try:
            deposit_date = datetime.strptime(deposit_date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError) as e:
            return Response(
                {'error': f'فرمت تاریخ نامعتبر است. فرمت صحیح: YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # اعتبارسنجی مبلغ
        from decimal import Decimal
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal != assignment.amount:
                return Response(
                    {'error': f'مبلغ باید برابر با {assignment.amount} ریال باشد'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'مبلغ نامعتبر است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ایجاد فیش واریزی
        receipt = DepositReceipt.objects.create(
            deposit_request=deposit_request,
            account_assignment=assignment,
            tracking_number=tracking_number,
            deposit_date=deposit_date,
            receipt_image=receipt_image,
            amount=amount_decimal,
            status='PENDING'
        )
        
        # Serialize و برگرداندن
        serializer = DepositReceiptSerializer(receipt, context={'request': request})
        return Response({
            'message': 'فیش واریزی با موفقیت آپلود شد',
            'receipt': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        print(f"خطا در user_upload_deposit_receipt: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_upload_deposit_receipts_batch(request, request_id):
    """
    آپلود دسته‌ای فیش‌های واریزی برای یک درخواست واریز
    """
    try:
        try:
            deposit_request = DepositRequest.objects.select_related('user').get(id=request_id, user=request.user)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست واریز یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # دریافت لیست فیش‌ها از FormData
        # در FormData، داده‌ها به صورت receipts[0][field] ارسال می‌شوند
        receipts_data = []
        index = 0
        while True:
            assignment_id_key = f'receipts[{index}][assignment_id]'
            if assignment_id_key not in request.data:
                break
            
            assignment_id = request.data.get(assignment_id_key)
            tracking_number = request.data.get(f'receipts[{index}][tracking_number]')
            deposit_date_str = request.data.get(f'receipts[{index}][deposit_date]')
            amount = request.data.get(f'receipts[{index}][amount]')
            receipt_image = request.FILES.get(f'receipts[{index}][receipt_image]')
            
            receipts_data.append({
                'assignment_id': assignment_id,
                'tracking_number': tracking_number,
                'deposit_date': deposit_date_str,
                'amount': amount,
                'receipt_image': receipt_image,
            })
            index += 1
        
        if len(receipts_data) == 0:
            return Response(
                {'error': 'حداقل یک فیش باید ارسال شود'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت assignments
        assignments = DepositAccountAssignment.objects.filter(
            deposit_request=deposit_request
        )
        
        created_receipts = []
        errors = []
        
        from datetime import datetime
        from decimal import Decimal
        
        for receipt_data in receipts_data:
            assignment_id = receipt_data.get('assignment_id')
            if not assignment_id:
                errors.append({'assignment_id': 'assignment_id الزامی است'})
                continue
            
            try:
                assignment = assignments.get(id=assignment_id)
            except DepositAccountAssignment.DoesNotExist:
                errors.append({'assignment_id': f'حساب با id {assignment_id} یافت نشد'})
                continue
            
            # بررسی اینکه آیا قبلاً فیشی برای این حساب آپلود شده است
            if assignment.receipts.exists():
                errors.append({'assignment_id': f'برای حساب {assignment_id} قبلاً فیش آپلود شده است'})
                continue
            
            # دریافت داده‌های فیش
            tracking_number = receipt_data.get('tracking_number')
            deposit_date_str = receipt_data.get('deposit_date')
            receipt_image = receipt_data.get('receipt_image')
            amount = receipt_data.get('amount')
            
            if not all([tracking_number, deposit_date_str, receipt_image, amount]):
                errors.append({'assignment_id': f'تمام فیلدها برای حساب {assignment_id} الزامی هستند'})
                continue
            
            # تبدیل تاریخ
            try:
                deposit_date = datetime.strptime(deposit_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                errors.append({'assignment_id': f'فرمت تاریخ برای حساب {assignment_id} نامعتبر است'})
                continue
            
            # اعتبارسنجی مبلغ
            try:
                amount_decimal = Decimal(str(amount))
                if amount_decimal != assignment.amount:
                    errors.append({'assignment_id': f'مبلغ برای حساب {assignment_id} باید برابر با {assignment.amount} ریال باشد'})
                    continue
            except (ValueError, TypeError):
                errors.append({'assignment_id': f'مبلغ برای حساب {assignment_id} نامعتبر است'})
                continue
            
            # ایجاد فیش واریزی
            try:
                receipt = DepositReceipt.objects.create(
                    deposit_request=deposit_request,
                    account_assignment=assignment,
                    tracking_number=tracking_number,
                    deposit_date=deposit_date,
                    receipt_image=receipt_image,
                    amount=amount_decimal,
                    status='PENDING'
                )
                created_receipts.append(receipt)
            except Exception as e:
                errors.append({'assignment_id': f'خطا در ایجاد فیش برای حساب {assignment_id}: {str(e)}'})
        
        if errors:
            # اگر خطایی وجود دارد، فیش‌های ایجاد شده را حذف می‌کنیم
            for receipt in created_receipts:
                receipt.delete()
            return Response(
                {'error': 'خطا در ثبت فیش‌ها', 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ارسال پیامک به مدیران
        try:
            from settings.models import SystemSettings
            settings = SystemSettings.get_settings()
            admin_phones = settings.admin_phone_numbers or []
            
            print(f"DEBUG: admin_phone_numbers = {admin_phones}")
            print(f"DEBUG: admin_phone_numbers length = {len(admin_phones) if admin_phones else 0}")
            
            if admin_phones and len(admin_phones) > 0:
                account_code = deposit_request.user.customer_profile.account_code if hasattr(deposit_request.user, 'customer_profile') else 'N/A'
                from accounts.services import send_double_token_message
                
                print(f"DEBUG: ارسال پیامک deposit-receipt-uploaded-admin - account_code: {account_code}, amount: {deposit_request.amount}")
                
                for admin_phone in admin_phones:
                    try:
                        print(f"DEBUG: در حال ارسال پیامک deposit-receipt-uploaded-admin به {admin_phone}...")
                        result = send_double_token_message(
                            phone_number=admin_phone,
                            token=account_code,
                            token2=f"{int(deposit_request.amount):,}",
                            template='deposit-receipt-uploaded-admin'
                        )
                        if result:
                            print(f"✓ پیامک deposit-receipt-uploaded-admin با موفقیت ارسال شد به مدیر {admin_phone}")
                        else:
                            print(f"✗ خطا در ارسال پیامک deposit-receipt-uploaded-admin به مدیر {admin_phone}")
                    except Exception as e:
                        print(f"✗ خطا در ارسال پیامک deposit-receipt-uploaded-admin به مدیر {admin_phone}: {e}")
                        import traceback
                        traceback.print_exc()
            else:
                print("⚠ هشدار: شماره مدیران برای دریافت پیامک ثبت نشده است یا لیست خالی است")
                print(f"   تنظیمات فعلی: {settings.admin_phone_numbers}")
        except Exception as sms_error:
            print(f"✗ خطا در ارسال پیامک deposit-receipt-uploaded-admin به مدیر: {sms_error}")
            import traceback
            traceback.print_exc()
            # خطای پیامک نباید باعث شکست کل عملیات شود
        
        # Serialize و برگرداندن
        serializer = DepositReceiptSerializer(created_receipts, many=True, context={'request': request})
        return Response({
            'message': f'{len(created_receipts)} فیش واریزی با موفقیت ثبت شد',
            'receipts': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        print(f"خطا در user_upload_deposit_receipts_batch: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_approve_deposit_new_flow(request, request_id):
    """
    تایید نهایی درخواست واریز با پردازش خودکار
    - بررسی تمام فیش‌های واریزی
    - تایید آن‌ها
    - افزودن مبلغ به کیف پول
    - پردازش خودکار واریزها به درخواست‌های برداشت
    - ارسال پیامک‌های مناسب
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            deposit_request = DepositRequest.objects.select_related('user', 'user__customer_profile').prefetch_related(
                'account_assignments__receipts',
                'account_assignments__withdrawal_request',
                'account_assignments__deposit_account'
            ).get(id=request_id)
        except DepositRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست واریز یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if deposit_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی اینکه حساب‌ها تخصیص داده شده‌اند
        assignments = deposit_request.account_assignments.all()
        if not assignments.exists():
            return Response(
                {'error': 'ابتدا باید حساب‌ها را تخصیص دهید'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تبدیل queryset به list برای استفاده بعد از delete
        assignments_list = list(assignments)
        
        # بررسی اینکه تمام فیش‌ها آپلود شده‌اند
        all_receipts_uploaded = True
        missing_assignments = []
        for assignment in assignments_list:
            if not assignment.receipts.exists():
                all_receipts_uploaded = False
                missing_assignments.append(assignment.get_account_display())
        
        if not all_receipts_uploaded:
            return Response(
                {'error': f'فیش واریزی برای حساب‌های زیر آپلود نشده است: {", ".join(missing_assignments)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی اینکه تمام فیش‌ها تایید شده‌اند (یا در انتظار)
        receipts = DepositReceipt.objects.filter(
            deposit_request=deposit_request,
            status__in=['PENDING', 'APPROVED']
        )
        
        from django.db import transaction
        from django.utils import timezone
        from decimal import Decimal
        
        # لیست کاربرانی که باید پیامک دریافت کنند
        users_to_notify = []
        
        with transaction.atomic():
            # 1. تایید تمام فیش‌ها
            receipts.update(status='APPROVED', updated_at=timezone.now())
            
            # 2. دریافت یا ایجاد کیف پول
            wallet, created = Wallet.objects.get_or_create(user=deposit_request.user)
            
            # 3. افزودن مبلغ به کیف پول
            wallet.rial_balance += deposit_request.amount
            wallet.save()
            
            # 4. پردازش خودکار واریزها به درخواست‌های برداشت
            links_created = []
            for assignment in assignments_list:
                if assignment.account_type == 'WITHDRAWAL' and assignment.withdrawal_request:
                    withdrawal_request = assignment.withdrawal_request
                    receipt = assignment.receipts.first()  # باید فقط یک receipt داشته باشد
                    
                    if not receipt:
                        continue
                    
                    # بررسی اینکه درخواست برداشت هنوز در انتظار است
                    if withdrawal_request.status == 'PENDING':
                        # ایجاد لینک
                        link = DepositWithdrawalLink.objects.create(
                            deposit_receipt=receipt,
                            withdrawal_request=withdrawal_request,
                            amount=assignment.amount,
                            auto_approved=True
                        )
                        links_created.append(link)
                        
                        # تایید خودکار درخواست برداشت
                        # موجودی قبلاً در زمان ایجاد درخواست کسر شده است
                        # آزاد کردن موجودی مسدود شده
                        withdrawal_wallet, _ = Wallet.objects.get_or_create(user=withdrawal_request.user)
                        if withdrawal_request.withdrawal_type == 'RIAL':
                            withdrawal_wallet.pending_withdrawal_rial -= withdrawal_request.amount
                        else:  # GOLD
                            withdrawal_wallet.pending_withdrawal_gold -= withdrawal_request.amount
                        withdrawal_wallet.save()
                        withdrawal_request.status = 'APPROVED'
                        withdrawal_request.save()
                        
                        # ذخیره اطلاعات برای ارسال پیامک بعد از transaction
                        account_code = withdrawal_request.user.customer_profile.account_code if hasattr(withdrawal_request.user, 'customer_profile') else 'N/A'
                        users_to_notify.append({
                            'phone_number': withdrawal_request.user.phone_number,
                            'account_code': account_code,
                            'amount': withdrawal_request.amount,
                            'template': 'withdrawal-approved-user',
                            'user_type': 'withdrawal'
                        })
            
            # 5. تایید درخواست واریز
            deposit_request.status = 'APPROVED'
            deposit_request.save()
            
            # 6. نگه داشتن assignments برای حفظ receipts و links
            # مشکل: اگر assignment حذف شود، receipt هم حذف می‌شود (CASCADE در DepositReceipt.account_assignment)
            # و اگر receipt حذف شود، DepositWithdrawalLink هم حذف می‌شود (CASCADE در DepositWithdrawalLink.deposit_receipt)
            # پس assignments را حذف نمی‌کنیم تا receipts و links حفظ شوند
            # این assignments دیگر استفاده نمی‌شوند اما برای گزارش‌گیری و ردیابی نگه داشته می‌شوند
            # for assignment in assignments_list:
            #     assignment.delete()
            
            # ذخیره اطلاعات کاربر واریز کننده برای ارسال پیامک بعد از transaction
            account_code = deposit_request.user.customer_profile.account_code if hasattr(deposit_request.user, 'customer_profile') else 'N/A'
            users_to_notify.append({
                'phone_number': deposit_request.user.phone_number,
                'account_code': account_code,
                'amount': deposit_request.amount,
                'template': 'deposit-approved-user',
                'user_type': 'deposit'
            })
        
        # ارسال پیامک‌ها خارج از transaction (تا اگر خطایی رخ داد، transaction rollback نشود)
        for user_info in users_to_notify:
            try:
                result = send_double_token_message(
                    phone_number=user_info['phone_number'],
                    token=user_info['account_code'],
                    token2=f"{int(user_info['amount']):,}",
                    template=user_info['template']
                )
                if result:
                    print(f"✓ پیامک {user_info['user_type']} با موفقیت ارسال شد به {user_info['phone_number']}")
                else:
                    print(f"✗ خطا در ارسال پیامک {user_info['user_type']} به {user_info['phone_number']}")
            except Exception as e:
                print(f"✗ خطا در ارسال پیامک {user_info['user_type']} به کاربر {user_info['phone_number']}: {e}")
                import traceback
                traceback.print_exc()
        
        # Serialize و برگرداندن
        deposit_serializer = DepositRequestSerializer(deposit_request, context={'request': request})
        links_serializer = DepositWithdrawalLinkSerializer(links_created, many=True, context={'request': request}) if links_created else None
        
        return Response({
            'message': 'درخواست با موفقیت تایید شد و پردازش خودکار انجام شد',
            'deposit_request': deposit_serializer.data,
            'auto_approved_withdrawals': links_serializer.data if links_serializer else [],
            'auto_approved_count': len(links_created)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_approve_deposit_new_flow: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


