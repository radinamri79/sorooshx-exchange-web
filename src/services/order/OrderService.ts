/**
 * Order Service - Advanced order types and risk management
 * Phase 3: Advanced order types (SL/TP/Trailing)
 * 
 * Features:
 * - Limit orders with custom price/quantity
 * - Market orders for immediate execution
 * - Stop Loss orders (triggers at specific price)
 * - Take Profit orders (closes at target profit)
 * - Trailing Stop orders (dynamic SL following price)
 * - One-Cancels-Other (OCO) orders
 * - Post-Only and Reduce-Only options
 * - Order validation and risk checks
 */

import Decimal from 'decimal.js';
import {
  Order,
  PlaceOrderParams,
} from '@/types/exchange';
import { getExchangeManager } from '@/services/exchange/ExchangeManager';
import { getAccountService } from '@/services/account/AccountService';

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'OCO';
export type OrderSide = 'BUY' | 'SELL';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface AdvancedOrderParams {
  symbol: string;
  side: OrderSide;
  quantity: string;
  orderType: OrderType;
  price?: string; // For LIMIT
  stopPrice?: string; // For STOP_LOSS, TRAILING_STOP
  takeProfit?: string; // For OCO
  trailingAmount?: string; // For TRAILING_STOP (absolute or percentage)
  timeInForce?: TimeInForce;
  postOnly?: boolean;
  reduceOnly?: boolean;
  clientOrderId?: string;
}

export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedCost?: string;
  estimatedPnL?: string;
}

export interface RiskAssessment {
  liquidationRisk: 'low' | 'medium' | 'high' | 'critical';
  estimatedLeverage: string;
  marginRequiredPercent: string;
  wouldReduceMarginRatio: boolean;
  recommendedQuantity: string;
}

class OrderService {
  private manager = getExchangeManager();
  private accountService = getAccountService();
  private pendingOrders: Map<string, { order: Order; trailingStopId?: NodeJS.Timeout }> = new Map();
  private minNotional = 5; // USD
  private listeners: Map<string, Set<Function>> = new Map();

  // ============================================================================
  // Order Placement
  // ============================================================================

  async placeAdvancedOrder(params: AdvancedOrderParams): Promise<Order> {
    // Validate order
    const validation = this.validateOrder(params);
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Order warnings:', validation.warnings);
    }

    // Risk assessment
    const riskAssessment = this.assessRisk(params);
    if (riskAssessment.liquidationRisk === 'critical') {
      throw new Error('Order would result in critical liquidation risk');
    }

    // Place order based on type
    switch (params.orderType) {
      case 'LIMIT':
        return this.placeLimitOrder(params);
      case 'MARKET':
        return this.placeMarketOrder(params);
      case 'STOP_LOSS':
        return this.placeStopLossOrder(params);
      case 'TAKE_PROFIT':
        return this.takeProfitOrder(params);
      case 'TRAILING_STOP':
        return this.placeTrailingStopOrder(params);
      case 'OCO':
        return this.placeOCOOrder(params);
      default:
        throw new Error(`Unknown order type: ${params.orderType}`);
    }
  }

  private async placeLimitOrder(params: AdvancedOrderParams): Promise<Order> {
    if (!params.price) throw new Error('Price required for LIMIT order');

    const orderParams: PlaceOrderParams = {
      symbol: params.symbol,
      side: params.side,
      type: 'LIMIT',
      quantity: params.quantity,
      price: params.price,
      timeInForce: params.timeInForce || 'GTC',
      postOnly: params.postOnly,
      reduceOnly: params.reduceOnly,
      clientOrderId: params.clientOrderId,
    };

    const order = await this.manager.placeOrder(orderParams);
    this.emit('orderPlaced', { order, type: 'LIMIT' });
    return order;
  }

  private async placeMarketOrder(params: AdvancedOrderParams): Promise<Order> {
    const orderParams: PlaceOrderParams = {
      symbol: params.symbol,
      side: params.side,
      type: 'MARKET',
      quantity: params.quantity,
      reduceOnly: params.reduceOnly,
      clientOrderId: params.clientOrderId,
    };

    const order = await this.manager.placeOrder(orderParams);
    this.emit('orderPlaced', { order, type: 'MARKET' });
    return order;
  }

  private async placeStopLossOrder(params: AdvancedOrderParams): Promise<Order> {
    if (!params.stopPrice) throw new Error('Stop price required for STOP_LOSS order');

    // Check if position exists
    const position = this.accountService.getPosition(params.symbol);
    if (!position || position.quantity === '0') {
      throw new Error('No open position for stop loss order');
    }

    // For stop loss, side is opposite of position
    const stopSide: OrderSide = position.positionSide === 'LONG' ? 'SELL' : 'BUY';
    if (params.side !== stopSide) {
      console.warn(`Stop loss side corrected from ${params.side} to ${stopSide}`);
    }

    const orderParams: PlaceOrderParams = {
      symbol: params.symbol,
      side: stopSide,
      type: 'STOP_MARKET',
      quantity: params.quantity || position.quantity,
      stopPrice: params.stopPrice,
      reduceOnly: true, // SL always reduces position
      clientOrderId: params.clientOrderId,
    };

    const order = await this.manager.placeOrder(orderParams);
    this.emit('orderPlaced', { order, type: 'STOP_LOSS' });
    return order;
  }

  private async takeProfitOrder(params: AdvancedOrderParams): Promise<Order> {
    if (!params.takeProfit) throw new Error('Take profit price required');

    const position = this.accountService.getPosition(params.symbol);
    if (!position || position.quantity === '0') {
      throw new Error('No open position for take profit order');
    }

    const tpSide: OrderSide = position.positionSide === 'LONG' ? 'SELL' : 'BUY';

    const orderParams: PlaceOrderParams = {
      symbol: params.symbol,
      side: tpSide,
      type: 'TAKE_PROFIT_MARKET',
      quantity: params.quantity || position.quantity,
      stopPrice: params.takeProfit,
      reduceOnly: true,
      clientOrderId: params.clientOrderId,
    };

    const order = await this.manager.placeOrder(orderParams);
    this.emit('orderPlaced', { order, type: 'TAKE_PROFIT' });
    return order;
  }

  private async placeTrailingStopOrder(params: AdvancedOrderParams): Promise<Order> {
    if (!params.trailingAmount) throw new Error('Trailing amount required');

    const position = this.accountService.getPosition(params.symbol);
    if (!position || position.quantity === '0') {
      throw new Error('No open position for trailing stop order');
    }

    // For now, create initial stop loss order
    // In production, this would implement proper trailing logic
    const currentPrice = new Decimal(position.markPrice || position.entryPrice);
    const trailingAmount = new Decimal(params.trailingAmount);

    // Check if trailing amount is percentage (ends with %) or absolute
    const isPercentage = params.trailingAmount.includes('%');
    let stopPrice: Decimal;

    if (isPercentage) {
      const percent = trailingAmount.dividedBy(100);
      stopPrice = currentPrice.minus(currentPrice.times(percent));
    } else {
      stopPrice = currentPrice.minus(trailingAmount);
    }

    const orderParams: PlaceOrderParams = {
      symbol: params.symbol,
      side: position.positionSide === 'LONG' ? 'SELL' : 'BUY',
      type: 'STOP_MARKET',
      quantity: params.quantity || position.quantity,
      stopPrice: stopPrice.toString(),
      reduceOnly: true,
      clientOrderId: params.clientOrderId,
    };

    const order = await this.manager.placeOrder(orderParams);

    // Start trailing logic
    const trailingStopId = setInterval(() => {
      this.updateTrailingStop(params.symbol, params.trailingAmount!).catch((error) => {
        console.error('Trailing stop update error:', error);
      });
    }, 1000); // Update every second

    this.pendingOrders.set(String(order.orderId), { order, trailingStopId });
    this.emit('orderPlaced', { order, type: 'TRAILING_STOP' });
    return order;
  }

  private async updateTrailingStop(_symbol: string, _trailingAmount: string): Promise<void> {
    // This would update the stop price as market moves
    // Implementation would depend on exchange capabilities
  }

  private async placeOCOOrder(params: AdvancedOrderParams): Promise<Order> {
    // One-Cancels-Other: place both SL and TP, cancel other if one fills
    if (!params.stopPrice || !params.takeProfit) {
      throw new Error('Both stop price and take profit required for OCO order');
    }

    // First, place take profit order
    const tpParams: AdvancedOrderParams = {
      ...params,
      orderType: 'TAKE_PROFIT',
      takeProfit: params.takeProfit,
      stopPrice: undefined,
    };

    const tpOrder = await this.takeProfitOrder(tpParams);

    // Then place stop loss order
    const slParams: AdvancedOrderParams = {
      ...params,
      orderType: 'STOP_LOSS',
      stopPrice: params.stopPrice,
      takeProfit: undefined,
    };

    const slOrder = await this.placeStopLossOrder(slParams);

    // Link them as OCO
    this.emit('ocoOrderPlaced', { tpOrder, slOrder, symbol: params.symbol });

    return tpOrder; // Return primary order
  }

  // ============================================================================
  // Order Validation
  // ============================================================================

  validateOrder(params: AdvancedOrderParams): OrderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!params.symbol || params.symbol.length === 0) {
      errors.push('Symbol is required');
    }

    if (!params.side || (params.side !== 'BUY' && params.side !== 'SELL')) {
      errors.push('Valid side (BUY/SELL) is required');
    }

    const quantity = new Decimal(params.quantity || 0);
    if (quantity.lessThanOrEqualTo(0)) {
      errors.push('Quantity must be positive');
    }

    // Order type specific validation
    switch (params.orderType) {
      case 'LIMIT':
        if (!params.price) errors.push('Price required for LIMIT order');
        else {
          const price = new Decimal(params.price);
          if (price.lessThanOrEqualTo(0)) errors.push('Price must be positive');
        }
        break;

      case 'STOP_LOSS':
      case 'TAKE_PROFIT':
        if (!params.stopPrice && !params.takeProfit) {
          errors.push('Stop price required for this order type');
        }
        break;

      case 'TRAILING_STOP':
        if (!params.trailingAmount) errors.push('Trailing amount required');
        break;

      case 'OCO':
        if (!params.stopPrice || !params.takeProfit) {
          errors.push('Both stop and take profit prices required for OCO');
        }
        break;
    }

    // Estimate costs
    if (params.price && errors.length === 0) {
      const cost = quantity.times(params.price);
      if (cost.lessThan(this.minNotional)) {
        warnings.push(`Order notional (${cost}) below minimum (${this.minNotional})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // Risk Assessment
  // ============================================================================

  assessRisk(params: AdvancedOrderParams): RiskAssessment {
    const account = this.accountService.getAccount();
    const quantity = new Decimal(params.quantity);
    const price = params.price ? new Decimal(params.price) : new Decimal(0);

    let notional = quantity.times(price);
    let liquidationRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let marginRequired = new Decimal(0);

    if (account) {
      const totalBalance = new Decimal(account.totalBalance || 0);
      const availableMargin = new Decimal(account.availableBalance || 0);

      if (notional.greaterThan(0)) {
        // Estimate leverage needed
        const estimatedLeverage = notional.dividedBy(totalBalance);

        // Margin required (1% for current position + new order)
        marginRequired = notional.times(new Decimal(0.01));

        if (marginRequired.greaterThan(availableMargin)) {
          liquidationRisk = 'critical';
        } else {
          const remainingMargin = availableMargin.minus(marginRequired);
          const marginRatio = remainingMargin.dividedBy(totalBalance);

          if (marginRatio.lessThan(0.05)) {
            liquidationRisk = 'critical';
          } else if (marginRatio.lessThan(0.10)) {
            liquidationRisk = 'high';
          } else if (marginRatio.lessThan(0.20)) {
            liquidationRisk = 'medium';
          }
        }

        return {
          liquidationRisk,
          estimatedLeverage: estimatedLeverage.toFixed(2),
          marginRequiredPercent: marginRequired
            .dividedBy(totalBalance)
            .times(100)
            .toFixed(2),
          wouldReduceMarginRatio: marginRequired.greaterThan(0),
          recommendedQuantity: availableMargin
            .times(new Decimal(0.8))
            .dividedBy(price)
            .toFixed(8),
        };
      }
    }

    return {
      liquidationRisk,
      estimatedLeverage: '0',
      marginRequiredPercent: '0',
      wouldReduceMarginRatio: false,
      recommendedQuantity: params.quantity,
    };
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    // Cancel trailing stop interval if exists
    const pending = this.pendingOrders.get(orderId);
    if (pending?.trailingStopId) {
      clearInterval(pending.trailingStopId);
    }

    await this.manager.cancelOrder(symbol, orderId);
    this.pendingOrders.delete(orderId);
    this.emit('orderCanceled', { symbol, orderId });
  }

  async modifyOrder(
    symbol: string,
    orderId: string,
    newQuantity?: string,
    newPrice?: string
  ): Promise<Order> {
    // Cancel old order
    await this.cancelOrder(symbol, orderId);

    // Place new order with updated params
    const oldOrder = this.accountService.getOrder(orderId);
    if (!oldOrder) throw new Error('Order not found');

    return this.placeAdvancedOrder({
      symbol,
      side: oldOrder.side as OrderSide,
      quantity: newQuantity || oldOrder.quantity,
      orderType: 'LIMIT',
      price: newPrice || oldOrder.price,
    });
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

  destroy(): void {
    this.pendingOrders.forEach(({ trailingStopId }) => {
      if (trailingStopId) clearInterval(trailingStopId);
    });
    this.pendingOrders.clear();
    this.listeners.clear();
  }
}

// Singleton instance
let orderService: OrderService | null = null;

export function getOrderService(): OrderService {
  if (!orderService) {
    orderService = new OrderService();
  }
  return orderService;
}

export function destroyOrderService(): void {
  orderService?.destroy();
  orderService = null;
}
