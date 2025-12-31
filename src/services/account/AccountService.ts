/**
 * Account Service - Handles account data, positions, and orders in real-time
 * Phase 2: Account & Position real-time tracking
 * 
 * Features:
 * - Real-time balance updates via WebSocket
 * - Live position monitoring with PnL calculations
 * - Order status tracking and fill notifications
 * - Margin & leverage management
 * - Risk metrics and liquidation warnings
 */

import Decimal from 'decimal.js';
import {
  Account,
  AccountBalance,
  Position,
  Order,
  AccountUpdateEvent,
  OrderUpdateEvent,
  ExchangeName,
} from '@/types/exchange';
import { getExchangeManager } from '@/services/exchange/ExchangeManager';

interface PositionMetrics {
  unrealizedPnL: string;
  unrealizedPnLPercent: string;
  liquidationPrice: string;
  marginRatio: string;
  maintenanceMarginRatio: string;
  riskLevel: 'safe' | 'caution' | 'danger' | 'critical';
}

export interface OrderNotification {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity: string;
  filledQuantity: string;
  price: string;
  status: string;
  timestamp: number;
  fills: Array<{
    price: string;
    quantity: string;
    fee: string;
    timestamp: number;
  }>;
}

interface AccountState {
  account: Account | null;
  balances: Map<string, AccountBalance>;
  positions: Map<string, Position>;
  orders: Map<string, Order>;
  positionMetrics: Map<string, PositionMetrics>;
  orderNotifications: OrderNotification[];
  subscriptions: Map<string, string>; // Store subscription IDs only
  loading: Map<string, boolean>;
  errors: Map<string, string>;
  lastUpdate: number;
  currentExchange: ExchangeName;
}

class AccountService {
  private manager = getExchangeManager();
  private state: AccountState = {
    account: null,
    balances: new Map(),
    positions: new Map(),
    orders: new Map(),
    positionMetrics: new Map(),
    orderNotifications: [],
    subscriptions: new Map(),
    loading: new Map(),
    errors: new Map(),
    lastUpdate: 0,
    currentExchange: 'binance',
  };

  private accountUpdateInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private notificationHistory: OrderNotification[] = [];
  private maxNotifications = 100;

  constructor() {
    this.setupExchangeListeners();
    this.startAccountPolling();
  }

  // ============================================================================
  // Initialization & Setup
  // ============================================================================

  private setupExchangeListeners(): void {
    this.manager.on?.('failover', (event: any) => {
      this.state.currentExchange = event.newExchange;
      this.emit('exchangeChanged', { exchange: this.state.currentExchange });
      // Re-subscribe to account updates with new exchange
      this.resubscribeToAccount();
    });

    this.manager.on?.('allExchangesDown', () => {
      this.emit('allExchangesDown', {});
    });
  }

  private startAccountPolling(): void {
    // Poll account data every 5 seconds for freshness
    this.accountUpdateInterval = setInterval(() => {
      this.loadAccount().catch((error) => {
        console.error('Account polling error:', error);
      });
    }, 5000);
  }

  // ============================================================================
  // Account Data Loading
  // ============================================================================

  async loadAccount(): Promise<Account> {
    const key = 'account';
    this.state.loading.set(key, true);

    try {
      const account = await this.manager.getAccount();
      this.state.account = account;
      this.state.lastUpdate = Date.now();

      // Update balances
      account.balances.forEach((balance) => {
        this.state.balances.set(balance.asset, balance);
      });

      // Update positions
      account.positions.forEach((position) => {
        this.state.positions.set(position.symbol, position);
        this.calculatePositionMetrics(position);
      });

      this.state.errors.delete(key);
      this.emit('accountUpdated', { account });
      return account;
    } catch (error) {
      const errorMsg = `Failed to load account: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  async loadPositions(): Promise<Position[]> {
    const key = 'positions';
    this.state.loading.set(key, true);

    try {
      const account = await this.manager.getAccount();
      const positions = account.positions;

      positions.forEach((position) => {
        this.state.positions.set(position.symbol, position);
        this.calculatePositionMetrics(position);
      });

      this.state.errors.delete(key);
      return positions;
    } catch (error) {
      const errorMsg = `Failed to load positions: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  async loadOrders(symbol?: string): Promise<Order[]> {
    const key = symbol ? `orders_${symbol}` : 'orders';
    this.state.loading.set(key, true);

    try {
      const orders = await this.manager.getOrders(symbol);

      orders.forEach((order) => {
        this.state.orders.set(String(order.orderId), order);
      });

      this.state.errors.delete(key);
      this.emit('ordersUpdated', { orders, symbol });
      return orders;
    } catch (error) {
      const errorMsg = `Failed to load orders: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  async loadOpenOrders(symbol?: string): Promise<Order[]> {
    return this.loadOrders(symbol);
  }

  // ============================================================================
  // Real-time Subscriptions
  // ============================================================================

  subscribeToAccountUpdates(callback: (data: Account) => void): string {
    const subscriptionId = `account_updates_${Date.now()}`;

    try {
      const unsub = this.manager.subscribeToAccount((event: AccountUpdateEvent) => {
        if (event.type === 'ACCOUNT_UPDATE') {
          // Update balances
          event.balances?.forEach((balance) => {
            this.state.balances.set(balance.asset, balance);
          });

          // Update positions
          event.positions?.forEach((position) => {
            this.state.positions.set(position.symbol, position);
            this.calculatePositionMetrics(position);
          });

          this.state.lastUpdate = Date.now();
          this.emit('accountUpdated', { account: this.state.account });

          if (this.state.account) {
            callback(this.state.account);
          }
        }
      });

      // Store subscription ID string
      this.state.subscriptions.set(subscriptionId, unsub);

      return subscriptionId;
    } catch (error) {
      console.error('Failed to subscribe to account updates:', error);
      throw error;
    }
  }

  subscribeToOrderUpdates(callback: (data: OrderNotification) => void): string {
    const subscriptionId = `order_updates_${Date.now()}`;

    try {
      const unsub = this.manager.subscribeToOrders((event: OrderUpdateEvent) => {
        if (event.type === 'ORDER_TRADE_UPDATE') {
          const notification: OrderNotification = {
            orderId: event.orderId,
            symbol: event.symbol,
            side: event.side,
            type: event.orderType,
            quantity: event.quantity,
            filledQuantity: event.filledQuantity,
            price: event.price,
            status: event.status,
            timestamp: event.timestamp,
            fills: event.fills || [],
          };

          // Store order
          const order: Order = {
            orderId: event.orderId,
            symbol: event.symbol,
            side: event.side,
            type: (event.orderType as 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET'),
            quantity: event.quantity,
            price: event.price,
            executedQuantity: event.filledQuantity,
            cumulativeQuoteQuantity: '0',
            status: (event.status as 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED'),
            updateTime: event.timestamp,
            createTime: event.timestamp,
          };
          this.state.orders.set(String(event.orderId), order);

          // Add notification
          this.addOrderNotification(notification);

          // Emit events based on status
          if (event.status === 'NEW') {
            this.emit('orderPlaced', notification);
          } else if (event.status === 'PARTIALLY_FILLED' || event.status === 'FILLED') {
            this.emit('orderFilled', notification);
          } else if (event.status === 'CANCELED' || event.status === 'EXPIRED') {
            this.emit('orderCanceled', notification);
          }

          callback(notification);
        }
      });

      this.state.subscriptions.set(subscriptionId, unsub);

      return subscriptionId;
    } catch (error) {
      console.error('Failed to subscribe to order updates:', error);
      throw error;
    }
  }

  private resubscribeToAccount(): void {
    // Unsubscribe all
    this.unsubscribeAll();
    // Re-subscribe
    this.loadAccount().catch(() => {
      // Silently handle
    });
  }

  // ============================================================================
  // Position Metrics & PnL Calculations
  // ============================================================================

  private calculatePositionMetrics(position: Position): void {
    const metrics: PositionMetrics = {
      unrealizedPnL: '0',
      unrealizedPnLPercent: '0',
      liquidationPrice: position.liquidationPrice,
      marginRatio: '0',
      maintenanceMarginRatio: '0',
      riskLevel: 'safe',
    };

    // Calculate unrealized PnL
    if (position.markPrice && position.entryPrice) {
      const markPx = new Decimal(position.markPrice);
      const entryPx = new Decimal(position.entryPrice);
      const quantity = new Decimal(position.quantity);

      let pnl: Decimal;
      if (position.positionSide === 'LONG') {
        pnl = markPx.minus(entryPx).times(quantity);
      } else {
        pnl = entryPx.minus(markPx).times(quantity);
      }

      metrics.unrealizedPnL = pnl.toString();

      // PnL percentage
      const notional = entryPx.times(quantity);
      if (notional.greaterThan(0)) {
        const pnlPercent = pnl.dividedBy(notional).times(100);
        metrics.unrealizedPnLPercent = pnlPercent.toFixed(2);
      }

      // Risk assessment
      const liquidPx = new Decimal(position.liquidationPrice);
      const distPercent = position.positionSide === 'LONG'
        ? markPx.minus(liquidPx).dividedBy(markPx).times(100)
        : liquidPx.minus(markPx).dividedBy(markPx).times(100);

      if (distPercent.lessThan(2)) {
        metrics.riskLevel = 'critical';
      } else if (distPercent.lessThan(5)) {
        metrics.riskLevel = 'danger';
      } else if (distPercent.lessThan(10)) {
        metrics.riskLevel = 'caution';
      } else {
        metrics.riskLevel = 'safe';
      }
    }

    this.state.positionMetrics.set(position.symbol, metrics);
    this.emit('positionMetricsUpdated', { symbol: position.symbol, metrics });
  }

  getPositionMetrics(symbol: string): PositionMetrics | undefined {
    return this.state.positionMetrics.get(symbol);
  }

  getRiskSummary(): {
    totalUnrealizedPnL: string;
    totalMarginUsed: string;
    marginAvailable: string;
    marginRatio: string;
    criticalPositions: string[];
  } {
    let totalPnL = new Decimal(0);
    let totalMarginUsed = new Decimal(0);
    const criticalPositions: string[] = [];

    this.state.positions.forEach((position) => {
      const metrics = this.state.positionMetrics.get(position.symbol);
      if (metrics) {
        totalPnL = totalPnL.plus(metrics.unrealizedPnL);
        if (metrics.riskLevel === 'critical' || metrics.riskLevel === 'danger') {
          criticalPositions.push(position.symbol);
        }
      }
      if (position.margin) {
        totalMarginUsed = totalMarginUsed.plus(position.margin);
      }
    });

    const marginAvailable = this.state.account
      ? new Decimal(this.state.account.availableBalance || 0)
      : new Decimal(0);

    const marginRatio = totalMarginUsed.greaterThan(0)
      ? totalMarginUsed.dividedBy(totalMarginUsed.plus(marginAvailable)).times(100).toFixed(2)
      : '0';

    return {
      totalUnrealizedPnL: totalPnL.toString(),
      totalMarginUsed: totalMarginUsed.toString(),
      marginAvailable: marginAvailable.toString(),
      marginRatio,
      criticalPositions,
    };
  }

  // ============================================================================
  // Order Notifications
  // ============================================================================

  private addOrderNotification(notification: OrderNotification): void {
    this.notificationHistory.push(notification);
    this.state.orderNotifications.push(notification);

    if (this.notificationHistory.length > this.maxNotifications) {
      this.notificationHistory.shift();
    }
    if (this.state.orderNotifications.length > 20) {
      this.state.orderNotifications.shift();
    }

    this.emit('notificationAdded', notification);
  }

  getOrderNotifications(): OrderNotification[] {
    return this.state.orderNotifications;
  }

  clearOrderNotifications(): void {
    this.state.orderNotifications = [];
    this.emit('notificationsCleared', {});
  }

  // ============================================================================
  // Getters & State
  // ============================================================================

  getAccount(): Account | null {
    return this.state.account;
  }

  getBalance(asset: string): AccountBalance | undefined {
    return this.state.balances.get(asset);
  }

  getAllBalances(): Map<string, AccountBalance> {
    return this.state.balances;
  }

  getPosition(symbol: string): Position | undefined {
    return this.state.positions.get(symbol);
  }

  getAllPositions(): Position[] {
    return Array.from(this.state.positions.values());
  }

  getOpenPositions(): Position[] {
    return Array.from(this.state.positions.values()).filter(
      (p) => p.quantity !== '0'
    );
  }

  getOrder(orderId: string): Order | undefined {
    return this.state.orders.get(orderId);
  }

  getAllOrders(): Order[] {
    return Array.from(this.state.orders.values());
  }

  getOpenOrders(): Order[] {
    return Array.from(this.state.orders.values()).filter(
      (o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED'
    );
  }

  isLoading(key?: string): boolean {
    if (key) return this.state.loading.get(key) || false;
    return this.state.loading.size > 0;
  }

  getError(key: string): string | undefined {
    return this.state.errors.get(key);
  }

  getLastUpdate(): number {
    return this.state.lastUpdate;
  }

  getCurrentExchange(): ExchangeName {
    return this.state.currentExchange;
  }

  getState(): AccountState {
    return this.state;
  }

  // ============================================================================
  // Event Emitter
  // ============================================================================

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  unsubscribe(subscriptionId: string): void {
    // ExchangeManager handles actual unsubscription internally
    this.state.subscriptions.delete(subscriptionId);
  }

  unsubscribeAll(): void {
    this.state.subscriptions.clear();
  }

  destroy(): void {
    this.unsubscribeAll();
    if (this.accountUpdateInterval) {
      clearInterval(this.accountUpdateInterval);
    }
    this.listeners.clear();
  }
}

// Singleton instance
let accountService: AccountService | null = null;

export function getAccountService(): AccountService {
  if (!accountService) {
    accountService = new AccountService();
  }
  return accountService;
}

export function destroyAccountService(): void {
  accountService?.destroy();
  accountService = null;
}
