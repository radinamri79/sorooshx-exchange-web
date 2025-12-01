from django.urls import path
from . import views

app_name = 'trading'

urlpatterns = [
    # Symbols
    path('trading/symbols/', views.symbols_list, name='symbols_list'),
    
    # Orders
    path('trading/orders/', views.orders_list, name='orders_list'),
    path('trading/orders/<uuid:order_id>/', views.order_detail, name='order_detail'),
    path('trading/orders/cancel-all/', views.cancel_all_orders, name='cancel_all_orders'),
    
    # Positions
    path('trading/positions/', views.positions_list, name='positions_list'),
    path('trading/positions/<uuid:position_id>/', views.position_detail, name='position_detail'),
    
    # Trades
    path('trading/trades/', views.trades_list, name='trades_list'),
    
    # Wallet
    path('trading/wallet/', views.wallet_detail, name='wallet_detail'),
    path('trading/wallet/reset/', views.wallet_reset, name='wallet_reset'),
]
