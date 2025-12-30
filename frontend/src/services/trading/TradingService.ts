/**
 * TradingService - Core business logic for trading operations
 * Handles order creation, execution, position management, and calculations
 */

import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  Order,
  Position,
  Trade,
  Wallet,
  CreateOrderParams,
  PositionSide,
} from '@/types/trading';

export class TradingService {
  // Constants
  static readonly TAKER_FEE = new Decimal('0.0004'); // 0.04%
  static readonly MAKER_FEE = new Decimal('0.0002'); // 0.02%
  static readonly DEFAULT_BALANCE = new Decimal('10000'); // USDT
  static readonly MIN_LEVERAGE = 1;
  static readonly MAX_LEVERAGE = 125;
  static readonly LIQUIDATION_BUFFER = new Decimal('0.9'); // 90%

  /**
   * Generate a unique ID for orders, positions, trades
   */
  static generateId(): string {
    return uuidv4();
  }

  /**
   * Create a new order with validation
   */
  static createOrder(
    params: CreateOrderParams,
    wallet: Wallet
  ): { order: Order; marginUsed: Decimal; errors?: string[] } {
    const errors: string[] = [];

    // Validate symbol
    if (!params.symbol || params.symbol.trim() === '') {
      errors.push('Symbol is required');
    }

    // Validate side
    if (!['buy', 'sell'].includes(params.side)) {
      errors.push('Invalid order side');
    }

    // Validate leverage
    if (params.leverage < this.MIN_LEVERAGE || params.leverage > this.MAX_LEVERAGE) {
      errors.push(`Leverage must be between ${this.MIN_LEVERAGE}-${this.MAX_LEVERAGE}`);
    }

    // Validate margin mode
    if (!['cross', 'isolated'].includes(params.marginMode)) {
      errors.push('Invalid margin mode');
    }

    // Validate quantity
    let quantityDecimal: Decimal;
    try {
      quantityDecimal = new Decimal(params.quantity);
      if (!quantityDecimal.isPositive()) {
        errors.push('Quantity must be positive');
      }
      if (quantityDecimal.decimalPlaces() > 8) {
        errors.push('Quantity precision exceeds 8 decimals');
      }
    } catch {
      errors.push('Invalid quantity format');
      quantityDecimal = new Decimal(0); // Set default for later use
    }

    // For limit orders, price is required
    if (params.orderType === 'limit' && !params.price) {
      errors.push('Limit orders require a price');
    }

    // For stop orders, stop price is required
    if (['stop_limit', 'stop_market'].includes(params.orderType) && !params.stopPrice) {
      errors.push('Stop orders require a stop price');
    }

    if (errors.length > 0) {
      throw new Error(`Order validation failed: ${errors.join(', ')}`);
    }

    // Calculate margin required
    const executionPrice = params.price ? new Decimal(params.price) : new Decimal('95000'); // Mock price fallback
    const marginUsed = this.calculateMarginRequired(quantityDecimal, executionPrice, params.leverage);

    // Check available balance
    const availableBalance = new Decimal(wallet.availableBalance);
    if (marginUsed.greaterThan(availableBalance)) {
      throw new Error(
        `Insufficient margin. Required: ${marginUsed}, Available: ${availableBalance}`
      );
    }

    const now = new Date().toISOString();
    const order: Order = {
      id: this.generateId(),
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      orderType: params.orderType,
      status: params.orderType === 'market' ? 'filled' : 'open',
      price: params.price || null,
      stopPrice: params.stopPrice || null,
      quantity: quantityDecimal.toString(),
      filledQuantity: params.orderType === 'market' ? quantityDecimal.toString() : '0',
      leverage: params.leverage,
      marginMode: params.marginMode,
      marginUsed: marginUsed.toString(),
      averagePrice: params.orderType === 'market' ? executionPrice.toString() : null,
      commission: '0',
      createdAt: now,
      updatedAt: now,
      filledAt: params.orderType === 'market' ? now : null,
      cancelledAt: null,
    };

    return { order, marginUsed };
  }

  /**
   * Execute a pending order
   */
  static executeOrder(order: Order, executionPrice: Decimal): void {
    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.averagePrice = executionPrice.toString();
    order.filledAt = new Date().toISOString();

    // Calculate commission (taker fee)
    const commission = this.calculateCommission(new Decimal(order.quantity), executionPrice, false);
    order.commission = commission.toString();
  }

  /**
   * Create a new position from an executed order
   */
  static createPosition(order: Order, executionPrice: Decimal): Position {
    const quantity = new Decimal(order.filledQuantity || order.quantity);
    const notionalValue = quantity.times(executionPrice);
    const margin = notionalValue.dividedBy(order.leverage);
    const liquidationPrice = this.calculateLiquidationPrice(
      order.side === 'buy' ? 'long' : 'short',
      executionPrice,
      order.leverage
    );

    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      symbol: order.symbol,
      side: order.side === 'buy' ? 'long' : 'short',
      quantity: quantity.toString(),
      entryPrice: executionPrice.toString(),
      leverage: order.leverage,
      marginMode: order.marginMode,
      margin: margin.toString(),
      liquidationPrice: liquidationPrice.toString(),
      takeProfit: null,
      stopLoss: null,
      realizedPnl: '0',
      unrealizedPnl: '0',
      roe: '0',
      isOpen: true,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
  }

  /**
   * Add to existing position (increase quantity)
   */
  static addToPosition(position: Position, order: Order, executionPrice: Decimal): Position {
    const oldQuantity = new Decimal(position.quantity);
    const oldEntryPrice = new Decimal(position.entryPrice);
    const newQuantity = new Decimal(order.filledQuantity || order.quantity);

    // Calculate weighted average entry price
    const oldNotional = oldQuantity.times(oldEntryPrice);
    const newNotional = newQuantity.times(executionPrice);
    const totalNotional = oldNotional.plus(newNotional);
    const totalQuantity = oldQuantity.plus(newQuantity);
    const newEntryPrice = totalNotional.dividedBy(totalQuantity);

    // Recalculate margin
    const margin = totalNotional.dividedBy(position.leverage);
    const liquidationPrice = this.calculateLiquidationPrice(position.side, newEntryPrice, position.leverage);

    position.quantity = totalQuantity.toString();
    position.entryPrice = newEntryPrice.toString();
    position.margin = margin.toString();
    position.liquidationPrice = liquidationPrice.toString();
    position.updatedAt = new Date().toISOString();

    return position;
  }

  /**
   * Reduce or close a position
   */
  static reducePosition(
    position: Position,
    closePrice: Decimal,
    closeQuantity: Decimal
  ): { position: Position; pnl: Decimal; trade: Trade; releasedMargin: Decimal } {
    const positionQuantity = new Decimal(position.quantity);
    const positionEntry = new Decimal(position.entryPrice);

    // Calculate PnL
    let pnl: Decimal;
    if (position.side === 'long') {
      pnl = closePrice.minus(positionEntry).times(closeQuantity);
    } else {
      pnl = positionEntry.minus(closePrice).times(closeQuantity);
    }

    // Calculate commission
    const commission = this.calculateCommission(closeQuantity, closePrice, false);
    const netPnl = pnl.minus(commission);

    // Calculate released margin
    const closedNotional = closeQuantity.times(closePrice);
    const releasedMargin = closedNotional.dividedBy(position.leverage);

    // Update position
    const remainingQuantity = positionQuantity.minus(closeQuantity);

    if (remainingQuantity.equals(0)) {
      // Full close
      position.isOpen = false;
      position.closedAt = new Date().toISOString();
      position.quantity = '0';
    } else {
      // Partial close
      position.quantity = remainingQuantity.toString();
    }

    // Update realized PnL
    position.realizedPnl = new Decimal(position.realizedPnl || '0').plus(netPnl).toString();
    position.updatedAt = new Date().toISOString();

    // Create trade record
    const trade: Trade = {
      id: this.generateId(),
      positionId: position.id,
      symbol: position.symbol,
      side: position.side === 'long' ? 'sell' : 'buy', // Closing action
      price: closePrice.toString(),
      quantity: closeQuantity.toString(),
      commission: commission.toString(),
      realizedPnl: netPnl.toString(),
      executedAt: new Date().toISOString(),
    };

    return { position, pnl: netPnl, trade, releasedMargin };
  }

  /**
   * Cancel an order
   */
  static cancelOrder(order: Order): Order {
    if (!['pending', 'open', 'partially_filled'].includes(order.status)) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    return order;
  }

  /**
   * Calculate margin required for an order
   */
  static calculateMarginRequired(quantity: Decimal, price: Decimal, leverage: number): Decimal {
    const notionalValue = quantity.times(price);
    return notionalValue.dividedBy(leverage);
  }

  /**
   * Calculate liquidation price
   * LONG: liquidation = entry × (1 - (1/leverage) × 0.9)
   * SHORT: liquidation = entry × (1 + (1/leverage) × 0.9)
   */
  static calculateLiquidationPrice(side: PositionSide, entryPrice: Decimal, leverage: number): Decimal {
    const leverageFactor = new Decimal(1).dividedBy(leverage).times(this.LIQUIDATION_BUFFER);

    if (side === 'long') {
      return entryPrice.times(new Decimal(1).minus(leverageFactor));
    } else {
      return entryPrice.times(new Decimal(1).plus(leverageFactor));
    }
  }

  /**
   * Calculate unrealized P&L
   */
  static calculateUnrealizedPnL(position: Position, markPrice: Decimal): Decimal {
    const positionQuantity = new Decimal(position.quantity);
    const entryPrice = new Decimal(position.entryPrice);

    if (position.side === 'long') {
      return markPrice.minus(entryPrice).times(positionQuantity);
    } else {
      return entryPrice.minus(markPrice).times(positionQuantity);
    }
  }

  /**
   * Calculate ROE (Return on Equity)
   */
  static calculateROE(position: Position, markPrice: Decimal): Decimal {
    const unrealizedPnL = this.calculateUnrealizedPnL(position, markPrice);
    const margin = new Decimal(position.margin);

    if (margin.isZero()) {
      return new Decimal(0);
    }

    return unrealizedPnL.dividedBy(margin).times(100);
  }

  /**
   * Calculate commission
   */
  static calculateCommission(quantity: Decimal, price: Decimal, isMaker: boolean = false): Decimal {
    const notionalValue = quantity.times(price);
    const feeRate = isMaker ? this.MAKER_FEE : this.TAKER_FEE;
    return notionalValue.times(feeRate).toDecimalPlaces(8, Decimal.ROUND_DOWN);
  }

  /**
   * Check if position is at liquidation risk
   */
  static isLiquidationRisk(position: Position, markPrice: Decimal): boolean {
    const unrealizedPnL = this.calculateUnrealizedPnL(position, markPrice);
    const margin = new Decimal(position.margin);
    const remainingMargin = margin.plus(unrealizedPnL);
    return remainingMargin.lessThanOrEqualTo(0);
  }

  /**
   * Get liquidation risk level
   */
  static getLiquidationRiskLevel(position: Position, markPrice: Decimal): 'safe' | 'warning' | 'danger' {
    const unrealizedPnL = this.calculateUnrealizedPnL(position, markPrice);
    const margin = new Decimal(position.margin);
    const remainingMargin = margin.plus(unrealizedPnL);
    const riskPercent = remainingMargin.dividedBy(margin).times(100);

    if (riskPercent.lessThan(25)) return 'danger'; // <25% margin left
    if (riskPercent.lessThan(50)) return 'warning'; // <50% margin left
    return 'safe';
  }
}
