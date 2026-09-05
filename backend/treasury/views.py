from decimal import Decimal

from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserRole
from wallet.models import Wallet, WithdrawalRequest

from .models import CompanyTreasury, OperationalJournal, VaultMovement
from . import services
from .serializers import (
    CoverageSnapshotSerializer,
    TreasurySettingsSerializer,
    VaultMovementCreateSerializer,
    VaultMovementSerializer,
    OperationalJournalSerializer,
)


def _is_admin(user):
    return getattr(user, 'role', None) in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_treasury_overview(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    snap = services.get_coverage_snapshot()
    serializer = CoverageSnapshotSerializer(snap)
    return Response(serializer.data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_treasury_settings(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    treasury = CompanyTreasury.get_solo()
    if request.method == 'GET':
        return Response(TreasurySettingsSerializer(treasury).data)

    serializer = TreasurySettingsSerializer(treasury, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response({
        'message': 'تنظیمات هشدار با موفقیت ذخیره شد',
        'settings': serializer.data,
        'coverage': CoverageSnapshotSerializer(services.get_coverage_snapshot()).data,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_vault_movements(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        qs = VaultMovement.objects.select_related('created_by').all()[:200]
        return Response(VaultMovementSerializer(qs, many=True).data)

    serializer = VaultMovementCreateSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        # flatten nested error
        errors = serializer.errors
        if 'error' in errors:
            return Response({'error': errors['error'][0] if isinstance(errors['error'], list) else errors['error']},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    previous = services.get_coverage_snapshot()['status']
    movement = serializer.save()
    services.maybe_notify_critical_coverage(previous_status=previous)
    return Response({
        'message': 'حرکت خزانه ثبت شد',
        'movement': VaultMovementSerializer(movement).data,
        'coverage': CoverageSnapshotSerializer(services.get_coverage_snapshot()).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_operational_journal(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    qs = OperationalJournal.objects.select_related('user').all()
    event_type = request.query_params.get('event_type')
    asset = request.query_params.get('asset')
    search = request.query_params.get('search')
    if event_type:
        qs = qs.filter(event_type=event_type)
    if asset:
        qs = qs.filter(asset=asset)
    if search:
        qs = qs.filter(
            Q(note__icontains=search)
            | Q(user__phone_number__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
        )
    qs = qs[:300]
    return Response(OperationalJournalSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_parties(request):
    """بدهکاران طلا و بستانکاران ریال/طلا (برداشت‌های باز)"""
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    gold_debtors = []
    wallets = (
        Wallet.objects.filter(gold_balance__gt=0)
        .select_related('user', 'user__customer_profile')
        .order_by('-gold_balance')[:200]
    )
    for w in wallets:
        u = w.user
        name = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        account_code = None
        if hasattr(u, 'customer_profile') and u.customer_profile:
            account_code = u.customer_profile.account_code
        gold_debtors.append({
            'user_id': u.id,
            'phone_number': u.phone_number,
            'full_name': name or None,
            'account_code': account_code,
            'gold_balance': str(w.gold_balance),
            'rial_balance': str(int(w.rial_balance)),
        })

    open_withdrawals = []
    wr_qs = (
        WithdrawalRequest.objects.filter(status__in=['PENDING', 'APPROVED'])
        .select_related('user', 'user__customer_profile', 'bank_card')
        .order_by('-created_at')[:200]
    )
    for wr in wr_qs:
        u = wr.user
        name = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        account_code = None
        if hasattr(u, 'customer_profile') and u.customer_profile:
            account_code = u.customer_profile.account_code
        open_withdrawals.append({
            'id': wr.id,
            'request_code': wr.request_code,
            'withdrawal_type': wr.withdrawal_type,
            'withdrawal_type_display': 'برداشت ریال' if wr.withdrawal_type == 'RIAL' else 'برداشت طلا',
            'status': wr.status,
            'status_display': {
                'PENDING': 'در انتظار',
                'APPROVED': 'آماده تحویل' if wr.withdrawal_type == 'GOLD' else 'تأیید شده',
            }.get(wr.status, wr.status),
            'amount': str(wr.amount),
            'user_id': u.id,
            'phone_number': u.phone_number,
            'full_name': name or None,
            'account_code': account_code,
        })

    totals = {
        'total_customer_gold': str(services.get_customer_gold_liability()),
        'total_pending_gold_delivery': str(services.get_pending_gold_delivery()),
        'open_rial_withdrawals': str(
            WithdrawalRequest.objects.filter(
                withdrawal_type='RIAL', status='PENDING'
            ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
        ),
    }

    return Response({
        'gold_debtors': gold_debtors,
        'open_withdrawals': open_withdrawals,
        'totals': totals,
        'coverage': CoverageSnapshotSerializer(services.get_coverage_snapshot()).data,
    })
