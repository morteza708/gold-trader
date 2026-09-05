from django.contrib import admin

from .models import CompanyTreasury, OperationalJournal, VaultMovement


@admin.register(CompanyTreasury)
class CompanyTreasuryAdmin(admin.ModelAdmin):
    list_display = ['id', 'gold_balance', 'avg_cost_per_gram', 'auto_block_user_buy', 'updated_at']


@admin.register(OperationalJournal)
class OperationalJournalAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'created_at', 'event_type', 'asset', 'amount', 'user', 'balance_after', 'reference_type', 'reference_id'
    ]
    list_filter = ['event_type', 'asset']
    search_fields = ['note', 'user__phone_number']
    readonly_fields = [f.name for f in OperationalJournal._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(VaultMovement)
class VaultMovementAdmin(admin.ModelAdmin):
    list_display = ['id', 'created_at', 'movement_type', 'amount', 'unit_price', 'counterparty', 'created_by']
    list_filter = ['movement_type']
    readonly_fields = [f.name for f in VaultMovement._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
