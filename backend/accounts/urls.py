from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('auth/send-otp/', views.send_otp, name='send-otp'),
    path('auth/verify-otp/', views.verify_otp, name='verify-otp'),
    path('auth/user/', views.user_info, name='user-info'),
    path('auth/complete-profile/', views.complete_profile, name='complete-profile'),
    path('auth/profile/', views.update_profile, name='update-profile'),
    path('auth/logout/', views.logout, name='logout'),
    
    # Admin - Users
    path('admin/users/', views.admin_users_list, name='admin-users-list'),
    path('admin/users/<int:user_id>/', views.admin_user_detail, name='admin-user-detail'),
    path('admin/users/<int:user_id>/toggle-status/', views.admin_user_toggle_status, name='admin-user-toggle-status'),
    path('admin/register-phone/', views.admin_register_phone, name='admin-register-phone'),
    path('admin/verify-phone/', views.admin_verify_phone, name='admin-verify-phone'),
    path('admin/register-or-verify-phone/', views.admin_register_or_verify_phone, name='admin-register-or-verify-phone'),
    
    # Admin - Dashboard Stats
    path('admin/dashboard/stats/', views.admin_dashboard_stats, name='admin-dashboard-stats'),
]

