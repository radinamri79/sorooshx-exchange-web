from decimal import Decimal
from rest_framework import serializers
from .models import Order, Position, Trade, MockWallet


class MockWalletSerializer(serializers.ModelSerializer):
    """Serializer for MockWallet model."""
    
    class Meta:
        model = MockWallet
        fields = ['id', 'balance', 'available_balance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for Order model."""
    remaining_quantity = serializers.DecimalField(
        max_digits=20, decimal_places=8, read_only=True
    )
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'symbol', 'side', 'order_type', 'status',
            'price', 'stop_price', 'quantity', 'filled_quantity',
            'remaining_quantity', 'leverage', 'margin_mode', 'margin_used',
            'average_price', 'commission', 'is_active',
            'created_at', 'updated_at', 'filled_at', 'cancelled_at'
        ]
        read_only_fields = [
            'id', 'status', 'filled_quantity', 'margin_used',
            'average_price', 'commission', 'created_at', 'updated_at',
            'filled_at', 'cancelled_at'
        ]


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating new orders."""
    symbol = serializers.CharField(max_length=20)
    side = serializers.ChoiceField(choices=Order.Side.choices)
    order_type = serializers.ChoiceField(choices=Order.Type.choices)
    price = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False, allow_null=True
    )
    stop_price = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False, allow_null=True
    )
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8)
    leverage = serializers.IntegerField(min_value=1, max_value=125, default=10)
    margin_mode = serializers.ChoiceField(
        choices=Order.MarginMode.choices, default=Order.MarginMode.CROSS
    )
    
    def validate(self, data):
        """Validate order parameters."""
        order_type = data.get('order_type')
        price = data.get('price')
        stop_price = data.get('stop_price')
        
        # Limit orders require price
        if order_type == Order.Type.LIMIT and not price:
            raise serializers.ValidationError({
                'price': 'Price is required for limit orders.'
            })
        
        # Stop orders require stop price
        if order_type in [Order.Type.STOP_LIMIT, Order.Type.STOP_MARKET] and not stop_price:
            raise serializers.ValidationError({
                'stop_price': 'Stop price is required for stop orders.'
            })
        
        # Quantity must be positive
        if data['quantity'] <= 0:
            raise serializers.ValidationError({
                'quantity': 'Quantity must be greater than zero.'
            })
        
        return data


class PositionSerializer(serializers.ModelSerializer):
    """Serializer for Position model."""
    unrealized_pnl = serializers.SerializerMethodField()
    roe = serializers.SerializerMethodField()
    
    class Meta:
        model = Position
        fields = [
            'id', 'symbol', 'side', 'quantity', 'entry_price',
            'leverage', 'margin_mode', 'margin', 'liquidation_price',
            'take_profit', 'stop_loss', 'realized_pnl',
            'unrealized_pnl', 'roe', 'is_open',
            'created_at', 'updated_at', 'closed_at'
        ]
        read_only_fields = [
            'id', 'entry_price', 'margin', 'realized_pnl',
            'created_at', 'updated_at', 'closed_at'
        ]
    
    def get_unrealized_pnl(self, obj):
        """Calculate unrealized PnL using mark price from context."""
        mark_price = self.context.get('mark_price', obj.entry_price)
        return str(obj.calculate_unrealized_pnl(Decimal(str(mark_price))))
    
    def get_roe(self, obj):
        """Calculate ROE using mark price from context."""
        mark_price = self.context.get('mark_price', obj.entry_price)
        return str(obj.calculate_roe(Decimal(str(mark_price))))


class UpdatePositionSerializer(serializers.Serializer):
    """Serializer for updating position TP/SL."""
    take_profit = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False, allow_null=True
    )
    stop_loss = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False, allow_null=True
    )


class ClosePositionSerializer(serializers.Serializer):
    """Serializer for closing a position."""
    quantity = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False
    )
    price = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False
    )


class TradeSerializer(serializers.ModelSerializer):
    """Serializer for Trade model."""
    value = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    
    class Meta:
        model = Trade
        fields = [
            'id', 'symbol', 'side', 'price', 'quantity', 'value',
            'commission', 'commission_asset', 'realized_pnl', 'executed_at'
        ]
        read_only_fields = ['id', 'executed_at']
