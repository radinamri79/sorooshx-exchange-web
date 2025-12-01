"""
Trading views for SorooshX Exchange.
Handles orders, positions, and wallet operations.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.users.models import User
from .models import Order, Position, Trade, MockWallet
from .serializers import (
    OrderSerializer, CreateOrderSerializer,
    PositionSerializer, UpdatePositionSerializer, ClosePositionSerializer,
    TradeSerializer, MockWalletSerializer
)
from .services import TradingService


def get_user_from_session(request):
    """Get or create user from session key header."""
    session_key = request.headers.get('X-Session-Key')
    if not session_key:
        return None
    
    try:
        return User.objects.get(guest_session_key=session_key)
    except User.DoesNotExist:
        return None


# ============================================
# Order Endpoints
# ============================================

@api_view(['GET', 'POST'])
def orders_list(request):
    """
    GET: List user's orders (optionally filtered by symbol, status)
    POST: Create a new order
    """
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required. Call POST /api/v1/users/guest/ first.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if request.method == 'GET':
        orders = Order.objects.filter(user=user)
        
        # Filter by symbol
        symbol = request.query_params.get('symbol')
        if symbol:
            orders = orders.filter(symbol=symbol.upper())
        
        # Filter by status
        order_status = request.query_params.get('status')
        if order_status:
            orders = orders.filter(status=order_status)
        
        # Filter active orders only
        active_only = request.query_params.get('active')
        if active_only and active_only.lower() == 'true':
            orders = orders.filter(
                status__in=[Order.Status.PENDING, Order.Status.OPEN, Order.Status.PARTIALLY_FILLED]
            )
        
        serializer = OrderSerializer(orders[:100], many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = TradingService.create_order(user, serializer.validated_data)
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
def order_detail(request, order_id):
    """
    GET: Get order details
    DELETE: Cancel an order
    """
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        order = Order.objects.get(id=order_id, user=user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response(OrderSerializer(order).data)
    
    elif request.method == 'DELETE':
        if not order.is_active:
            return Response(
                {'error': 'Order cannot be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order = TradingService.cancel_order(order)
        return Response(OrderSerializer(order).data)


@api_view(['DELETE'])
def cancel_all_orders(request):
    """Cancel all active orders for a symbol."""
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    symbol = request.query_params.get('symbol')
    cancelled_count = TradingService.cancel_all_orders(user, symbol)
    
    return Response({
        'cancelled': cancelled_count,
        'message': f'Cancelled {cancelled_count} orders'
    })


# ============================================
# Position Endpoints
# ============================================

@api_view(['GET'])
def positions_list(request):
    """List user's positions."""
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    positions = Position.objects.filter(user=user, is_open=True)
    
    # Filter by symbol
    symbol = request.query_params.get('symbol')
    if symbol:
        positions = positions.filter(symbol=symbol.upper())
    
    # Get mark prices from query params for PnL calculation
    mark_prices = {}
    for key, value in request.query_params.items():
        if key.startswith('mark_'):
            symbol_name = key[5:].upper()
            try:
                mark_prices[symbol_name] = Decimal(value)
            except (ValueError, TypeError):
                pass
    
    serializer = PositionSerializer(
        positions,
        many=True,
        context={'mark_prices': mark_prices}
    )
    return Response(serializer.data)


@api_view(['GET', 'PATCH', 'DELETE'])
def position_detail(request, position_id):
    """
    GET: Get position details
    PATCH: Update TP/SL
    DELETE: Close position
    """
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        position = Position.objects.get(id=position_id, user=user, is_open=True)
    except Position.DoesNotExist:
        return Response({'error': 'Position not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        mark_price = request.query_params.get('mark_price', position.entry_price)
        serializer = PositionSerializer(position, context={'mark_price': mark_price})
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = UpdatePositionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if 'take_profit' in serializer.validated_data:
            position.take_profit = serializer.validated_data['take_profit']
        if 'stop_loss' in serializer.validated_data:
            position.stop_loss = serializer.validated_data['stop_loss']
        
        position.save()
        return Response(PositionSerializer(position).data)
    
    elif request.method == 'DELETE':
        serializer = ClosePositionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        close_price = serializer.validated_data.get('price')
        close_quantity = serializer.validated_data.get('quantity')
        
        try:
            position, trade = TradingService.close_position(
                position,
                price=close_price,
                quantity=close_quantity
            )
            return Response({
                'position': PositionSerializer(position).data,
                'trade': TradeSerializer(trade).data if trade else None
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# Trade History Endpoints
# ============================================

@api_view(['GET'])
def trades_list(request):
    """List user's trade history."""
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    trades = Trade.objects.filter(user=user)
    
    # Filter by symbol
    symbol = request.query_params.get('symbol')
    if symbol:
        trades = trades.filter(symbol=symbol.upper())
    
    serializer = TradeSerializer(trades[:100], many=True)
    return Response(serializer.data)


# ============================================
# Wallet Endpoints
# ============================================

@api_view(['GET'])
def wallet_detail(request):
    """Get user's wallet balance."""
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    wallet, created = MockWallet.objects.get_or_create(user=user)
    serializer = MockWalletSerializer(wallet)
    return Response(serializer.data)


@api_view(['POST'])
def wallet_reset(request):
    """Reset wallet to default balance (10,000 USDT)."""
    user = get_user_from_session(request)
    if not user:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    wallet, created = MockWallet.objects.get_or_create(user=user)
    wallet.balance = Decimal('10000.00000000')
    wallet.available_balance = Decimal('10000.00000000')
    wallet.save()
    
    # Close all positions and cancel all orders
    Position.objects.filter(user=user, is_open=True).update(
        is_open=False,
        closed_at=timezone.now()
    )
    Order.objects.filter(
        user=user,
        status__in=[Order.Status.PENDING, Order.Status.OPEN, Order.Status.PARTIALLY_FILLED]
    ).update(
        status=Order.Status.CANCELLED,
        cancelled_at=timezone.now()
    )
    
    serializer = MockWalletSerializer(wallet)
    return Response({
        'wallet': serializer.data,
        'message': 'Wallet reset to 10,000 USDT. All positions closed and orders cancelled.'
    })


# ============================================
# Market Data Proxy (Optional)
# ============================================

@api_view(['GET'])
def symbols_list(request):
    """
    Return list of available trading symbols.
    This is a static list for demo purposes.
    In production, this would be fetched from exchange API.
    """
    symbols = [
        {
            'symbol': 'BTCUSDT',
            'base': 'BTC',
            'quote': 'USDT',
            'pricePrecision': 2,
            'quantityPrecision': 3,
            'minQuantity': '0.001',
            'maxLeverage': 125,
        },
        {
            'symbol': 'ETHUSDT',
            'base': 'ETH',
            'quote': 'USDT',
            'pricePrecision': 2,
            'quantityPrecision': 3,
            'minQuantity': '0.001',
            'maxLeverage': 100,
        },
        {
            'symbol': 'BNBUSDT',
            'base': 'BNB',
            'quote': 'USDT',
            'pricePrecision': 2,
            'quantityPrecision': 2,
            'minQuantity': '0.01',
            'maxLeverage': 75,
        },
        {
            'symbol': 'SOLUSDT',
            'base': 'SOL',
            'quote': 'USDT',
            'pricePrecision': 3,
            'quantityPrecision': 1,
            'minQuantity': '0.1',
            'maxLeverage': 50,
        },
        {
            'symbol': 'XRPUSDT',
            'base': 'XRP',
            'quote': 'USDT',
            'pricePrecision': 4,
            'quantityPrecision': 1,
            'minQuantity': '1',
            'maxLeverage': 50,
        },
    ]
    return Response(symbols)
