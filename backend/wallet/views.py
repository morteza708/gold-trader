from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from jalali_date import datetime2jalali
import uuid
from django_ratelimit.decorators import ratelimit
import logging

from accounts.models import CustomUser, UserRole
from accounts.services import send_double_token_message, send_triple_token_message
from accounts.image_upload import get_uploaded_image_error
from .models import Wallet, BankCard, WithdrawalRequest, DepositRequest, DepositAccountAssignment, DepositReceipt, DepositWithdrawalLink
from settings.models import SystemSettings, DepositAccount
from .tasks import send_sms_async
from notifications.services import create_notification, create_notification_for_admins
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

logger = logging.getLogger('wallet')


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
        logger.error(f"خطا در wallet_info: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت اطلاعات کیف پول. لطفاً دوباره تلاش کنید.'},
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
        logger.error(f"خطا در bank_cards: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت لیست کارت‌های بانکی. لطفاً دوباره تلاش کنید.'},
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
            card = BankCard.objects.select_related('user').get(id=card_id, user=request.user)
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
        logger.error(f"خطا در bank_card_detail: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت اطلاعات کارت بانکی. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_deposit_request(request):
    """
    ایجاد درخواست واریز (فقط مبلغ - بدون tracking_number, deposit_date, receipt_image)
    Rate Limit: 10 requests per minute per user
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
                    # ارسال async SMS
                    send_sms_async.delay(
                        phone_number=admin_phone,
                        template='deposit-request-notification-admin',
                        token=account_code,
                        token2=f"{int(amount):,}"
                    )
                    logger.info(f"پیامک deposit-request-notification-admin به صف ارسال اضافه شد برای مدیر {admin_phone}")
                    if True:  # برای حفظ منطق
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
        
        # ایجاد notification برای مدیران
        try:
            account_code = request.user.customer_profile.account_code if hasattr(request.user, 'customer_profile') else 'N/A'
            create_notification_for_admins(
                title='درخواست واریز جدید',
                message=f'کاربر {account_code} درخواست واریز به مبلغ {int(amount):,} ریال ثبت کرده است.',
                notification_type='SYSTEM',
                related_object_type='deposit',
                related_object_id=deposit_request.id,
                metadata={
                    'user_phone': request.user.phone_number,
                    'account_code': account_code,
                    'amount': str(amount),
                    'request_code': deposit_request.request_code,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای مدیران (درخواست واریز): {e}", exc_info=True)
        
        # Serialize و برگرداندن
        response_serializer = DepositRequestSerializer(deposit_request, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        logger.error(f"خطا در create_deposit_request: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در ثبت درخواست واریز. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_withdrawal_request(request):
    """
    ایجاد درخواست برداشت (وجه یا طلا)
    Rate Limit: 10 requests per minute per user
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
                bank_card = BankCard.objects.select_related('user').get(id=bank_card_id, user=request.user, is_active=True)
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
                        # ارسال async SMS
                        send_sms_async.delay(
                            phone_number=admin_phone,
                            template=template,
                            token=account_code,
                            token2=token2
                        )
                        logger.info(f"پیامک {template} به صف ارسال اضافه شد برای مدیر {admin_phone}")
                        if True:  # برای حفظ منطق
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
        
        # ایجاد notification برای مدیران
        try:
            account_code = request.user.customer_profile.account_code if hasattr(request.user, 'customer_profile') else 'N/A'
            if withdrawal_type == 'RIAL':
                message = f'کاربر {account_code} درخواست برداشت به مبلغ {int(amount):,} ریال ثبت کرده است.'
            else:
                message = f'کاربر {account_code} درخواست برداشت طلا به مقدار {float(amount)} گرم ثبت کرده است.'
            
            create_notification_for_admins(
                title='درخواست برداشت جدید',
                message=message,
                notification_type='SYSTEM',
                related_object_type='withdrawal',
                related_object_id=withdrawal_request.id,
                metadata={
                    'user_phone': request.user.phone_number,
                    'account_code': account_code,
                    'amount': str(amount),
                    'withdrawal_type': withdrawal_type,
                    'request_code': withdrawal_request.request_code,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای مدیران (درخواست برداشت): {e}", exc_info=True)
        
        # Serialize و برگرداندن
        response_serializer = WithdrawalRequestSerializer(withdrawal_request, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"خطا در create_withdrawal_request: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در ثبت درخواست برداشت. لطفاً دوباره تلاش کنید.'},
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
            withdrawal_request = WithdrawalRequest.objects.select_related(
                'user', 'user__customer_profile'
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
        
        if withdrawal_request.status != 'PENDING':
            return Response(
                {'error': 'این درخواست قبلاً پردازش شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # محاسبه باقی‌مانده
        remaining_amount = withdrawal_request.get_remaining_amount()
        
        # اگر باقی‌مانده <= 0 باشد، یعنی قبلاً پرداخت شده است
        if remaining_amount <= 0:
            return Response(
                {'error': 'این درخواست قبلاً به صورت کامل پرداخت شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت یا ایجاد کیف پول
        wallet, created = Wallet.objects.get_or_create(user=withdrawal_request.user)
        
        # بررسی موجودی مسدود شده (باید موجود باشد)
        # توجه: باید کل مبلغ درخواست را بررسی کنیم، نه فقط باقی‌مانده
        # چون موجودی مسدود شده برای کل مبلغ درخواست است
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
        from django.utils import timezone
        from datetime import date
        import uuid
        
        with transaction.atomic():
            # اگر فیش واریزی وجود دارد و باقی‌مانده > 0 است، باید یک لینک ایجاد کنیم
            # این برای حالتی است که مدیر باقی‌مانده را از طریق مودال برداشت پرداخت می‌کند
            if (withdrawal_request.receipt_image and 
                withdrawal_request.withdrawal_type == 'RIAL' and 
                remaining_amount > 0):
                
                # ایجاد یک DepositRequest برای مدیر (سیستم)
                # این برای ردیابی فیش واریزی باقی‌مانده است
                admin_user = request.user  # مدیر که فیش را آپلود کرده
                deposit_request_code = f"DR-ADMIN-{uuid.uuid4().hex[:8].upper()}"
                
                deposit_request = DepositRequest.objects.create(
                    user=admin_user,
                    amount=remaining_amount,
                    request_code=deposit_request_code,
                    status='APPROVED',  # مستقیماً تایید می‌شود
                    receipt_image=withdrawal_request.receipt_image  # کپی فیش
                )
                
                # ایجاد DepositAccountAssignment از نوع WITHDRAWAL
                assignment = DepositAccountAssignment.objects.create(
                    deposit_request=deposit_request,
                    account_type='WITHDRAWAL',
                    withdrawal_request=withdrawal_request,
                    amount=remaining_amount,
                    order=0
                )
                
                # ایجاد DepositReceipt
                receipt = DepositReceipt.objects.create(
                    deposit_request=deposit_request,
                    account_assignment=assignment,
                    tracking_number=f"ADMIN-{withdrawal_request.request_code}",
                    deposit_date=date.today(),
                    receipt_image=withdrawal_request.receipt_image,  # کپی فیش
                    amount=remaining_amount,
                    status='APPROVED'  # مستقیماً تایید می‌شود
                )
                
                # ایجاد DepositWithdrawalLink
                DepositWithdrawalLink.objects.create(
                    deposit_receipt=receipt,
                    withdrawal_request=withdrawal_request,
                    amount=remaining_amount,
                    auto_approved=False  # تایید دستی توسط مدیر
                )
            
            # آزاد کردن موجودی مسدود شده (کل مبلغ درخواست)
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
        
        # ارسال async SMS
        send_sms_async.delay(
            phone_number=withdrawal_request.user.phone_number,
            template=template,
            token=account_code,
            token2=token2
        )
        
        # ایجاد notification
        try:
            if withdrawal_request.withdrawal_type == 'RIAL':
                message = f'درخواست برداشت شما به مبلغ {int(withdrawal_request.amount):,} ریال تایید شد.'
            else:
                message = f'درخواست برداشت طلا شما به مقدار {float(withdrawal_request.amount)} گرم تایید شد.'
            
            create_notification(
                user=withdrawal_request.user,
                title='تایید برداشت',
                message=message,
                notification_type='WITHDRAWAL_APPROVED',
                related_object_type='withdrawal',
                related_object_id=withdrawal_request.id,
                metadata={
                    'amount': str(withdrawal_request.amount),
                    'withdrawal_type': withdrawal_request.withdrawal_type,
                    'request_code': withdrawal_request.request_code,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای تایید برداشت: {e}", exc_info=True)
        
        # اگر برداشت ناقص بوده و حالا تکمیل شده، پیامک تایید برداشت قبلاً ارسال شده است
        # فیش‌های مرتبط در پنل کاربری نمایش داده می‌شوند
        # نیازی به پیامک اضافی نیست چون withdrawal-approved-user قبلاً ارسال شده است
        
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
        
        # ایجاد notification
        try:
            if withdrawal_request.withdrawal_type == 'RIAL':
                message = f'درخواست برداشت شما به مبلغ {int(withdrawal_request.amount):,} ریال رد شد.'
            else:
                message = f'درخواست برداشت طلا شما به مقدار {float(withdrawal_request.amount)} گرم رد شد.'
            
            if admin_note:
                message += f' یادداشت مدیر: {admin_note}'
            
            create_notification(
                user=withdrawal_request.user,
                title='رد درخواست برداشت',
                message=message,
                notification_type='WITHDRAWAL_REJECTED',
                related_object_type='withdrawal',
                related_object_id=withdrawal_request.id,
                metadata={
                    'amount': str(withdrawal_request.amount),
                    'withdrawal_type': withdrawal_request.withdrawal_type,
                    'request_code': withdrawal_request.request_code,
                    'admin_note': admin_note,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای رد برداشت: {e}", exc_info=True)
        
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
        
        # ارسال async SMS
        try:
            send_sms_async.delay(
                phone_number=withdrawal_request.user.phone_number,
                template='gold-withdrawal-completed-user',
                token=account_code,
                token2=token2
            )
        except Exception as e:
            logger.error(f"خطا در queue کردن پیامک تسویه طلا به کاربر {withdrawal_request.user.phone_number}: {e}", exc_info=True)
        
        # ایجاد notification
        try:
            create_notification(
                user=withdrawal_request.user,
                title='تکمیل برداشت طلا',
                message=f'درخواست برداشت طلا شما به مقدار {float(withdrawal_request.amount)} گرم با موفقیت تسویه شد.',
                notification_type='WITHDRAWAL_COMPLETED',
                related_object_type='withdrawal',
                related_object_id=withdrawal_request.id,
                metadata={
                    'amount': str(withdrawal_request.amount),
                    'withdrawal_type': withdrawal_request.withdrawal_type,
                    'request_code': withdrawal_request.request_code,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای تکمیل برداشت طلا: {e}", exc_info=True)
        
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
            receipt_image = request.FILES['receipt_image']
            image_error = get_uploaded_image_error(receipt_image)
            if image_error:
                return Response(
                    {'error': image_error},
                    status=status.HTTP_400_BAD_REQUEST
                )
            withdrawal_request.receipt_image = receipt_image
            withdrawal_request.save()
            
            # ارسال پیامک به کاربر
            # ارسال async SMS
            try:
                account_code = withdrawal_request.user.customer_profile.account_code if hasattr(withdrawal_request.user, 'customer_profile') else 'N/A'
                token2 = f"{int(withdrawal_request.amount):,}"  # مبلغ به ریال با فرمت جداکننده
                
                send_sms_async.delay(
                    phone_number=withdrawal_request.user.phone_number,
                    template='withdrawal-receipt-uploaded-user',
                    token=account_code,
                    token2=token2
                )
            except Exception as e:
                logger.error(f"خطا در queue کردن پیامک فیش واریزی به کاربر {withdrawal_request.user.phone_number}: {e}", exc_info=True)
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
        
        # ارسال async SMS
        try:
            send_sms_async.delay(
                phone_number=deposit_request.user.phone_number,
                template='deposit-approved-user',
                token=account_code,
                token2=f"{int(deposit_request.amount):,}"  # مبلغ به ریال با فرمت جداکننده
            )
        except Exception as e:
            logger.error(f"خطا در queue کردن پیامک تایید واریز به کاربر {deposit_request.user.phone_number}: {e}", exc_info=True)
        
        # ایجاد notification
        try:
            create_notification(
                user=deposit_request.user,
                title='تایید واریز',
                message=f'درخواست واریز شما به مبلغ {int(deposit_request.amount):,} ریال تایید شد و مبلغ به کیف پول شما اضافه شد.',
                notification_type='DEPOSIT_APPROVED',
                related_object_type='deposit',
                related_object_id=deposit_request.id,
                metadata={
                    'amount': str(deposit_request.amount),
                    'request_code': deposit_request.request_code,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای تایید واریز: {e}", exc_info=True)
        
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
            
            # بررسی اینکه مجموع مبالغ کمتر یا مساوی مبلغ درخواست است
            # اجازه می‌دهیم partial payment انجام شود (مبلغ تخصیص یافته می‌تواند کمتر از مبلغ درخواست باشد)
            if total_amount > deposit_request.amount:
                return Response(
                    {'error': f'مجموع مبالغ ({total_amount}) نمی‌تواند بیشتر از مبلغ درخواست ({deposit_request.amount}) باشد'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if total_amount <= 0:
                return Response(
                    {'error': 'حداقل یک حساب با مبلغ بیشتر از صفر باید تخصیص داده شود'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # ارسال پیامک به کاربر برای ورود به پنل و مشاهده لیست حساب‌ها
        account_code = deposit_request.user.customer_profile.account_code if hasattr(deposit_request.user, 'customer_profile') else 'N/A'
        
        # ارسال async SMS
        try:
            send_sms_async.delay(
                phone_number=deposit_request.user.phone_number,
                template='deposit-accounts-sms',
                token=account_code  # فقط کد حساب کاربری
            )
            logger.info(f"پیامک deposit-accounts-sms به صف ارسال اضافه شد برای کاربر {deposit_request.user.phone_number}")
        except Exception as e:
            logger.error(f"خطا در queue کردن پیامک حساب‌ها به کاربر {deposit_request.user.phone_number}: {e}", exc_info=True)
        
        # ایجاد notification برای کاربر
        try:
            create_notification(
                user=deposit_request.user,
                title='حساب‌های واریز تخصیص داده شد',
                message=f'حساب‌های واریز برای درخواست شما به مبلغ {int(deposit_request.amount):,} ریال تخصیص داده شد. لطفاً وارد پنل کاربری شوید و فیش‌های واریزی را آپلود کنید.',
                notification_type='SYSTEM',
                related_object_type='deposit',
                related_object_id=deposit_request.id,
                metadata={
                    'amount': str(deposit_request.amount),
                    'request_code': deposit_request.request_code,
                    'assignments_count': len(assignments),
                }
            )
            logger.info(f"Notification ایجاد شد برای کاربر {deposit_request.user.phone_number}: حساب‌های واریز تخصیص داده شد")
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای کاربر {deposit_request.user.phone_number}: {e}", exc_info=True)
        
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
            assignment = DepositAccountAssignment.objects.select_related(
                'deposit_request', 'deposit_request__user',
                'withdrawal_request', 'withdrawal_request__user',
                'deposit_account'
            ).get(
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

        image_error = get_uploaded_image_error(receipt_image)
        if image_error:
            return Response(
                {'error': image_error},
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
        
        # Debug: چاپ کلیدهای موجود
        print(f"DEBUG: request.data keys: {list(request.data.keys())}")
        print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
        
        while True:
            assignment_id_key = f'receipts[{index}][assignment_id]'
            if assignment_id_key not in request.data:
                break
            
            assignment_id = request.data.get(assignment_id_key)
            tracking_number = request.data.get(f'receipts[{index}][tracking_number]')
            deposit_date_str = request.data.get(f'receipts[{index}][deposit_date]')
            amount = request.data.get(f'receipts[{index}][amount]')
            receipt_image = request.FILES.get(f'receipts[{index}][receipt_image]')
            
            print(f"DEBUG: Receipt {index}: assignment_id={assignment_id}, tracking_number={tracking_number}, deposit_date={deposit_date_str}, amount={amount}, receipt_image={receipt_image}")
            
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
        assignments = DepositAccountAssignment.objects.select_related(
            'deposit_request', 'deposit_request__user',
            'withdrawal_request', 'withdrawal_request__user',
            'deposit_account'
        ).filter(
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
                print(f"DEBUG: assignment found: id={assignment.id}, amount={assignment.amount}, type={type(assignment.amount)}")
            except DepositAccountAssignment.DoesNotExist:
                print(f"DEBUG: assignment with id {assignment_id} not found")
                errors.append({'assignment_id': f'حساب با id {assignment_id} یافت نشد'})
                continue
            except Exception as e:
                print(f"DEBUG: خطا در دریافت assignment: {e}")
                import traceback
                traceback.print_exc()
                errors.append({'assignment_id': f'خطا در دریافت حساب {assignment_id}: {str(e)}'})
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
            
            # Debug: چاپ داده‌های دریافتی
            print(f"DEBUG receipt_data for assignment {assignment_id}:")
            print(f"  tracking_number: {tracking_number}")
            print(f"  deposit_date_str: {deposit_date_str}")
            print(f"  receipt_image: {receipt_image}")
            print(f"  amount: {amount}")
            
            if not all([tracking_number, deposit_date_str, receipt_image, amount]):
                missing_fields = []
                if not tracking_number:
                    missing_fields.append('tracking_number')
                if not deposit_date_str:
                    missing_fields.append('deposit_date')
                if not receipt_image:
                    missing_fields.append('receipt_image')
                if not amount:
                    missing_fields.append('amount')
                errors.append({
                    'assignment_id': f'فیلدهای زیر برای حساب {assignment_id} الزامی هستند: {", ".join(missing_fields)}'
                })
                continue

            image_error = get_uploaded_image_error(receipt_image)
            if image_error:
                errors.append({'assignment_id': f'فیش حساب {assignment_id}: {image_error}'})
                continue
            
            # تبدیل تاریخ
            try:
                deposit_date = datetime.strptime(deposit_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                errors.append({'assignment_id': f'فرمت تاریخ برای حساب {assignment_id} نامعتبر است'})
                continue
            
            # اعتبارسنجی مبلغ
            try:
                # تبدیل amount به Decimal برای مقایسه
                amount_decimal = Decimal(str(amount))
                assignment_amount_decimal = Decimal(str(assignment.amount))
                
                print(f"DEBUG: amount_decimal={amount_decimal}, assignment.amount={assignment_amount_decimal}")
                
                # بررسی اینکه مبلغ باید بیشتر از صفر و کمتر یا مساوی assignment.amount باشد
                if amount_decimal <= 0:
                    print(f"DEBUG: مبلغ باید بیشتر از صفر باشد")
                    errors.append({'assignment_id': f'مبلغ برای حساب {assignment_id} باید بیشتر از صفر باشد'})
                    continue
                
                if amount_decimal > assignment_amount_decimal:
                    print(f"DEBUG: مبلغ بیشتر از assignment است: {amount_decimal} > {assignment_amount_decimal}")
                    errors.append({'assignment_id': f'مبلغ برای حساب {assignment_id} نمی‌تواند بیشتر از {assignment.amount} ریال باشد (ارسال شده: {amount_decimal})'})
                    continue
                
                # اگر مبلغ کمتر از assignment.amount باشد، این partial payment است و مجاز است
                print(f"DEBUG: مبلغ معتبر است (partial payment مجاز است)")
            except (ValueError, TypeError) as e:
                print(f"DEBUG: خطا در تبدیل مبلغ: {e}")
                import traceback
                traceback.print_exc()
                errors.append({'assignment_id': f'مبلغ برای حساب {assignment_id} نامعتبر است: {str(e)}'})
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
                        # ارسال async SMS
                        send_sms_async.delay(
                            phone_number=admin_phone,
                            template='deposit-receipt-uploaded-admin',
                            token=account_code,
                            token2=f"{int(deposit_request.amount):,}"
                        )
                        logger.info(f"پیامک deposit-receipt-uploaded-admin به صف ارسال اضافه شد برای مدیر {admin_phone}")
                    except Exception as e:
                        logger.error(f"خطا در queue کردن پیامک deposit-receipt-uploaded-admin به مدیر {admin_phone}: {e}", exc_info=True)
            else:
                print("⚠ هشدار: شماره مدیران برای دریافت پیامک ثبت نشده است یا لیست خالی است")
                print(f"   تنظیمات فعلی: {settings.admin_phone_numbers}")
        except Exception as sms_error:
            print(f"✗ خطا در ارسال پیامک deposit-receipt-uploaded-admin به مدیر: {sms_error}")
            import traceback
            traceback.print_exc()
            # خطای پیامک نباید باعث شکست کل عملیات شود
        
        # ایجاد notification برای مدیران
        try:
            account_code = deposit_request.user.customer_profile.account_code if hasattr(deposit_request.user, 'customer_profile') else 'N/A'
            create_notification_for_admins(
                title='آپلود فیش واریزی',
                message=f'کاربر {account_code} {len(created_receipts)} فیش واریزی برای درخواست {deposit_request.request_code} آپلود کرده است.',
                notification_type='SYSTEM',
                related_object_type='deposit',
                related_object_id=deposit_request.id,
                metadata={
                    'user_phone': deposit_request.user.phone_number,
                    'account_code': account_code,
                    'amount': str(deposit_request.amount),
                    'request_code': deposit_request.request_code,
                    'receipts_count': len(created_receipts),
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای مدیران (آپلود فیش): {e}", exc_info=True)
        
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
        receipts = DepositReceipt.objects.select_related(
            'deposit_request', 'deposit_request__user',
            'account_assignment', 'account_assignment__withdrawal_request',
            'account_assignment__deposit_account'
        ).filter(
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
                        # استفاده از receipt.amount به جای assignment.amount
                        # چون receipt.amount مبلغ واقعی واریز شده است (ممکن است کمتر از assignment.amount باشد)
                        link_amount = receipt.amount
                        
                        # ایجاد لینک (بدون auto_approved - بعداً بررسی می‌کنیم)
                        link = DepositWithdrawalLink.objects.create(
                            deposit_receipt=receipt,
                            withdrawal_request=withdrawal_request,
                            amount=link_amount,  # استفاده از receipt.amount
                            auto_approved=False  # ابتدا False، بعداً بررسی می‌کنیم
                        )
                        links_created.append(link)
                        
                        print(f"DEBUG: Created link for withdrawal {withdrawal_request.id}: receipt.amount={receipt.amount}, assignment.amount={assignment.amount}, link.amount={link_amount}")
                        
                        # محاسبه باقی‌مانده بعد از این واریز
                        # refresh کردن withdrawal_request برای دریافت لینک‌های جدید
                        withdrawal_request.refresh_from_db()
                        remaining_amount = withdrawal_request.get_remaining_amount()
                        
                        # فقط اگر باقی‌مانده = 0 یا کمتر باشد، تایید خودکار انجام می‌شود
                        if remaining_amount <= 0:
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
                            
                            # به‌روزرسانی لینک به auto_approved=True
                            link.auto_approved = True
                            link.save()
                            
                            # ذخیره اطلاعات برای ارسال پیامک بعد از transaction
                            account_code = withdrawal_request.user.customer_profile.account_code if hasattr(withdrawal_request.user, 'customer_profile') else 'N/A'
                            users_to_notify.append({
                                'phone_number': withdrawal_request.user.phone_number,
                                'account_code': account_code,
                                'amount': withdrawal_request.amount,
                                'template': 'withdrawal-approved-user',
                                'user_type': 'withdrawal',
                                'user': withdrawal_request.user,
                                'withdrawal_id': withdrawal_request.id,
                                'withdrawal_type': withdrawal_request.withdrawal_type,
                            })
                        # اگر باقی‌مانده > 0 باشد، درخواست برداشت در حالت PENDING می‌ماند
                        # و مدیر باید باقی‌مانده را از طریق مودال برداشت پرداخت کند
            
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
                'user_type': 'deposit',
                'user': deposit_request.user,
                'deposit_id': deposit_request.id,
            })
        
        # ارسال async پیامک‌ها و ایجاد notification خارج از transaction
        for user_info in users_to_notify:
            try:
                send_sms_async.delay(
                    phone_number=user_info['phone_number'],
                    template=user_info['template'],
                    token=user_info['account_code'],
                    token2=f"{int(user_info['amount']):,}"
                )
                logger.info(f"پیامک {user_info['user_type']} به صف ارسال اضافه شد برای {user_info['phone_number']}")
            except Exception as e:
                logger.error(f"خطا در queue کردن پیامک {user_info['user_type']} به کاربر {user_info['phone_number']}: {e}", exc_info=True)
            
            # ایجاد notification
            try:
                if user_info['user_type'] == 'deposit':
                    logger.info(f"ایجاد notification برای کاربر {user_info['user'].phone_number} - نوع: deposit - deposit_id: {user_info.get('deposit_id')}")
                    notification = create_notification(
                        user=user_info['user'],
                        title='تایید واریز',
                        message=f'درخواست واریز شما به مبلغ {int(user_info["amount"]):,} ریال تایید شد و مبلغ به کیف پول شما اضافه شد.',
                        notification_type='DEPOSIT_APPROVED',
                        related_object_type='deposit',
                        related_object_id=user_info.get('deposit_id'),
                        metadata={
                            'amount': str(user_info['amount']),
                        }
                    )
                    if notification:
                        logger.info(f"✓ Notification با موفقیت ایجاد شد برای کاربر {user_info['user'].phone_number} - ID: {notification.id}")
                    else:
                        logger.error(f"✗ Notification ایجاد نشد برای کاربر {user_info['user'].phone_number}")
                elif user_info['user_type'] == 'withdrawal':
                    if user_info['withdrawal_type'] == 'RIAL':
                        message = f'درخواست برداشت شما به مبلغ {int(user_info["amount"]):,} ریال تایید شد.'
                    else:
                        message = f'درخواست برداشت طلا شما به مقدار {float(user_info["amount"])} گرم تایید شد.'
                    
                    logger.info(f"ایجاد notification برای کاربر {user_info['user'].phone_number} - نوع: withdrawal - withdrawal_id: {user_info.get('withdrawal_id')}")
                    notification = create_notification(
                        user=user_info['user'],
                        title='تایید برداشت',
                        message=message,
                        notification_type='WITHDRAWAL_APPROVED',
                        related_object_type='withdrawal',
                        related_object_id=user_info.get('withdrawal_id'),
                        metadata={
                            'amount': str(user_info['amount']),
                            'withdrawal_type': user_info['withdrawal_type'],
                        }
                    )
                    if notification:
                        logger.info(f"✓ Notification با موفقیت ایجاد شد برای کاربر {user_info['user'].phone_number} - ID: {notification.id}")
                    else:
                        logger.error(f"✗ Notification ایجاد نشد برای کاربر {user_info['user'].phone_number}")
            except Exception as e:
                logger.error(f"خطا در ایجاد notification برای {user_info['user_type']} - کاربر {user_info['user'].phone_number}: {e}", exc_info=True)
        
        # ارسال پیامک به مدیر برای اطلاع از تایید واریز و فیش‌های آپلود شده
        # این پیامک قبلاً در user_upload_deposit_receipts_batch ارسال می‌شود
        # اما برای اطمینان، در اینجا هم ارسال می‌کنیم
        from settings.models import SystemSettings
        # مدیر قبلاً از طریق deposit-receipt-uploaded-admin (در user_upload_deposit_receipts_batch) 
        # و deposit-request-notification-admin (در create_deposit_request) اطلاع پیدا کرده است
        # نیازی به ارسال پیامک اضافی برای مدیر نیست
        # template deposit-approved-user فقط برای کاربر ارسال می‌شود
        
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


