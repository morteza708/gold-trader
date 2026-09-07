from decimal import Decimal
from datetime import datetime

from django.db.models import Q, Sum
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserRole
from wallet.models import Wallet, WithdrawalRequest

from .models import CompanyTreasury, OperationalJournal, VaultMovement
from . import services
from . import export as treasury_export
from .serializers import (
    CoverageSnapshotSerializer,
    TreasurySettingsSerializer,
    VaultMovementCreateSerializer,
    VaultMovementSerializer,
    OperationalJournalSerializer,
    PnlSnapshotSerializer,
)


def _is_admin(user):
    return getattr(user, 'role', None) in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]


def _parse_date_param(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value.strip(), '%Y-%m-%d').date()
    except ValueError:
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_treasury_overview(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    snap = services.get_coverage_snapshot()
    serializer = CoverageSnapshotSerializer(snap)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_treasury_pnl(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    raw_from = request.query_params.get('from')
    raw_to = request.query_params.get('to')
    date_from = _parse_date_param(raw_from)
    date_to = _parse_date_param(raw_to)
    if raw_from and date_from is None:
        return Response({'error': 'فرمت تاریخ شروع نامعتبر است (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)
    if raw_to and date_to is None:
        return Response({'error': 'فرمت تاریخ پایان نامعتبر است (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)

    snap = services.get_pnl_snapshot(date_from=date_from, date_to=date_to)
    return Response(PnlSnapshotSerializer(snap).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_treasury_export(request):
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    kind = (request.query_params.get('kind') or 'journal').strip().lower()
    if kind not in ('journal', 'vault'):
        return Response(
            {'error': 'نوع خروجی نامعتبر است'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    raw_from = request.query_params.get('from')
    raw_to = request.query_params.get('to')
    date_from = _parse_date_param(raw_from)
    date_to = _parse_date_param(raw_to)
    if date_from is None or date_to is None:
        return Response(
            {'error': 'بازه تاریخ (از و تا) به‌صورت YYYY-MM-DD الزامی است'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    event_type = (request.query_params.get('event_type') or '').strip() or None
    asset = (request.query_params.get('asset') or '').strip() or None

    try:
        if kind == 'journal':
            qs = treasury_export.journal_queryset(
                date_from=date_from,
                date_to=date_to,
                event_type=event_type,
                asset=asset,
            )
            treasury_export.assert_export_count(qs, 'دفتر عملیات')
            row_iter = treasury_export.iter_journal_csv(
                date_from=date_from,
                date_to=date_to,
                event_type=event_type,
                asset=asset,
            )
        else:
            qs = treasury_export.vault_queryset(date_from=date_from, date_to=date_to)
            treasury_export.assert_export_count(qs, 'حرکت خزانه')
            row_iter = treasury_export.iter_vault_csv(
                date_from=date_from,
                date_to=date_to,
            )
    except services.TreasuryError as e:
        return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

    filename = treasury_export.export_filename(kind, date_from, date_to)
    response = StreamingHttpResponse(row_iter, content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


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
    """طلبکاران طلا/ریال (مانده کیف) و برداشت‌های باز"""
    if not _is_admin(request.user):
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    def _user_row(u, gold_balance, rial_balance):
        name = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        account_code = None
        if hasattr(u, 'customer_profile') and u.customer_profile:
            account_code = u.customer_profile.account_code
        return {
            'user_id': u.id,
            'phone_number': u.phone_number,
            'full_name': name or None,
            'account_code': account_code,
            'gold_balance': str(gold_balance),
            'rial_balance': str(int(rial_balance)),
        }

    gold_creditors = []
    wallets_gold = (
        Wallet.objects.filter(gold_balance__gt=0)
        .select_related('user', 'user__customer_profile')
        .order_by('-gold_balance')[:200]
    )
    for w in wallets_gold:
        gold_creditors.append(_user_row(w.user, w.gold_balance, w.rial_balance))

    rial_creditors = []
    wallets_rial = (
        Wallet.objects.filter(rial_balance__gt=0)
        .select_related('user', 'user__customer_profile')
        .order_by('-rial_balance')[:200]
    )
    for w in wallets_rial:
        rial_creditors.append(_user_row(w.user, w.gold_balance, w.rial_balance))

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
                'PENDING': 'در انتظار بررسی',
                'APPROVED': 'آماده تحویل' if wr.withdrawal_type == 'GOLD' else 'تأییدشده — در انتظار پرداخت',
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
        'total_customer_rial': str(services.get_customer_rial_balance_total()),
        'open_rial_withdrawals': str(
            WithdrawalRequest.objects.filter(
                withdrawal_type='RIAL', status='PENDING'
            ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
        ),
    }

    return Response({
        # نام‌های جدید + سازگاری عقب‌رو با کلاینت قبلی
        'gold_creditors': gold_creditors,
        'rial_creditors': rial_creditors,
        'gold_debtors': gold_creditors,
        'open_withdrawals': open_withdrawals,
        'totals': totals,
        'coverage': CoverageSnapshotSerializer(services.get_coverage_snapshot()).data,
    })
