from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
from decimal import Decimal, InvalidOperation
import os
import re
from jalali_date import datetime2jalali
from django_ratelimit.decorators import ratelimit
import logging

from accounts.models import UserRole
from .models import GoldPrice, Trade, Order, PendingPurchase
from .serializers import (
    GoldPriceSerializer,
    GoldPriceAdminSerializer,
    CreateGoldPriceSerializer,
    GoldPriceHistorySerializer,
    TradeSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    PendingPurchaseSerializer,
    CreatePendingPurchaseSerializer,
)
from .services import TradeService
from .pending_purchase_service import PendingPurchaseService

logger = logging.getLogger('trades')

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


def _extract_delivery_payload(data) -> dict | None:
    from .delivery_fields import extract_delivery_payload
    return extract_delivery_payload(data)


# ==================== User Endpoints ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_price(request):
    """
    دریافت قیمت فعلی طلا (قیمت نهایی = پایه + حاشیه سود)
    """
    try:
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            return Response(
                {'error': 'قیمت طلا تعریف نشده است'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GoldPriceSerializer(price_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"خطا در get_current_price: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت قیمت. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trades_status(request):
    """دریافت وضعیت بازار (خرید/فروش جداگانه)"""
    try:
        from settings.models import SystemSettings
        from settings.market_status import build_market_status_payload

        settings = SystemSettings.get_settings()
        return Response(build_market_status_payload(settings), status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='30/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_gold(request):
    """
    خرید فوری طلا
    Rate Limit: 30 requests per minute per user
    """
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
        
        if amount <= 0:
            return Response(
                {'error': 'مقدار باید بیشتر از صفر باشد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trade = TradeService.execute_instant_trade(
            user=request.user,
            trade_type='BUY',
            amount=amount
        )
        
        serializer = TradeSerializer(trade)
        return Response({
            'message': 'خرید با موفقیت انجام شد',
            'trade': serializer.data
        }, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"خطا در buy_gold: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در انجام معامله خرید. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='30/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sell_gold(request):
    """
    فروش فوری طلا
    Rate Limit: 30 requests per minute per user
    """
    try:
        amount = Decimal(str(request.data.get('amount', 0)))
        
        if amount <= 0:
            return Response(
                {'error': 'مقدار باید بیشتر از صفر باشد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trade = TradeService.execute_instant_trade(
            user=request.user,
            trade_type='SELL',
            amount=amount
        )
        
        serializer = TradeSerializer(trade)
        return Response({
            'message': 'فروش با موفقیت انجام شد',
            'trade': serializer.data
        }, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"خطا در sell_gold: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در انجام معامله فروش. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='60/m', method='GET', block=True)
@ratelimit(key='user', rate='20/m', method='POST', block=True)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def orders_view(request):
    """
    مدیریت سفارشات: GET برای دریافت لیست، POST برای ایجاد سفارش جدید
    Rate Limit: 60 GET requests per minute, 20 POST requests per minute per user
    """
    if request.method == 'GET':
        # دریافت لیست سفارشات کاربر
        try:
            orders = Order.objects.select_related(
                'user', 'user__customer_profile', 'executed_trade'
            ).filter(user=request.user).order_by('-created_at')
            serializer = OrderSerializer(orders, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"خطا در get_orders: {e}", exc_info=True)
            return Response(
                {'error': 'خطا در دریافت لیست سفارشات. لطفاً دوباره تلاش کنید.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'POST':
        # ایجاد سفارش هوشمند جدید
        try:
            serializer = CreateOrderSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            order = TradeService.create_limit_order(
                user=request.user,
                order_type=serializer.validated_data['order_type'],
                target_price=serializer.validated_data['target_price'],
                amount=serializer.validated_data['amount']
            )
            
            order_serializer = OrderSerializer(order)
            return Response({
                'message': 'سفارش با موفقیت ثبت شد',
                'order': order_serializer.data
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"خطا در create_order: {e}", exc_info=True)
            return Response(
                {'error': 'خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """
    لغو سفارش
    """
    try:
        try:
            order = Order.objects.select_related(
                'user', 'user__customer_profile', 'executed_trade'
            ).get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'سفارش یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        TradeService.cancel_order(order)
        
        return Response({
            'message': 'سفارش با موفقیت لغو شد'
        }, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        import traceback
        print(f"خطا در cancel_order: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trades(request):
    """
    دریافت تاریخچه معاملات کاربر
    """
    try:
        trades = Trade.objects.filter(user=request.user).select_related('user', 'user__customer_profile').order_by('-created_at')
        serializer = TradeSerializer(trades, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در get_trades: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trade_detail(request, trade_id):
    """
    دریافت جزئیات معامله
    """
    try:
        try:
            trade = Trade.objects.select_related('user', 'user__customer_profile').get(id=trade_id, user=request.user)
        except Trade.DoesNotExist:
            return Response(
                {'error': 'معامله یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TradeSerializer(trade)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در get_trade_detail: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_invoice_pdf(request, trade_id):
    """
    دانلود فاکتور PDF
    """
    if not WEASYPRINT_AVAILABLE:
        return Response(
            {'error': 'سرویس تولید PDF در دسترس نیست (WeasyPrint نصب نشده)'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        try:
            # اگر admin است، می‌تواند فاکتور هر معامله‌ای را ببیند
            if request.user.role in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
                trade = Trade.objects.select_related('user', 'user__customer_profile').get(id=trade_id)
            else:
                # کاربر عادی فقط فاکتور معاملات خودش را می‌بیند
                trade = Trade.objects.select_related('user', 'user__customer_profile').get(id=trade_id, user=request.user)
        except Trade.DoesNotExist:
            return Response(
                {'error': 'معامله یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # استخراج تاریخ و ساعت از created_at
        jalali_date = datetime2jalali(trade.created_at)
        date_str = jalali_date.strftime('%Y/%m/%d')
        time_str = jalali_date.strftime('%H:%M')
        
        # تعیین نوع معامله
        is_buy = trade.trade_type == 'BUY'
        
        from settings.invoice_issuer import (
            get_invoice_issuer,
            load_invoice_font_base64,
            load_invoice_logo_base64,
            load_invoice_stamp_base64,
        )
        font_base64 = load_invoice_font_base64()
        if not font_base64:
            return Response(
                {'error': 'فایل فونت فارسی فاکتور یافت نشد'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        issuer = get_invoice_issuer(request)
        logo_base64 = load_invoice_logo_base64() or ''
        stamp_base64 = load_invoice_stamp_base64() or ''

        # تابع تبدیل اعداد به فارسی
        def to_persian_digits(text):
            persian_digits = '۰۱۲۳۴۵۶۷۸۹'
            english_digits = '0123456789'
            for i, digit in enumerate(english_digits):
                text = str(text).replace(digit, persian_digits[i])
            return text

        brand_name = issuer['brand_name']
        brand_initial = (brand_name[:1] if brand_name else 'G')
        national_id = issuer['national_id'] or '—'
        footer_parts = []
        if issuer['address']:
            footer_parts.append(f"آدرس: {issuer['address']}")
        if issuer['phone']:
            footer_parts.append(f"تلفن: {to_persian_digits(issuer['phone'])}")
        footer_text = ' | '.join(footer_parts) if footer_parts else ''
        
        # آماده‌سازی داده‌ها برای template
        from .delivery_fields import delivery_context_for_invoice, format_gold_grams
        context = {
            'invoice_number': to_persian_digits(trade.invoice_number),
            'date': to_persian_digits(date_str),
            'time': to_persian_digits(time_str),
            'seller_label': 'فروشنده' if is_buy else 'خریدار',
            'seller_name': issuer['company_name'],
            'brand_name': brand_name,
            'brand_initial': brand_initial,
            'logo_base64': logo_base64,
            'stamp_base64': stamp_base64,
            'seller_national_id': to_persian_digits(national_id) if national_id != '—' else national_id,
            'buyer_label': 'خریدار' if is_buy else 'فروشنده',
            'buyer_name': f"{trade.user.first_name} {trade.user.last_name}".strip() or trade.user.phone_number or '-',
            'buyer_mobile': to_persian_digits(trade.user.phone_number or '-'),
            'item_description': f"{'خرید' if is_buy else 'فروش'} طلای آب‌شده",
            'amount': to_persian_digits(format_gold_grams(trade.amount)),
            'price': to_persian_digits(f"{int(trade.price):,}"),
            'total': to_persian_digits(f"{int(trade.total):,}"),
            'font_base64': font_base64 if font_base64 else '',
            'footer_text': footer_text,
            'tagline': issuer['tagline'],
            'is_manual': getattr(trade, 'channel', None) == Trade.CHANNEL_MANUAL,
            'settlement_mode_display': (
                trade.get_settlement_mode_display()
                if getattr(trade, 'channel', None) == Trade.CHANNEL_MANUAL
                else ''
            ),
            'payment_status_display': (
                trade.get_payment_status_display()
                if getattr(trade, 'channel', None) == Trade.CHANNEL_MANUAL
                else ''
            ),
        }
        context.update(delivery_context_for_invoice(trade, to_persian=to_persian_digits))
        
        # رندر کردن template
        try:
            html_string = render_to_string('invoice.html', context)
        except Exception as template_error:
            import traceback
            error_trace = traceback.format_exc()
            print(f"خطا در رندر template: {template_error}")
            print(error_trace)
            if settings.DEBUG:
                return Response(
                    {'error': f'خطا در رندر template: {str(template_error)}', 'trace': error_trace},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response(
                {'error': 'خطا در تولید فاکتور. لطفاً با پشتیبانی تماس بگیرید.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # تولید PDF با استفاده از WeasyPrint
        try:
            # تنظیمات CSS برای صفحه A5
            page_css = CSS(string='''
                @page {
                    size: A5;
                    margin: 10mm;
                }
                body {
                    font-family: 'IRANYekan', Tahoma, Arial, sans-serif;
                }
            ''')
            
            # تولید PDF از HTML string
            html_doc = HTML(string=html_string)
            pdf_data = html_doc.write_pdf(stylesheets=[page_css])
        except Exception as pdf_error:
            import traceback
            error_trace = traceback.format_exc()
            print(f"خطا در تولید PDF: {pdf_error}")
            print(error_trace)
            # در حالت debug، جزئیات خطا را برگردان
            if settings.DEBUG:
                return Response(
                    {'error': f'خطا در تولید PDF: {str(pdf_error)}', 'trace': error_trace},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response(
                {'error': 'خطا در تولید PDF. لطفاً با پشتیبانی تماس بگیرید.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # ارسال PDF به عنوان response
        try:
            response = HttpResponse(pdf_data, content_type='application/pdf')
            # استفاده از نام فایل با کاراکترهای ASCII برای سازگاری بیشتر
            filename = f"invoice-{trade.invoice_number}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as response_error:
            import traceback
            error_trace = traceback.format_exc()
            print(f"خطا در ارسال response: {response_error}")
            print(error_trace)
            if settings.DEBUG:
                return Response(
                    {'error': f'خطا در ارسال response: {str(response_error)}', 'trace': error_trace},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response(
                {'error': 'خطا در ارسال فایل. لطفاً با پشتیبانی تماس بگیرید.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except Trade.DoesNotExist:
        return Response(
            {'error': 'معامله یافت نشد'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        import sys
        error_trace = traceback.format_exc()
        # Log به stderr که در Docker logs نمایش داده می‌شود
        print(f"خطا در download_invoice_pdf: {e}", file=sys.stderr)
        print(error_trace, file=sys.stderr)
        # در حالت debug، جزئیات خطا را برگردان
        if settings.DEBUG:
            return Response(
                {'error': f'خطای سرور: {str(e)}', 'trace': error_trace},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response(
            {'error': 'خطا در تولید PDF. لطفاً با پشتیبانی تماس بگیرید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Admin Endpoints ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_trades_status(request):
    """دریافت وضعیت بازار (Admin)"""
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )

        from settings.models import SystemSettings
        from settings.market_status import build_market_status_payload
        from trades.models import Order

        settings = SystemSettings.get_settings()
        payload = build_market_status_payload(settings)
        payload['suspended_buy_orders'] = Order.objects.filter(
            status='SUSPENDED', order_type='BUY_LIMIT', suspended_reason=Order.SUSPENDED_REASON_KILL_SWITCH
        ).count()
        payload['suspended_sell_orders'] = Order.objects.filter(
            status='SUSPENDED', order_type='SELL_LIMIT', suspended_reason=Order.SUSPENDED_REASON_KILL_SWITCH
        ).count()
        return Response(payload, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_toggle_trades_status(request):
    """Deprecated — هر دو side با هم (سازگاری عقب‌رو)"""
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )

        enabled = request.data.get('enabled', False)
        result = TradeService.toggle_trades_status(enabled)

        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_toggle_trades_status: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_update_market_control(request):
    """تغییر وضعیت خرید/فروش به‌صورت جداگانه"""
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )

        buy_enabled = request.data.get('buy_enabled')
        sell_enabled = request.data.get('sell_enabled')
        if buy_enabled is None or sell_enabled is None:
            return Response(
                {'error': 'buy_enabled و sell_enabled الزامی هستند'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_notice = request.data.get('admin_notice')
        result = TradeService.update_market_control(
            buy_enabled=bool(buy_enabled),
            sell_enabled=bool(sell_enabled),
            admin_notice=admin_notice if admin_notice is not None else None,
        )
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_update_market_control: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_current_price(request):
    """
    دریافت قیمت فعلی (Admin - با جزئیات)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            live_token = getattr(settings, 'VIRAGOLD_API_TOKEN', '') or ''
            return Response(
                {
                    'error': 'قیمت طلا تعریف نشده است',
                    'live_feed_enabled': bool(live_token),
                    'live_symbol_id': int(getattr(settings, 'VIRAGOLD_SYMBOL_ID', 1197)),
                    'live_symbol_name': 'گرم ۱۸ عیار / حواله',
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GoldPriceAdminSerializer(price_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_get_current_price: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_update_price(request):
    """
    به‌روزرسانی قیمت دستی (Admin)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateGoldPriceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        live_feed_enabled = bool(getattr(settings, 'VIRAGOLD_API_TOKEN', '') or '')
        current = GoldPrice.get_current_price()

        if live_feed_enabled:
            if not current:
                return Response(
                    {'error': 'قیمت پایه هنوز از API دریافت نشده است. چند لحظه صبر کنید و دوباره تلاش کنید.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            buy_base = current.buy_base_price
            sell_base = current.sell_base_price
            source = 'API'
        else:
            buy_base = serializer.validated_data['buy_base_price']
            sell_base = serializer.validated_data['sell_base_price']
            source = 'MANUAL'

        buy_margin = serializer.validated_data['buy_margin']
        sell_margin = serializer.validated_data['sell_margin']

        if sell_margin > sell_base:
            return Response(
                {'error': 'حاشیه سود فروش نمی‌تواند از قیمت پایه فروش بیشتر باشد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if sell_base - sell_margin <= 0:
            return Response(
                {'error': 'قیمت نهایی فروش باید بیشتر از صفر باشد'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if (
            current
            and current.buy_base_price == buy_base
            and current.sell_base_price == sell_base
            and current.buy_margin == buy_margin
            and current.sell_margin == sell_margin
        ):
            price_serializer = GoldPriceAdminSerializer(current)
            return Response({
                'message': 'تغییری در قیمت اعمال نشد',
                'price': price_serializer.data
            }, status=status.HTTP_200_OK)

        new_price = GoldPrice.create_new_price(
            buy_base=buy_base,
            sell_base=sell_base,
            buy_margin=buy_margin,
            sell_margin=sell_margin,
            user=request.user,
            source=source,
            market=current.market_snapshot() if current and source == 'API' else None,
        )
        
        price_serializer = GoldPriceAdminSerializer(new_price)
        return Response({
            'message': 'قیمت با موفقیت به‌روزرسانی شد',
            'price': price_serializer.data
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        print(f"خطا در admin_update_price: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_price_history(request):
    """
    دریافت تاریخچه قیمت‌ها برای نمودار (Admin)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.query_params.get('days', 30))
        history = GoldPrice.get_price_history(days=days)
        serializer = GoldPriceHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_get_price_history: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_trades(request):
    """
    دریافت لیست معاملات (Admin - با فیلتر)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Trade.objects.select_related(
            'user', 'user__customer_profile', 'created_by'
        ).order_by('-created_at')
        
        # فیلترها
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        trade_type = request.query_params.get('type')
        if trade_type:
            queryset = queryset.filter(trade_type=trade_type)

        channel = request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel=channel)

        queryset = queryset[:500]
        
        serializer = TradeSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_get_trades: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_trade_detail(request, trade_id):
    """
    دریافت جزئیات معامله (Admin)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            trade = Trade.objects.select_related('user', 'user__customer_profile').get(id=trade_id)
        except Trade.DoesNotExist:
            return Response(
                {'error': 'معامله یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TradeSerializer(trade)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_get_trade_detail: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_orders(request):
    """
    دریافت لیست سفارشات (Admin)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        orders = Order.objects.select_related(
            'user', 'user__customer_profile', 'executed_trade'
        ).order_by('-created_at')
        
        # فیلترها
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_get_orders: {e}")
        print(traceback.format_exc())
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Pending Purchase (خرید با تسویه بعدی) ====================

@ratelimit(key='user', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_pending_purchase(request):
    """ثبت خرید معلق وقتی موجودی کافی نیست"""
    try:
        serializer = CreatePendingPurchaseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingPurchaseService.create_pending_purchase(
            user=request.user,
            gold_amount=serializer.validated_data['amount'],
        )
        return Response({
            'message': 'خرید معلق ثبت شد. لطفاً فرآیند واریز را تکمیل کنید.',
            'pending_purchase': PendingPurchaseSerializer(pending).data,
            'redirect_to': f"/dashboard/wallet?tab=deposit&pending_purchase={pending.id}",
        }, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"خطا در create_pending_purchase: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در ثبت خرید معلق. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_pending_purchase(request):
    """خرید معلق فعال کاربر (در صورت وجود)"""
    try:
        pending = PendingPurchaseService.get_active_for_user(request.user)
        if pending:
            PendingPurchaseService.expire_if_needed(pending)
            pending.refresh_from_db()
            if not pending.is_active:
                return Response({'pending_purchase': None}, status=status.HTTP_200_OK)
        return Response({
            'pending_purchase': PendingPurchaseSerializer(pending).data if pending else None
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"خطا در get_active_pending_purchase: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت خرید معلق'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_purchase_detail(request, pending_id):
    try:
        pending = PendingPurchase.objects.select_related('deposit_request', 'trade').get(
            id=pending_id, user=request.user
        )
        if pending.is_active:
            PendingPurchaseService.expire_if_needed(pending)
            pending.refresh_from_db()
        return Response(PendingPurchaseSerializer(pending).data, status=status.HTTP_200_OK)
    except PendingPurchase.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"خطا در get_pending_purchase_detail: {e}", exc_info=True)
        return Response({'error': 'خطای سرور'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_pending_purchase(request, pending_id):
    try:
        pending = PendingPurchaseService.cancel_pending_purchase(
            user=request.user,
            pending_id=pending_id,
            by_admin=False,
        )
        return Response({
            'message': 'خرید معلق لغو شد',
            'pending_purchase': PendingPurchaseSerializer(pending).data,
        }, status=status.HTTP_200_OK)
    except PendingPurchase.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"خطا در cancel_pending_purchase: {e}", exc_info=True)
        return Response({'error': 'خطای سرور'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_pending_purchases(request):
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

        qs = PendingPurchase.objects.select_related(
            'user', 'user__customer_profile', 'deposit_request', 'trade'
        ).order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter == 'active':
            qs = qs.filter(status__in=PendingPurchaseService.ACTIVE_STATUSES)
        elif status_filter:
            qs = qs.filter(status=status_filter)

        serializer = PendingPurchaseSerializer(qs[:100], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"خطا در admin_list_pending_purchases: {e}", exc_info=True)
        return Response({'error': 'خطای سرور'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== فاکتور دستی ====================

def _persian_to_english_phone(value: str) -> str:
    persian = '۰۱۲۳۴۵۶۷۸۹'
    arabic = '٠١٢٣٤٥٦٧٨٩'
    out = str(value or '')
    for i in range(10):
        out = out.replace(persian[i], str(i)).replace(arabic[i], str(i))
    return re.sub(r'\s+', '', out)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_search_customers(request):
    if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    from . import manual_trade_service as mts
    from accounts.services import persian_to_english_numbers
    q = persian_to_english_numbers(request.query_params.get('q', ''))
    users = mts.search_customers(q, limit=20)
    results = []
    for u in users:
        results.append({
            'id': u.id,
            'phone_number': u.phone_number,
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'full_name': f'{u.first_name or ""} {u.last_name or ""}'.strip() or None,
            'national_id': u.national_id or '',
            'is_phone_verified': u.is_phone_verified,
            'is_active': u.is_active,
            'profile_completed': u.profile_completed,
        })
    return Response({'results': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_ensure_manual_customer(request):
    if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    from . import manual_trade_service as mts
    phone = _persian_to_english_phone(request.data.get('phone_number', ''))
    try:
        user = mts.ensure_manual_customer(
            phone_number=phone,
            first_name=request.data.get('first_name') or '',
            last_name=request.data.get('last_name') or '',
            national_id=_persian_to_english_phone(request.data.get('national_id') or ''),
        )
    except mts.ManualTradeError as e:
        return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': 'کاربر آماده صدور فاکتور است',
        'user': {
            'id': user.id,
            'phone_number': user.phone_number,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'full_name': f'{user.first_name or ""} {user.last_name or ""}'.strip() or None,
            'national_id': user.national_id or '',
            'is_phone_verified': user.is_phone_verified,
        },
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_manual_trades(request):
    if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    from . import manual_trade_service as mts
    from accounts.models import CustomUser

    if request.method == 'GET':
        from django.db.models import Exists, OuterRef
        from treasury.models import OperationalJournal
        from treasury.services import REF_MANUAL_PAYMENT, REF_MANUAL_DELIVERY

        qs = (
            Trade.objects.filter(channel=Trade.CHANNEL_MANUAL)
            .select_related('user', 'created_by')
            .annotate(
                _payment_effect_applied=Exists(
                    OperationalJournal.objects.filter(
                        reference_type=REF_MANUAL_PAYMENT,
                        reference_id=OuterRef('pk'),
                    )
                ),
                _delivery_effect_applied=Exists(
                    OperationalJournal.objects.filter(
                        reference_type=REF_MANUAL_DELIVERY,
                        reference_id=OuterRef('pk'),
                    )
                ),
            )
            .order_by('-created_at')[:200]
        )
        return Response(TradeSerializer(qs, many=True).data)

    user_id = request.data.get('user_id')
    phone = _persian_to_english_phone(request.data.get('phone_number', ''))
    try:
        if user_id:
            existing = CustomUser.objects.get(id=user_id, role=UserRole.CUSTOMER)
            user = mts.ensure_manual_customer(
                phone_number=existing.phone_number,
                first_name=request.data.get('first_name') or '',
                last_name=request.data.get('last_name') or '',
                national_id=_persian_to_english_phone(request.data.get('national_id') or ''),
            )
        elif phone:
            user = mts.ensure_manual_customer(
                phone_number=phone,
                first_name=request.data.get('first_name') or '',
                last_name=request.data.get('last_name') or '',
                national_id=_persian_to_english_phone(request.data.get('national_id') or ''),
            )
        else:
            return Response({'error': 'کاربر یا شماره موبایل الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

        trade = mts.create_manual_trade(
            user=user,
            trade_type=request.data.get('trade_type', ''),
            amount=Decimal(str(request.data.get('amount') or '0')),
            unit_price=Decimal(str(request.data.get('unit_price') or '0')),
            settlement_mode=request.data.get('settlement_mode') or Trade.SETTLEMENT_OFFPLATFORM,
            payment_status=request.data.get('payment_status') or Trade.PAYMENT_OFFPLATFORM,
            delivery_status=request.data.get('delivery_status') or Trade.DELIVERY_NA,
            admin_note=request.data.get('admin_note') or '',
            settlement_note=request.data.get('settlement_note') or '',
            delivery_payload=_extract_delivery_payload(request.data),
            created_by=request.user,
        )
    except CustomUser.DoesNotExist:
        return Response({'error': 'کاربر یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    except (mts.ManualTradeError, InvalidOperation, ValueError, TypeError) as e:
        msg = getattr(e, 'message', None) or str(e) or 'خطا در صدور فاکتور'
        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': 'فاکتور دستی با موفقیت صادر شد',
        'trade': TradeSerializer(trade).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_manual_settlement(request, trade_id):
    if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
        return Response({'error': 'شما دسترسی به این بخش ندارید'}, status=status.HTTP_403_FORBIDDEN)

    from . import manual_trade_service as mts
    try:
        trade = Trade.objects.select_related('user', 'created_by').get(id=trade_id)
        trade = mts.update_manual_settlement(
            trade=trade,
            payment_status=request.data.get('payment_status'),
            delivery_status=request.data.get('delivery_status'),
            settlement_note=request.data.get('settlement_note'),
            admin_note=request.data.get('admin_note'),
            amount=(
                Decimal(str(request.data.get('amount')))
                if request.data.get('amount') is not None
                else None
            ),
            unit_price=(
                Decimal(str(request.data.get('unit_price') or request.data.get('price')))
                if request.data.get('unit_price') is not None or request.data.get('price') is not None
                else None
            ),
            delivery_payload=_extract_delivery_payload(request.data),
            created_by=request.user,
            confirm_delivery=bool(request.data.get('confirm_delivery')),
        )
    except Trade.DoesNotExist:
        return Response({'error': 'فاکتور یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    except mts.ManualTradeError as e:
        return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': 'وضعیت تسویه به‌روزرسانی شد',
        'trade': TradeSerializer(trade).data,
    })

