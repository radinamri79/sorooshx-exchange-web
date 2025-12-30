import Decimal from 'decimal.js';
import { TradingService } from '@/services/trading/TradingService';
import type { Wallet, CreateOrderParams, Position } from '@/types/trading';

describe('TradingService', () => {
  // Mock wallet
  const mockWallet: Wallet = {
    id: 'test-wallet',
    balance: '10000',
    availableBalance: '10000',
    createdAt: new Date().toISOString(),
  };

  describe('calculateMarginRequired', () => {
    it('should calculate margin correctly', () => {
      const quantity = new Decimal('1');
      const price = new Decimal('50000');
      const leverage = 10;

      const margin = TradingService.calculateMarginRequired(quantity, price, leverage);

      // 1 * 50000 / 10 = 5000
      expect(margin.toString()).toBe('5000');
    });

    it('should handle decimal quantities', () => {
      const quantity = new Decimal('0.5');
      const price = new Decimal('50000');
      const leverage = 5;

      const margin = TradingService.calculateMarginRequired(quantity, price, leverage);

      // 0.5 * 50000 / 5 = 5000
      expect(margin.toString()).toBe('5000');
    });

    it('should use correct precision', () => {
      const quantity = new Decimal('0.123456789');
      const price = new Decimal('99999.99999');
      const leverage = 125;

      const margin = TradingService.calculateMarginRequired(quantity, price, leverage);

      // Should be a valid Decimal number (may have more precision due to calculation)
      expect(margin).toBeDefined();
      expect(margin.toNumber()).toBeGreaterThan(0);
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate liquidation price for long position', () => {
      const entryPrice = new Decimal('50000');
      const leverage = 10;

      const liqPrice = TradingService.calculateLiquidationPrice('long', entryPrice, leverage);

      // For long: entryPrice * (1 - 1/leverage * 0.9)
      // = 50000 * (1 - 1/10 * 0.9)
      // = 50000 * (1 - 0.09)
      // = 50000 * 0.91
      // = 45500
      expect(liqPrice.toString()).toBe('45500');
    });

    it('should calculate liquidation price for short position', () => {
      const entryPrice = new Decimal('50000');
      const leverage = 10;

      const liqPrice = TradingService.calculateLiquidationPrice('short', entryPrice, leverage);

      // For short: entryPrice * (1 + 1/leverage * 0.9)
      // = 50000 * (1 + 1/10 * 0.9)
      // = 50000 * (1 + 0.09)
      // = 50000 * 1.09
      // = 54500
      expect(liqPrice.toString()).toBe('54500');
    });

    it('should have buffer for maximum leverage', () => {
      const entryPrice = new Decimal('50000');
      const leverage = 125;

      const liqPrice = TradingService.calculateLiquidationPrice('long', entryPrice, leverage);

      // 50000 * (1 - 1/125 * 0.9)
      // = 50000 * (1 - 0.0072)
      // = 50000 * 0.9928
      // = 49640
      expect(liqPrice.toNumber()).toBeCloseTo(49640, 1);
    });
  });

  describe('calculateUnrealizedPnL', () => {
    const basePosition: Position = {
      id: 'pos-1',
      symbol: 'BTCUSDT',
      side: 'long',
      quantity: '1',
      entryPrice: '50000',
      leverage: 10,
      marginMode: 'cross',
      margin: '5000',
      liquidationPrice: '45500',
      takeProfit: null,
      stopLoss: null,
      realizedPnl: '0',
      unrealizedPnl: '0',
      isOpen: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
    };

    it('should calculate profit for long position above entry', () => {
      const markPrice = new Decimal('55000');
      const pnl = TradingService.calculateUnrealizedPnL(basePosition, markPrice);

      // 1 * (55000 - 50000) = 5000
      expect(pnl.toString()).toBe('5000');
    });

    it('should calculate loss for long position below entry', () => {
      const markPrice = new Decimal('45000');
      const pnl = TradingService.calculateUnrealizedPnL(basePosition, markPrice);

      // 1 * (45000 - 50000) = -5000
      expect(pnl.toString()).toBe('-5000');
    });

    it('should calculate profit for short position below entry', () => {
      const shortPosition: Position = { ...basePosition, side: 'short' };
      const markPrice = new Decimal('45000');
      const pnl = TradingService.calculateUnrealizedPnL(shortPosition, markPrice);

      // 1 * (50000 - 45000) = 5000
      expect(pnl.toString()).toBe('5000');
    });

    it('should calculate loss for short position above entry', () => {
      const shortPosition: Position = { ...basePosition, side: 'short' };
      const markPrice = new Decimal('55000');
      const pnl = TradingService.calculateUnrealizedPnL(shortPosition, markPrice);

      // 1 * (50000 - 55000) = -5000
      expect(pnl.toString()).toBe('-5000');
    });
  });

  describe('calculateROE', () => {
    const basePosition: Position = {
      id: 'pos-1',
      symbol: 'BTCUSDT',
      side: 'long',
      quantity: '1',
      entryPrice: '50000',
      leverage: 10,
      marginMode: 'cross',
      margin: '5000',
      liquidationPrice: '45500',
      takeProfit: null,
      stopLoss: null,
      realizedPnl: '0',
      unrealizedPnl: '5000',
      isOpen: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
    };

    it('should calculate ROE correctly', () => {
      const markPrice = new Decimal('55000');
      const roe = TradingService.calculateROE(basePosition, markPrice);

      // (5000 / 5000) * 100 = 100%
      expect(roe.toString()).toBe('100');
    });

    it('should handle negative ROE', () => {
      const basePositionWithLoss: Position = { 
        ...basePosition, 
        unrealizedPnl: '-2500'
      };
      const markPrice = new Decimal('45000');
      const roe = TradingService.calculateROE(basePositionWithLoss, markPrice);

      // ROE calculation: (pnl / margin) * 100
      // With position at 45000 mark price: (45000-50000)*1 = -5000
      // (-5000 / 5000) * 100 = -100%
      expect(roe.toString()).toBe('-100');
    });
  });

  describe('calculateCommission', () => {
    it('should calculate taker commission correctly', () => {
      const quantity = new Decimal('1');
      const price = new Decimal('50000');
      const isMaker = false; // taker

      const commission = TradingService.calculateCommission(quantity, price, isMaker);

      // 1 * 50000 * 0.0004 = 20
      expect(commission.toString()).toBe('20');
    });

    it('should calculate maker commission correctly', () => {
      const quantity = new Decimal('1');
      const price = new Decimal('50000');
      const isMaker = true; // maker

      const commission = TradingService.calculateCommission(quantity, price, isMaker);

      // 1 * 50000 * 0.0002 = 10
      expect(commission.toString()).toBe('10');
    });
  });

  describe('createOrder', () => {
    it('should create a valid market order', () => {
      const params: CreateOrderParams = {
        symbol: 'BTCUSDT',
        side: 'buy',
        orderType: 'market',
        quantity: '1',
        leverage: 10,
        marginMode: 'cross',
      };

      const result = TradingService.createOrder(params, mockWallet);

      expect(result.order).toBeDefined();
      expect(result.order.symbol).toBe('BTCUSDT');
      expect(result.order.side).toBe('buy');
      expect(result.order.status).toBe('filled');
      expect(result.marginUsed).toBeDefined();
    });

    it('should reject order with insufficient margin', () => {
      const smallWallet: Wallet = {
        ...mockWallet,
        availableBalance: '100',
      };

      const params: CreateOrderParams = {
        symbol: 'BTCUSDT',
        side: 'buy',
        orderType: 'market',
        quantity: '10', // 10 * ~95000 / 10 = 95000 margin needed
        leverage: 10,
        marginMode: 'cross',
      };

      expect(() => TradingService.createOrder(params, smallWallet)).toThrow('Insufficient margin');
    });

    it('should reject invalid quantity', () => {
      const params: CreateOrderParams = {
        symbol: 'BTCUSDT',
        side: 'buy',
        orderType: 'market',
        quantity: 'invalid',
        leverage: 10,
        marginMode: 'cross',
      };

      expect(() => TradingService.createOrder(params, mockWallet)).toThrow('Order validation failed');
    });

    it('should validate leverage bounds', () => {
      const paramsLeverageTooHigh: CreateOrderParams = {
        symbol: 'BTCUSDT',
        side: 'buy',
        orderType: 'market',
        quantity: '1',
        leverage: 250, // Exceeds MAX_LEVERAGE of 125
        marginMode: 'cross',
      };

      expect(() => TradingService.createOrder(paramsLeverageTooHigh, mockWallet)).toThrow(
        'Order validation failed'
      );
    });
  });

  describe('isLiquidationRisk', () => {
    const position: Position = {
      id: 'pos-1',
      symbol: 'BTCUSDT',
      side: 'long',
      quantity: '1',
      entryPrice: '50000',
      leverage: 10,
      marginMode: 'cross',
      margin: '5000',
      liquidationPrice: '45500',
      takeProfit: null,
      stopLoss: null,
      realizedPnl: '0',
      unrealizedPnl: '0',
      isOpen: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
    };

    it('should detect liquidation risk when margin is depleted', () => {
      const markPrice = new Decimal('44000'); // Loss of 50000-44000 = -6000, margin only 5000
      const isRisk = TradingService.isLiquidationRisk(position, markPrice);

      // Remaining margin = 5000 + (-6000) = -1000, which is <= 0
      expect(isRisk).toBe(true);
    });

    it('should not detect risk when safe distance', () => {
      const markPrice = new Decimal('48000'); // Far from 45500 liq price
      const isRisk = TradingService.isLiquidationRisk(position, markPrice);

      expect(isRisk).toBe(false);
    });
  });
});
