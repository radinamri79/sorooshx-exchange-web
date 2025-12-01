from django.contrib import admin
from .models import Order, Position, Trade, MockWallet


@admin.register(MockWallet)
class MockWalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'available_balance', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'symbol', 'side', 'order_type', 'status', 'quantity', 'price', 'created_at']
    list_filter = ['status', 'side', 'order_type', 'symbol']
    search_fields = ['user__username', 'symbol']
    readonly_fields = ['id', 'created_at', 'updated_at', 'filled_at', 'cancelled_at']
    ordering = ['-created_at']


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'symbol', 'side', 'quantity', 'entry_price', 'leverage', 'is_open', 'created_at']
    list_filter = ['is_open', 'side', 'symbol', 'margin_mode']
    search_fields = ['user__username', 'symbol']
    readonly_fields = ['id', 'created_at', 'updated_at', 'closed_at']
    ordering = ['-created_at']


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'symbol', 'side', 'price', 'quantity', 'commission', 'executed_at']
    list_filter = ['side', 'symbol']
    search_fields = ['user__username', 'symbol']
    readonly_fields = ['id', 'executed_at']
    ordering = ['-executed_at']
