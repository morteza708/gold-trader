from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import uuid
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from django.utils.decorators import method_decorator
import logging
from .serializers import (
    SendOTPSerializer,
    VerifyOTPSerializer,
    CompleteProfileSerializer,
    UpdateProfileSerializer,
    UserSerializer,
    AdminUserListSerializer,
    AdminRegisterPhoneSerializer,
    AdminVerifyPhoneSerializer,
)
from .models import CustomUser, UserRole
from .services import send_message, persian_to_english_numbers, send_double_token_message
from django.db.models import Q, Count, Sum
from jalali_date import datetime2jalali
import re
from wallet.models import Wallet, DepositRequest, WithdrawalRequest
from trades.models import Trade
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
logger = logging.getLogger('accounts')


@ratelimit(key='ip', rate='5/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """
    ارسال کد OTP به شماره موبایل
    Rate Limit: 5 requests per minute per IP
    """
    logger.info(f"[OTP] درخواست دریافت شد - data: {request.data}")
    serializer = SendOTPSerializer(data=request.data)
    if serializer.is_valid():
        logger.info(f"[OTP] Serializer معتبر است - validated_data: {serializer.validated_data}")
        try:
            result = serializer.create(serializer.validated_data)
            logger.info(f"[OTP] create() اجرا شد - result: {result}")
        except Exception as e:
            logger.error(f"[OTP] خطا در create(): {e}", exc_info=True)
        return Response(
            {'message': 'کد OTP با موفقیت ارسال شد'},
            status=status.HTTP_200_OK
        )
    logger.warning(f"[OTP] Serializer نامعتبر - errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@ratelimit(key='ip', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    تایید کد OTP و لاگین کاربر
    Rate Limit: 10 requests per minute per IP
    """
    serializer = VerifyOTPSerializer(data=request.data)
    if serializer.is_valid():
        phone_number = serializer.validated_data['phone_number']
        user = CustomUser.objects.get(phone_number=phone_number)
        
        # پاک کردن کد OTP بعد از استفاده
        user.otp_code = None
        user.otp_code_created = None
        user.save()
        
        # تولید JWT Token
        refresh = RefreshToken.for_user(user)
        
        # بررسی اینکه آیا پروفایل کامل است یا نه
        profile_completed = user.is_profile_complete()
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'profile_completed': profile_completed,
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    """
    دریافت اطلاعات کاربر فعلی
    """
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_profile(request):
    """
    تکمیل پروفایل کاربر
    """
    serializer = CompleteProfileSerializer(
        request.user,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'پروفایل با موفقیت تکمیل شد',
            'user': UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    به‌روزرسانی پروفایل کاربر
    قابل ویرایش: first_name, last_name, birth_date, avatar
    """
    serializer = UpdateProfileSerializer(
        request.user,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        # به‌روزرسانی user object برای دریافت avatar URL
        request.user.refresh_from_db()
        return Response({
            'message': 'پروفایل با موفقیت به‌روزرسانی شد',
            'user': UserSerializer(request.user, context={'request': request}).data
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    خروج از سیستم (Blacklist کردن Token)
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'با موفقیت خارج شدید'},
                status=status.HTTP_200_OK
            )
        # اگر refresh token ارسال نشد، سعی می‌کنیم از header استفاده کنیم
        # یا همه token های کاربر را blacklist کنیم
        return Response(
            {'message': 'با موفقیت خارج شدید'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_register_phone(request):
    """
    ثبت شماره موبایل جدید از پنل مدیریت
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    # بررسی دسترسی
    if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
        return Response(
            {'error': 'شما دسترسی به این بخش ندارید'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = AdminRegisterPhoneSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'شماره موبایل با موفقیت ثبت شد',
            'user': {
                'id': user.id,
                'phone_number': user.phone_number,
                'is_phone_verified': user.is_phone_verified
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_verify_phone(request):
    """
    تایید شماره موبایل از پنل مدیریت
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    # بررسی دسترسی
    if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
        return Response(
            {'error': 'شما دسترسی به این بخش ندارید'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = AdminVerifyPhoneSerializer(data=request.data)
    if serializer.is_valid():
        phone_number = serializer.validated_data['phone_number']
        send_invite = serializer.validated_data.get('send_invite', True)
        
        user = CustomUser.objects.get(phone_number=phone_number)
        was_verified = user.is_phone_verified
        
        # تایید شماره موبایل
        user.is_phone_verified = True
        user.save()
        
        # اگر قبلا تایید نشده بود و درخواست ارسال دعوت شده باشد، پیام دعوت ارسال کن
        if not was_verified and send_invite:
            try:
                # دریافت account_code از customer_profile
                account_code = ''
                if hasattr(user, 'customer_profile'):
                    account_code = user.customer_profile.account_code
                send_message(phone_number, account_code, template='invite-sms')
            except Exception as e:
                # اگر ارسال پیامک با خطا مواجه شد، لاگ کن اما ادامه بده
                print(f"خطا در ارسال پیام دعوت: {e}")
        
        return Response({
            'message': 'شماره موبایل با موفقیت تایید شد',
            'user': {
                'id': user.id,
                'phone_number': user.phone_number,
                'is_phone_verified': user.is_phone_verified
            }
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_register_or_verify_phone(request):
    """
    ثبت یا تایید شماره موبایل از پنل مدیریت
    اگر شماره وجود نداشت، ثبت می‌کند
    اگر شماره وجود داشت، تایید می‌کند
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        phone_number = request.data.get('phone_number')
        send_invite = request.data.get('send_invite', True)
        
        if not phone_number:
            return Response(
                {'error': 'شماره موبایل الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تبدیل اعداد فارسی به انگلیسی و پاکسازی
        phone_number = persian_to_english_numbers(str(phone_number))
        phone_number = re.sub(r'\s+', '', phone_number)
        
        # بررسی فرمت شماره موبایل
        if not re.match(r'^09\d{9}$', phone_number):
            return Response(
                {'error': 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی اینکه شماره وجود دارد یا نه
        try:
            user = CustomUser.objects.get(phone_number=phone_number)
            # شماره وجود دارد، پس تایید می‌کنیم
            was_verified = user.is_phone_verified
            user.is_phone_verified = True
            
            # اگر role ارسال شده باشد و کاربر SUPER_ADMIN نباشد، role را تغییر بده
            role = request.data.get('role')
            if role and role in [UserRole.CUSTOMER, UserRole.SITE_ADMIN] and user.role != UserRole.SUPER_ADMIN:
                user.role = role
            
            user.save()
            
            # اگر قبلا تایید نشده بود و درخواست ارسال دعوت شده باشد، پیام دعوت ارسال کن
            if not was_verified and send_invite:
                try:
                    # دریافت account_code از customer_profile
                    account_code = ''
                    if hasattr(user, 'customer_profile'):
                        account_code = user.customer_profile.account_code
                    send_message(phone_number, account_code, template='invite-sms')
                except Exception as e:
                    print(f"خطا در ارسال پیام دعوت: {e}")
            
            return Response({
                'message': 'شماره موبایل با موفقیت تایید شد',
                'action': 'verified',
                'user': {
                    'id': user.id,
                    'phone_number': user.phone_number,
                    'is_phone_verified': user.is_phone_verified
                }
            }, status=status.HTTP_200_OK)
            
        except CustomUser.DoesNotExist:
            # شماره وجود ندارد، پس ثبت می‌کنیم
            # ثبت از پنل مدیریت = تایید همزمان
            role = request.data.get('role', UserRole.CUSTOMER)
            serializer = AdminRegisterPhoneSerializer(data={'phone_number': phone_number, 'role': role})
            if serializer.is_valid():
                user = serializer.save()
                # user.is_phone_verified در serializer به True تنظیم شده است
                
                # چون شماره تازه ثبت و تایید شده، پیام دعوت ارسال کن
                if send_invite:
                    try:
                        # دریافت account_code از customer_profile
                        # بعد از ایجاد user، signal باید customer_profile را ایجاد کرده باشد
                        account_code = ''
                        if hasattr(user, 'customer_profile'):
                            account_code = user.customer_profile.account_code
                        send_message(phone_number, account_code, template='invite-sms')
                    except Exception as e:
                        print(f"خطا در ارسال پیام دعوت: {e}")
                
                return Response({
                    'message': 'شماره موبایل با موفقیت ثبت و تایید شد',
                    'action': 'registered',
                    'user': {
                        'id': user.id,
                        'phone_number': user.phone_number,
                        'is_phone_verified': user.is_phone_verified
                    }
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        # لاگ کردن خطا برای دیباگ
        import traceback
        logger.error(f"خطا در admin_register_or_verify_phone: {e}", exc_info=True)
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users_list(request):
    """
    دریافت لیست کاربران برای پنل مدیریت
    با فیلتر و جستجو و بهینه‌سازی کوئری
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت پارامترهای فیلتر و جستجو
        is_verified = request.query_params.get('is_verified')
        is_active = request.query_params.get('is_active')
        role = request.query_params.get('role')
        profile_completed = request.query_params.get('profile_completed')
        search = request.query_params.get('search', '').strip()
        
        # Pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # شروع کوئری با بهینه‌سازی (select_related برای customer_profile)
        queryset = CustomUser.objects.select_related('customer_profile').all()
        
        # فیلتر بر اساس is_phone_verified
        if is_verified is not None:
            is_verified_bool = is_verified.lower() == 'true'
            queryset = queryset.filter(is_phone_verified=is_verified_bool)
        
        # فیلتر بر اساس is_active (پیش‌فرض: فقط فعال‌ها)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        else:
            # پیش‌فرض: فقط کاربران فعال
            queryset = queryset.filter(is_active=True)
        
        # فیلتر بر اساس role
        if role:
            queryset = queryset.filter(role=role)
        
        # فیلتر بر اساس profile_completed
        if profile_completed is not None:
            profile_completed_bool = profile_completed.lower() == 'true'
            queryset = queryset.filter(profile_completed=profile_completed_bool)
        
        # جستجو (پشتیبانی از اعداد فارسی)
        if search:
            # تبدیل اعداد فارسی به انگلیسی برای جستجو
            search_english = persian_to_english_numbers(search)
            queryset = queryset.filter(
                Q(phone_number__icontains=search_english) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(national_id__icontains=search_english) |
                Q(email__icontains=search)
            )
        
        # مرتب‌سازی (جدیدترین اول)
        queryset = queryset.order_by('-date_joined')
        
        # محاسبه آمار (قبل از pagination)
        total_count = queryset.count()
        
        # محاسبه آمار کلی (بدون فیلتر)
        all_users = CustomUser.objects.all()
        verified_count = all_users.filter(is_phone_verified=True).count()
        unverified_count = all_users.filter(is_phone_verified=False).count()
        active_count = all_users.filter(is_active=True).count()
        blocked_count = all_users.filter(is_active=False).count()
        pending_count = all_users.filter(profile_completed=False).count()
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_queryset = queryset[start:end]
        
        # Serialize کردن داده‌ها
        serializer = AdminUserListSerializer(
            paginated_queryset,
            many=True,
            context={'request': request}
        )
        
        # محاسبه تعداد صفحات
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
        
        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'next': page < total_pages,
            'previous': page > 1,
            'results': serializer.data,
            'stats': {
                'total': all_users.count(),
                'active': active_count,
                'blocked': blocked_count,
                'pending': pending_count,
                'verified': verified_count,
                'unverified': unverified_count
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        logger.error(f"خطا در admin_users_list: {e}", exc_info=True)
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id):
    """
    دریافت جزئیات کامل یک کاربر برای پنل مدیریت
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت کاربر با بهینه‌سازی
        try:
            user = CustomUser.objects.select_related('customer_profile').get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'کاربر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize کردن داده‌ها
        serializer = UserSerializer(user, context={'request': request})
        
        # دریافت اطلاعات واقعی کیف پول
        wallet, _ = Wallet.objects.get_or_create(user=user)
        gold_balance = float(wallet.gold_balance)
        rial_balance = int(wallet.rial_balance)
        
        # محاسبه آمار معاملات
        trades = Trade.objects.filter(user=user, status='SUCCESS')
        total_trades = trades.count()
        total_volume_result = trades.aggregate(total=Sum('amount'))
        total_volume = float(total_volume_result['total'] or 0.0)
        
        # اطلاعات اضافی (موجودی طلا و معاملات - واقعی)
        user_data = serializer.data
        user_data['gold_balance'] = gold_balance
        user_data['rial_balance'] = rial_balance
        user_data['total_trades'] = total_trades
        user_data['total_volume'] = total_volume
        
        return Response(user_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        logger.error(f"خطا در admin_user_detail: {e}", exc_info=True)
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_user_toggle_status(request, user_id):
    """
    فعال/غیرفعال کردن کاربر
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت کاربر
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'کاربر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # جلوگیری از غیرفعال کردن خود
        if user.id == request.user.id:
            return Response(
                {'error': 'شما نمی‌توانید حساب خود را غیرفعال کنید'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # جلوگیری از غیرفعال کردن SUPER_ADMIN توسط SITE_ADMIN
        if request.user.role == UserRole.SITE_ADMIN and user.role == UserRole.SUPER_ADMIN:
            return Response(
                {'error': 'شما نمی‌توانید سوپر ادمین را غیرفعال کنید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # تغییر وضعیت
        user.is_active = not user.is_active
        user.save()
        
        # Serialize کردن داده‌های به‌روز شده
        serializer = AdminUserListSerializer(user, context={'request': request})
        
        return Response({
            'message': f'کاربر با موفقیت {"غیرفعال" if not user.is_active else "فعال"} شد',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_user_toggle_status: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    """
    دریافت آمار کلی برای dashboard مدیریت
    فقط برای SITE_ADMIN و SUPER_ADMIN
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # تاریخ امروز (شروع و پایان)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # 1. کاربران کل
        total_users = CustomUser.objects.count()
        
        # 2. کاربران جدید امروز
        new_users_today = CustomUser.objects.filter(
            date_joined__gte=today_start,
            date_joined__lt=today_end
        ).count()
        
        # 3. معاملات امروز (تعداد - فقط موفق)
        trades_today_count = Trade.objects.filter(
            created_at__gte=today_start,
            created_at__lt=today_end,
            status='SUCCESS'
        ).count()
        
        # 4. حجم معاملات امروز (گرم - فقط موفق)
        trades_today_volume = Trade.objects.filter(
            created_at__gte=today_start,
            created_at__lt=today_end,
            status='SUCCESS'
        ).aggregate(total_volume=Sum('amount'))
        total_volume_grams = float(trades_today_volume['total_volume'] or 0.0)
        
        # 5. درآمد امروز (کارمزد - فقط موفق)
        revenue_today = Trade.objects.filter(
            created_at__gte=today_start,
            created_at__lt=today_end,
            status='SUCCESS'
        ).aggregate(total_fee=Sum('fee'))
        total_revenue = int(revenue_today['total_fee'] or 0)
        
        # 6. منتظر تایید (واریز + برداشت)
        pending_deposits = DepositRequest.objects.filter(status='PENDING').count()
        pending_withdrawals = WithdrawalRequest.objects.filter(status='PENDING').count()
        pending_requests = pending_deposits + pending_withdrawals
        
        return Response({
            'total_users': total_users,
            'new_users_today': new_users_today,
            'trades_today_count': trades_today_count,
            'trades_today_volume': total_volume_grams,
            'revenue_today': total_revenue,
            'pending_requests': pending_requests,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        logger.error(f"خطا در admin_dashboard_stats: {e}", exc_info=True)
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
