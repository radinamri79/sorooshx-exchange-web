"""
Trading business logic services.
Handles order execution, position management, and wallet operations.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from .models import Order, Position, Trade, MockWallet


class TradingService:
    """Service class for trading operations."""
    
    # Trading fees (0.04% taker, 0.02% maker for futures)
    TAKER_FEE = Decimal('0.0004')
    MAKER_FEE = Decimal('0.0002')
    
    @classmethod
    @transaction.atomic
    def create_order(cls, user, data: dict) -> Order:
        """
        Create a new order and process it.
        For market orders, execute immediately.
        For limit orders, add to orderbook (simulated).
        """
        # Get or create wallet
        wallet, _ = MockWallet.objects.get_or_create(user=user)
        
        symbol = data['symbol'].upper()
        side = data['side']
        order_type = data['order_type']
        quantity = Decimal(str(data['quantity']))
        price = Decimal(str(data.get('price', 0))) if data.get('price') else None
        leverage = data.get('leverage', 10)
        margin_mode = data.get('margin_mode', Order.MarginMode.CROSS)
        
        # Calculate required margin
        # For market orders, use estimated price (would come from ticker in production)
        # For limit orders, use order price
        execution_price = price if price else Decimal('95000')  # Mock BTC price
        notional_value = quantity * execution_price
        required_margin = notional_value / leverage
        
        # Check available balance
        if wallet.available_balance < required_margin:
            raise ValueError(
                f'Insufficient margin. Required: {required_margin:.2f} USDT, '
                f'Available: {wallet.available_balance:.2f} USDT'
            )
        
        # Create order
        order = Order.objects.create(
            user=user,
            symbol=symbol,
            side=side,
            order_type=order_type,
            price=price,
            stop_price=data.get('stop_price'),
            quantity=quantity,
            leverage=leverage,
            margin_mode=margin_mode,
            margin_used=required_margin,
            status=Order.Status.PENDING
        )
        
        # Reserve margin
        wallet.available_balance -= required_margin
        wallet.save()
        
        # For market orders, execute immediately
        if order_type == Order.Type.MARKET:
            cls._execute_order(order, execution_price)
        else:
            # For limit orders, set to OPEN status
            # In production, this would be matched against orderbook
            order.status = Order.Status.OPEN
            order.save()
        
        return order
    
    @classmethod
    @transaction.atomic
    def _execute_order(cls, order: Order, execution_price: Decimal):
        """Execute an order at given price."""
        user = order.user
        wallet = user.wallet
        
        # Calculate commission
        notional_value = order.quantity * execution_price
        commission = notional_value * cls.TAKER_FEE
        
        # Update order
        order.status = Order.Status.FILLED
        order.filled_quantity = order.quantity
        order.average_price = execution_price
        order.commission = commission
        order.filled_at = timezone.now()
        order.save()
        
        # Handle position
        position_side = Position.Side.LONG if order.side == Order.Side.BUY else Position.Side.SHORT
        
        # Check for existing position
        existing_position = Position.objects.filter(
            user=user,
            symbol=order.symbol,
            is_open=True
        ).first()
        
        if existing_position:
            # Same side: add to position
            if (existing_position.side == Position.Side.LONG and order.side == Order.Side.BUY) or \
               (existing_position.side == Position.Side.SHORT and order.side == Order.Side.SELL):
                cls._add_to_position(existing_position, order, execution_price)
            else:
                # Opposite side: reduce/close position
                cls._reduce_position(existing_position, order, execution_price)
        else:
            # Create new position
            cls._create_position(order, execution_price, position_side)
        
        # Create trade record
        Trade.objects.create(
            user=user,
            order=order,
            position=existing_position,
            symbol=order.symbol,
            side=order.side,
            price=execution_price,
            quantity=order.quantity,
            commission=commission
        )
        
        # Deduct commission from wallet
        wallet.balance -= commission
        wallet.available_balance -= commission
        wallet.save()
    
    @classmethod
    def _create_position(cls, order: Order, execution_price: Decimal, side: str):
        """Create a new position from an order."""
        notional_value = order.quantity * execution_price
        margin = notional_value / order.leverage
        
        # Calculate liquidation price (simplified)
        if side == Position.Side.LONG:
            liquidation_price = execution_price * (1 - (1 / order.leverage) * Decimal('0.9'))
        else:
            liquidation_price = execution_price * (1 + (1 / order.leverage) * Decimal('0.9'))
        
        Position.objects.create(
            user=order.user,
            symbol=order.symbol,
            side=side,
            quantity=order.quantity,
            entry_price=execution_price,
            leverage=order.leverage,
            margin_mode=order.margin_mode,
            margin=margin,
            liquidation_price=liquidation_price
        )
    
    @classmethod
    def _add_to_position(cls, position: Position, order: Order, execution_price: Decimal):
        """Add to an existing position."""
        # Calculate new average entry price
        total_value = (position.entry_price * position.quantity) + (execution_price * order.quantity)
        new_quantity = position.quantity + order.quantity
        new_entry_price = total_value / new_quantity
        
        # Update position
        position.quantity = new_quantity
        position.entry_price = new_entry_price
        position.margin += order.margin_used
        
        # Recalculate liquidation price
        if position.side == Position.Side.LONG:
            position.liquidation_price = new_entry_price * (1 - (1 / position.leverage) * Decimal('0.9'))
        else:
            position.liquidation_price = new_entry_price * (1 + (1 / position.leverage) * Decimal('0.9'))
        
        position.save()
    
    @classmethod
    def _reduce_position(cls, position: Position, order: Order, execution_price: Decimal):
        """Reduce or close an existing position."""
        wallet = order.user.wallet
        
        # Calculate PnL
        if position.side == Position.Side.LONG:
            pnl = (execution_price - position.entry_price) * min(order.quantity, position.quantity)
        else:
            pnl = (position.entry_price - execution_price) * min(order.quantity, position.quantity)
        
        if order.quantity >= position.quantity:
            # Close entire position
            released_margin = position.margin
            position.realized_pnl += pnl
            position.is_open = False
            position.closed_at = timezone.now()
            position.save()
        else:
            # Partial close
            close_ratio = order.quantity / position.quantity
            released_margin = position.margin * close_ratio
            position.quantity -= order.quantity
            position.margin -= released_margin
            position.realized_pnl += pnl
            position.save()
        
        # Update wallet
        wallet.balance += pnl + released_margin
        wallet.available_balance += pnl + released_margin + order.margin_used  # Return reserved margin
        wallet.save()
    
    @classmethod
    @transaction.atomic
    def cancel_order(cls, order: Order) -> Order:
        """Cancel an order and release margin."""
        if not order.is_active:
            raise ValueError('Order cannot be cancelled')
        
        wallet = order.user.wallet
        
        # Release margin
        wallet.available_balance += order.margin_used
        wallet.save()
        
        # Update order status
        order.status = Order.Status.CANCELLED
        order.cancelled_at = timezone.now()
        order.save()
        
        return order
    
    @classmethod
    @transaction.atomic
    def cancel_all_orders(cls, user, symbol: str = None) -> int:
        """Cancel all active orders for a user."""
        orders = Order.objects.filter(
            user=user,
            status__in=[Order.Status.PENDING, Order.Status.OPEN, Order.Status.PARTIALLY_FILLED]
        )
        
        if symbol:
            orders = orders.filter(symbol=symbol.upper())
        
        cancelled_count = 0
        for order in orders:
            try:
                cls.cancel_order(order)
                cancelled_count += 1
            except ValueError:
                pass
        
        return cancelled_count
    
    @classmethod
    @transaction.atomic
    def close_position(cls, position: Position, price: Decimal = None, quantity: Decimal = None):
        """Close a position at market or specified price."""
        if not position.is_open:
            raise ValueError('Position is already closed')
        
        # Use mock price if not provided
        close_price = price or Decimal('95000')  # Mock price
        close_quantity = quantity or position.quantity
        
        if close_quantity > position.quantity:
            raise ValueError('Close quantity exceeds position size')
        
        wallet = position.user.wallet
        
        # Calculate PnL
        if position.side == Position.Side.LONG:
            pnl = (close_price - position.entry_price) * close_quantity
        else:
            pnl = (position.entry_price - close_price) * close_quantity
        
        # Calculate commission
        notional_value = close_quantity * close_price
        commission = notional_value * cls.TAKER_FEE
        
        # Create closing trade
        trade = Trade.objects.create(
            user=position.user,
            position=position,
            symbol=position.symbol,
            side=Trade.Side.SELL if position.side == Position.Side.LONG else Trade.Side.BUY,
            price=close_price,
            quantity=close_quantity,
            commission=commission,
            realized_pnl=pnl
        )
        
        if close_quantity >= position.quantity:
            # Close entire position
            released_margin = position.margin
            position.realized_pnl += pnl
            position.quantity = Decimal('0')
            position.is_open = False
            position.closed_at = timezone.now()
        else:
            # Partial close
            close_ratio = close_quantity / position.quantity
            released_margin = position.margin * close_ratio
            position.quantity -= close_quantity
            position.margin -= released_margin
            position.realized_pnl += pnl
        
        position.save()
        
        # Update wallet
        net_pnl = pnl - commission
        wallet.balance += net_pnl + released_margin
        wallet.available_balance += net_pnl + released_margin
        wallet.save()
        
        return position, trade
