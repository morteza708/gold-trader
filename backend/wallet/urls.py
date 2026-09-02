from django.urls import path
from . import views

app_name = 'wallet'

urlpatterns = [
    # Wallet - User
    path('wallet/', views.wallet_info, name='wallet-info'),
    path('wallet/cards/', views.bank_cards, name='bank-cards'),
    path('wallet/cards/<int:card_id>/', views.bank_card_detail, name='bank-card-detail'),
    path('wallet/deposit/', views.create_deposit_request, name='create-deposit-request'),
    path('wallet/withdraw/', views.create_withdrawal_request, name='create-withdrawal-request'),
    path('wallet/withdrawals/', views.withdrawal_requests_list, name='withdrawal-requests-list'),
    path('wallet/deposits/', views.deposit_requests_list, name='deposit-requests-list'),
    path('wallet/gold-pickup-address/', views.gold_pickup_address, name='gold-pickup-address'),
    
    # Wallet - Admin
    path('admin/wallet/withdrawals/', views.admin_withdrawal_requests_list, name='admin-withdrawal-requests-list'),
    path('admin/wallet/withdrawals/<int:request_id>/', views.admin_withdrawal_request_detail, name='admin-withdrawal-request-detail'),
    path('admin/wallet/withdrawals/<int:request_id>/approve/', views.admin_approve_withdrawal, name='admin-approve-withdrawal'),
    path('admin/wallet/withdrawals/<int:request_id>/reject/', views.admin_reject_withdrawal, name='admin-reject-withdrawal'),
    path('admin/wallet/withdrawals/<int:request_id>/complete/', views.admin_complete_gold_withdrawal, name='admin-complete-gold-withdrawal'),
    path('admin/wallet/withdrawals/<int:request_id>/complete-rial/', views.admin_complete_rial_withdrawal, name='admin-complete-rial-withdrawal'),
    path('admin/wallet/withdrawals/<int:request_id>/upload-receipt/', views.admin_upload_receipt, name='admin-upload-receipt'),
    
    # Deposit - Admin
    path('admin/wallet/deposits/', views.admin_deposit_requests_list, name='admin-deposit-requests-list'),
    path('admin/wallet/deposits/<int:request_id>/', views.admin_deposit_request_detail, name='admin-deposit-request-detail'),
    path('admin/wallet/deposits/<int:request_id>/approve/', views.admin_approve_deposit, name='admin-approve-deposit'),  # Old flow (برای سازگاری)
    path('admin/wallet/deposits/<int:request_id>/approve-new/', views.admin_approve_deposit_new_flow, name='admin-approve-deposit-new-flow'),  # New flow
    path('admin/wallet/deposits/<int:request_id>/reject/', views.admin_reject_deposit, name='admin-reject-deposit'),
    path('admin/wallet/deposits/<int:request_id>/withdrawal-requests/', views.admin_get_deposit_withdrawal_requests, name='admin-get-deposit-withdrawal-requests'),
    path('admin/wallet/deposits/<int:request_id>/assign-accounts/', views.admin_assign_deposit_accounts, name='admin-assign-deposit-accounts'),
    
    # Deposit - User (New Flow)
    path('wallet/deposits/<int:request_id>/accounts/', views.user_get_deposit_accounts, name='user-get-deposit-accounts'),
    path('wallet/deposits/<int:request_id>/receipts/', views.user_upload_deposit_receipt, name='user-upload-deposit-receipt'),
    path('wallet/deposits/<int:request_id>/receipts/batch/', views.user_upload_deposit_receipts_batch, name='user-upload-deposit-receipts-batch'),
]
