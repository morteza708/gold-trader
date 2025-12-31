from django.urls import path
from . import views

app_name = 'trades'

urlpatterns = [
    # User Endpoints
    path('trades/price/', views.get_current_price, name='get-current-price'),
    path('trades/status/', views.get_trades_status, name='get-trades-status'),
    path('trades/buy/', views.buy_gold, name='buy-gold'),
    path('trades/sell/', views.sell_gold, name='sell-gold'),
    path('trades/orders/', views.orders_view, name='orders'),
    path('trades/orders/<int:order_id>/', views.cancel_order, name='cancel-order'),
    path('trades/', views.get_trades, name='get-trades'),
    path('trades/<int:trade_id>/', views.get_trade_detail, name='get-trade-detail'),
    path('trades/<int:trade_id>/invoice/', views.download_invoice_pdf, name='download-invoice-pdf'),
    
    # Admin Endpoints
    path('admin/trades/status/', views.admin_get_trades_status, name='admin-get-trades-status'),
    path('admin/trades/status/toggle/', views.admin_toggle_trades_status, name='admin-toggle-trades-status'),
    path('admin/trades/price/current/', views.admin_get_current_price, name='admin-get-current-price'),
    path('admin/trades/price/update/', views.admin_update_price, name='admin-update-price'),
    path('admin/trades/price/history/', views.admin_get_price_history, name='admin-get-price-history'),
    path('admin/trades/', views.admin_get_trades, name='admin-get-trades'),
    path('admin/trades/<int:trade_id>/', views.admin_get_trade_detail, name='admin-get-trade-detail'),
    path('admin/trades/orders/', views.admin_get_orders, name='admin-get-orders'),
]

