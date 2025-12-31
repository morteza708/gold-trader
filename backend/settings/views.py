from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserRole
from .models import SystemSettings, DepositAccount
from .serializers import SystemSettingsSerializer, DepositAccountSerializer


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def system_settings(request):
    """
    دریافت یا به‌روزرسانی تنظیمات سیستم
    """
    try:
        # بررسی دسترسی
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
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
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
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
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
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

