"""
Trading models for SorooshX Exchange.
Includes Order, Position, Trade, and Wallet models.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class MockWallet(models.Model):
    """
    Mock wallet for demo trading.
    Each user has one wallet with USDT balance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallet'
    )
    
    # Balance in USDT
    balance = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal('10000.00000000')  # Start with 10,000 USDT
    )
    available_balance = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal('10000.00000000')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mock_wallets'
        verbose_name = 'Mock Wallet'
        verbose_name_plural = 'Mock Wallets'

    def __str__(self):
        return f'{self.user} - {self.balance} USDT'


class Order(models.Model):
    """
    Trading order model.
    Supports limit and market orders for futures trading.
    """
    class Side(models.TextChoices):
        BUY = 'buy', 'Buy/Long'
        SELL = 'sell', 'Sell/Short'
    
    class Type(models.TextChoices):
        LIMIT = 'limit', 'Limit'
        MARKET = 'market', 'Market'
        STOP_LIMIT = 'stop_limit', 'Stop Limit'
        STOP_MARKET = 'stop_market', 'Stop Market'
        TAKE_PROFIT = 'take_profit', 'Take Profit'
        STOP_LOSS = 'stop_loss', 'Stop Loss'
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        OPEN = 'open', 'Open'
        PARTIALLY_FILLED = 'partially_filled', 'Partially Filled'
        FILLED = 'filled', 'Filled'
        CANCELLED = 'cancelled', 'Cancelled'
        REJECTED = 'rejected', 'Rejected'
    
    class MarginMode(models.TextChoices):
        CROSS = 'cross', 'Cross'
        ISOLATED = 'isolated', 'Isolated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    
    # Order details
    symbol = models.CharField(max_length=20, db_index=True)  # e.g., BTCUSDT
    side = models.CharField(max_length=10, choices=Side.choices)
    order_type = models.CharField(max_length=20, choices=Type.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Pricing
    price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    stop_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    filled_quantity = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0'))
    
    # Leverage & Margin
    leverage = models.PositiveSmallIntegerField(default=10)
    margin_mode = models.CharField(max_length=10, choices=MarginMode.choices, default=MarginMode.CROSS)
    margin_used = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0'))
    
    # Execution
    average_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    commission = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0'))
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    filled_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'symbol', 'status']),
            models.Index(fields=['symbol', 'status']),
        ]

    def __str__(self):
        return f'{self.side.upper()} {self.quantity} {self.symbol} @ {self.price or "MARKET"}'

    @property
    def remaining_quantity(self):
        return self.quantity - self.filled_quantity

    @property
    def is_active(self):
        return self.status in [self.Status.PENDING, self.Status.OPEN, self.Status.PARTIALLY_FILLED]


class Position(models.Model):
    """
    Open position model.
    Tracks user's current futures positions.
    """
    class Side(models.TextChoices):
        LONG = 'long', 'Long'
        SHORT = 'short', 'Short'
    
    class MarginMode(models.TextChoices):
        CROSS = 'cross', 'Cross'
        ISOLATED = 'isolated', 'Isolated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='positions'
    )
    
    # Position details
    symbol = models.CharField(max_length=20, db_index=True)
    side = models.CharField(max_length=10, choices=Side.choices)
    
    # Size & Entry
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    entry_price = models.DecimalField(max_digits=20, decimal_places=8)
    
    # Leverage & Margin
    leverage = models.PositiveSmallIntegerField(default=10)
    margin_mode = models.CharField(max_length=10, choices=MarginMode.choices, default=MarginMode.CROSS)
    margin = models.DecimalField(max_digits=20, decimal_places=8)
    
    # Liquidation
    liquidation_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    
    # TP/SL
    take_profit = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    stop_loss = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    
    # P&L tracking
    realized_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0'))
    
    # Status
    is_open = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'positions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'symbol', 'is_open']),
        ]
        # One open position per symbol per side per user
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'symbol', 'side'],
                condition=models.Q(is_open=True),
                name='unique_open_position'
            )
        ]

    def __str__(self):
        status = 'OPEN' if self.is_open else 'CLOSED'
        return f'{self.side.upper()} {self.quantity} {self.symbol} @ {self.entry_price} ({status})'

    def calculate_unrealized_pnl(self, mark_price: Decimal) -> Decimal:
        """Calculate unrealized PnL based on mark price."""
        if self.side == self.Side.LONG:
            return (mark_price - self.entry_price) * self.quantity
        else:
            return (self.entry_price - mark_price) * self.quantity

    def calculate_roe(self, mark_price: Decimal) -> Decimal:
        """Calculate Return on Equity (ROE) percentage."""
        if self.margin == 0:
            return Decimal('0')
        unrealized_pnl = self.calculate_unrealized_pnl(mark_price)
        return (unrealized_pnl / self.margin) * 100


class Trade(models.Model):
    """
    Executed trade model.
    Records all filled trades for history.
    """
    class Side(models.TextChoices):
        BUY = 'buy', 'Buy'
        SELL = 'sell', 'Sell'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trades'
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        related_name='trades'
    )
    position = models.ForeignKey(
        Position,
        on_delete=models.SET_NULL,
        null=True,
        related_name='trades'
    )
    
    # Trade details
    symbol = models.CharField(max_length=20, db_index=True)
    side = models.CharField(max_length=10, choices=Side.choices)
    price = models.DecimalField(max_digits=20, decimal_places=8)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    
    # Fees
    commission = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0'))
    commission_asset = models.CharField(max_length=10, default='USDT')
    
    # P&L (for closing trades)
    realized_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0'))
    
    # Timestamps
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'trades'
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['user', 'symbol']),
            models.Index(fields=['executed_at']),
        ]

    def __str__(self):
        return f'{self.side.upper()} {self.quantity} {self.symbol} @ {self.price}'

    @property
    def value(self) -> Decimal:
        """Total trade value in quote currency."""
        return self.price * self.quantity
