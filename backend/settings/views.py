from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from accounts.models import UserRole
from .models import SystemSettings, DepositAccount, SitePage
from .serializers import SystemSettingsSerializer, DepositAccountSerializer, SitePageSerializer
from . import support_service


def _is_admin(user):
    return getattr(user, 'role', None) in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def system_settings(request):
    """
    دریافت یا به‌روزرسانی تنظیمات سیستم
    """
    try:
        # بررسی دسترسی
        if not _is_admin(request.user):
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings = SystemSettings.get_settings()
        
        if request.method == 'GET':
            serializer = SystemSettingsSerializer(settings)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'تنظیمات با موفقیت به‌روزرسانی شد',
                    'settings': serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        import traceback
        print(f"خطا در system_settings: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_support_info(request):
    """اطلاعات عمومی Support Hub برای کاربران و سایت"""
    try:
        settings = SystemSettings.get_settings()
        info = support_service.build_public_support_info(settings)
        if not info['enabled']:
            return Response({'enabled': False}, status=status.HTTP_200_OK)
        return Response(info, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در public_support_info: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Deposit Accounts ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deposit_accounts_list(request):
    """
    دریافت لیست حساب‌های بانکی واریز (برای کاربران - فقط حساب‌های فعال)
    """
    try:
        accounts = DepositAccount.objects.filter(is_active=True).order_by('order', 'created_at')
        serializer = DepositAccountSerializer(accounts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در deposit_accounts_list: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_deposit_accounts(request):
    """
    مدیریت حساب‌های بانکی واریز (Admin)
    GET: دریافت لیست تمام حساب‌ها
    POST: ایجاد حساب جدید
    """
    try:
        # بررسی دسترسی
        if not _is_admin(request.user):
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            accounts = DepositAccount.objects.all().order_by('order', 'created_at')
            serializer = DepositAccountSerializer(accounts, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            serializer = DepositAccountSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'حساب بانکی با موفقیت ایجاد شد',
                    'account': serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_deposit_accounts: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_deposit_account_detail(request, account_id):
    """
    مدیریت یک حساب بانکی خاص (Admin)
    GET: دریافت جزئیات
    PUT: به‌روزرسانی
    DELETE: حذف
    """
    try:
        # بررسی دسترسی
        if not _is_admin(request.user):
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            account = DepositAccount.objects.get(id=account_id)
        except DepositAccount.DoesNotExist:
            return Response(
                {'error': 'حساب بانکی یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            serializer = DepositAccountSerializer(account)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            serializer = DepositAccountSerializer(account, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'حساب بانکی با موفقیت به‌روزرسانی شد',
                    'account': serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            account.delete()
            return Response({
                'message': 'حساب بانکی با موفقیت حذف شد'
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"خطا در admin_deposit_account_detail: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Site Pages ====================

VALID_PAGE_SLUGS = {SitePage.SLUG_ABOUT, SitePage.SLUG_CONTACT}


def _truthy(value):
    if value is None:
        return False
    if isinstance(value, (list, tuple)):
        value = value[0] if value else None
        if value is None:
            return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


@api_view(['GET'])
@permission_classes([AllowAny])
def public_site_page(request, slug):
    """دریافت صفحه منتشرشده برای نمایش عمومی"""
    if slug not in VALID_PAGE_SLUGS:
        return Response({'error': 'صفحه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    SitePage.get_or_create_defaults()
    try:
        page = SitePage.objects.get(slug=slug, is_published=True)
    except SitePage.DoesNotExist:
        return Response({'error': 'صفحه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    serializer = SitePageSerializer(page, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_site_pages(request):
    """لیست صفحات سایت برای ادمین"""
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    SitePage.get_or_create_defaults()
    pages = SitePage.objects.all().order_by('slug')
    serializer = SitePageSerializer(pages, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_site_page_detail(request, slug):
    """دریافت یا به‌روزرسانی یک صفحه سایت (ادمین)"""
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    if slug not in VALID_PAGE_SLUGS:
        return Response({'error': 'صفحه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    SitePage.get_or_create_defaults()
    try:
        page = SitePage.objects.get(slug=slug)
    except SitePage.DoesNotExist:
        return Response({'error': 'صفحه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SitePageSerializer(page, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    data = request.data.copy()
    # پاک کردن تصویر در صورت درخواست صریح
    clear_hero = _truthy(data.pop('clear_hero_image', None))
    clear_extra = _truthy(data.pop('clear_extra_image', None))

    serializer = SitePageSerializer(
        page,
        data=data,
        partial=True,
        context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    page = serializer.save()
    if clear_hero and page.hero_image:
        page.hero_image.delete(save=False)
        page.hero_image = None
    if clear_extra and page.extra_image:
        page.extra_image.delete(save=False)
        page.extra_image = None
    if clear_hero or clear_extra:
        page.save()

    out = SitePageSerializer(page, context={'request': request})
    return Response({
        'message': 'صفحه با موفقیت به‌روزرسانی شد',
        'page': out.data,
    }, status=status.HTTP_200_OK)
