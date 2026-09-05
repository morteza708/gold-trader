from django.urls import path
from . import views

app_name = 'treasury'

urlpatterns = [
    path('admin/treasury/overview/', views.admin_treasury_overview, name='admin-treasury-overview'),
    path('admin/treasury/settings/', views.admin_treasury_settings, name='admin-treasury-settings'),
    path('admin/treasury/vault-movements/', views.admin_vault_movements, name='admin-vault-movements'),
    path('admin/treasury/journal/', views.admin_operational_journal, name='admin-operational-journal'),
    path('admin/treasury/parties/', views.admin_parties, name='admin-parties'),
]
