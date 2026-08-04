from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
from decimal import Decimal
import os
from jalali_date import datetime2jalali
from django_ratelimit.decorators import ratelimit
import logging

from accounts.models import UserRole
from .models import GoldPrice, Trade, Order
from .serializers import (
    GoldPriceSerializer,
    GoldPriceAdminSerializer,
    CreateGoldPriceSerializer,
    GoldPriceHistorySerializer,
    TradeSerializer,
    OrderSerializer,
    CreateOrderSerializer,
)
from .services import TradeService

logger = logging.getLogger('trades')

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


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
    """
    دریافت وضعیت معاملات
    """
    try:
        from settings.models import SystemSettings
        settings = SystemSettings.get_settings()
        
        return Response({
            'trades_enabled': settings.trades_enabled,
            'message': 'معاملات فعال است' if settings.trades_enabled else 'معاملات غیرفعال است'
        }, status=status.HTTP_200_OK)
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
        
        # مسیر فونت - ابتدا از backend/static/fonts/ بررسی می‌کنیم، سپس از frontend
        font_paths = [
            os.path.join(settings.BASE_DIR, 'static', 'fonts', 'IRANYekanXVF.woff2'),
            os.path.join(settings.BASE_DIR, '..', 'frontend', 'fonts', 'IRANYekanXVF.woff2'),
        ]
        font_abs_path = None
        for path in font_paths:
            abs_path = os.path.abspath(path)
            if os.path.exists(abs_path):
                font_abs_path = abs_path
                break
        
        # بررسی وجود فایل فونت
        if not font_abs_path or not os.path.exists(font_abs_path):
            return Response(
                {'error': f'فایل فونت یافت نشد. مسیرهای بررسی شده: {font_paths}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # خواندن فونت و تبدیل به base64 برای embed کردن در CSS
        import base64
        font_base64 = None
        try:
            with open(font_abs_path, 'rb') as font_file:
                font_data = font_file.read()
                font_base64 = base64.b64encode(font_data).decode('utf-8')
        except Exception as font_error:
            print(f"خطا در خواندن فونت: {font_error}")
            import traceback
            print(traceback.format_exc())
        
        # تابع تبدیل اعداد به فارسی
        def to_persian_digits(text):
            persian_digits = '۰۱۲۳۴۵۶۷۸۹'
            english_digits = '0123456789'
            for i, digit in enumerate(english_digits):
                text = str(text).replace(digit, persian_digits[i])
            return text
        
        # آماده‌سازی داده‌ها برای template
        context = {
            'invoice_number': to_persian_digits(trade.invoice_number),
            'date': to_persian_digits(date_str),
            'time': to_persian_digits(time_str),
            'seller_label': 'فروشنده' if is_buy else 'خریدار',
            'seller_name': getattr(settings, 'BRAND_COMPANY_NAME', 'شرکت گلد تریدر'),
            'brand_name': getattr(settings, 'BRAND_NAME', 'گلد تریدر'),
            'seller_national_id': '۱۰۱۰۱۲۳۴۵۶۷',
            'buyer_label': 'خریدار' if is_buy else 'فروشنده',
            'buyer_name': f"{trade.user.first_name} {trade.user.last_name}".strip() or trade.user.phone_number or '-',
            'buyer_mobile': to_persian_digits(trade.user.phone_number or '-'),
            'item_description': f"{'خرید' if is_buy else 'فروش'} طلای آب‌شده",
            'amount': to_persian_digits(f"{float(trade.amount):.3f}"),
            'price': to_persian_digits(f"{int(trade.price):,}"),
            'total': to_persian_digits(f"{int(trade.total):,}"),
            'font_base64': font_base64 if font_base64 else '',  # فونت به صورت base64
        }
        
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
    """
    دریافت وضعیت معاملات (Admin)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from settings.models import SystemSettings
        settings = SystemSettings.get_settings()
        
        return Response({
            'trades_enabled': settings.trades_enabled,
            'message': 'معاملات فعال است' if settings.trades_enabled else 'معاملات غیرفعال است'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'خطای سرور: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_toggle_trades_status(request):
    """
    تغییر وضعیت معاملات (Admin)
    """
    try:
        if request.user.role not in [UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN]:
            return Response(
                {'error': 'شما دسترسی به این بخش ندارید'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        enabled = request.data.get('enabled', False)
        
        result = TradeService.toggle_trades_status(enabled)
        
        return Response({
            'trades_enabled': enabled,
            'message': result['message'],
            'suspended_orders': result.get('suspended_orders', 0),
            'resumed_orders': result.get('resumed_orders', 0),
        }, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"خطا در admin_toggle_trades_status: {e}")
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
            return Response(
                {'error': 'قیمت طلا تعریف نشده است'},
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
        
        new_price = GoldPrice.create_new_price(
            buy_base=serializer.validated_data['buy_base_price'],
            sell_base=serializer.validated_data['sell_base_price'],
            buy_margin=serializer.validated_data['buy_margin'],
            sell_margin=serializer.validated_data['sell_margin'],
            user=request.user,
            source='MANUAL'
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
        
        queryset = Trade.objects.select_related('user', 'user__customer_profile').order_by('-created_at')
        
        # فیلترها
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        trade_type = request.query_params.get('type')
        if trade_type:
            queryset = queryset.filter(trade_type=trade_type)
        
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

