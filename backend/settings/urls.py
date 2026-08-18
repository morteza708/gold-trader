from django.urls import path
from . import views

app_name = 'settings'

urlpatterns = [
    path('admin/settings/', views.system_settings, name='system-settings'),
    # Deposit Accounts - User
    path('wallet/deposit-accounts/', views.deposit_accounts_list, name='deposit-accounts-list'),
    # Deposit Accounts - Admin
    path('admin/wallet/deposit-accounts/', views.admin_deposit_accounts, name='admin-deposit-accounts'),
    path('admin/wallet/deposit-accounts/<int:account_id>/', views.admin_deposit_account_detail, name='admin-deposit-account-detail'),
    # Site Pages
    path('pages/<slug:slug>/', views.public_site_page, name='public-site-page'),
    path('admin/pages/', views.admin_site_pages, name='admin-site-pages'),
    path('admin/pages/<slug:slug>/', views.admin_site_page_detail, name='admin-site-page-detail'),
]
