'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Decimal from 'decimal.js';
import { TradingService } from '@/services/trading/TradingService';
import type { Order, Position, Wallet, Trade, CreateOrderParams, MarginMode } from '@/types/trading';

interface TradeState {
  // Orders
  orders: Order[];

  // Positions
  positions: Position[];

  // Trades (execution history)
  trades: Trade[];

  // Wallet
  wallet: Wallet;

  // Settings
  defaultLeverage: number;
  defaultMarginMode: MarginMode;

  // Loading states
  isSubmitting: boolean;

  // Actions
  createOrder: (params: CreateOrderParams) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<void>;
  cancelAllOrders: (symbol?: string) => Promise<number>;

  closePosition: (positionId: string, quantity?: string, price?: string) => Promise<void>;
  updatePositionTpSl: (positionId: string, tp: string | null, sl: string | null) => void;

  setDefaultLeverage: (leverage: number) => void;
  setDefaultMarginMode: (mode: MarginMode) => void;

  resetWallet: () => void;

  // Selectors
  getActiveOrders: (symbol?: string) => Order[];
  getOpenPositions: (symbol?: string) => Position[];
  getPositionBySymbol: (symbol: string) => Position | null;
  getTotalMarginUsed: () => Decimal;
}

const DEFAULT_WALLET: Wallet = {
  id: TradingService.generateId(),
  balance: TradingService.DEFAULT_BALANCE.toString(),
  availableBalance: TradingService.DEFAULT_BALANCE.toString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      // Initial state
      orders: [],
      positions: [],
      trades: [],
      wallet: DEFAULT_WALLET,
      defaultLeverage: 10,
      defaultMarginMode: 'cross',
      isSubmitting: false,

      // Create order
      createOrder: async (params) => {
        set({ isSubmitting: true });

        try {
          const state = get();

          // Use TradingService to create order
          const { order, marginUsed } = TradingService.createOrder(params, state.wallet);

          // If market order, execute immediately
          if (params.orderType === 'market') {
            const executionPrice = new Decimal(params.price || '95000');
            TradingService.executeOrder(order, executionPrice);

            // Create or update position
            let position: Position | undefined = state.positions.find(
              (p) => p.symbol === params.symbol && p.isOpen
            );

            const newWallet = { ...state.wallet };

            if (!position) {
              // Create new position
              position = TradingService.createPosition(order, executionPrice);
            } else {
              // Add to existing position
              const positionSide = params.side === 'buy' ? 'long' : 'short';
              if (
                (position.side === 'long' && positionSide === 'long') ||
                (position.side === 'short' && positionSide === 'short')
              ) {
                // Same side - add to position
                position = TradingService.addToPosition(position, order, executionPrice);
              } else {
                // Opposite side - reduce position
                const quantity = new Decimal(order.filledQuantity || order.quantity);
                const { position: updated, trade, releasedMargin } = TradingService.reducePosition(
                  position,
                  executionPrice,
                  quantity
                );
                position = updated;

                // Add trade record
                set((s) => ({
                  trades: [...s.trades, trade],
                }));

                // Update wallet with released margin
                newWallet.balance = new Decimal(newWallet.balance)
                  .plus(releasedMargin)
                  .toString();
                newWallet.availableBalance = newWallet.balance;
              }
            }

            // Deduct commission from wallet
            const commission = new Decimal(order.commission);
            newWallet.balance = new Decimal(newWallet.balance).minus(commission).toString();
            newWallet.availableBalance = new Decimal(newWallet.availableBalance)
              .minus(marginUsed)
              .minus(commission)
              .toString();
            newWallet.updatedAt = new Date().toISOString();

            // Update state
            set((s) => ({
              orders: [...s.orders, order],
              positions: position
                ? s.positions
                    .filter((p) => p.id !== position.id)
                    .concat(position.isOpen ? [position] : [])
                : s.positions,
              wallet: newWallet,
            }));
          } else {
            // Limit order - just reserve margin
            const newWallet = { ...state.wallet };
            newWallet.availableBalance = new Decimal(newWallet.availableBalance)
              .minus(marginUsed)
              .toString();
            newWallet.updatedAt = new Date().toISOString();

            set((s) => ({
              orders: [...s.orders, order],
              wallet: newWallet,
            }));
          }

          return order;
        } catch (error) {
          console.error('Failed to create order:', error);
          throw error;
        } finally {
          set({ isSubmitting: false });
        }
      },

      // Cancel order
      cancelOrder: async (orderId) => {
        const state = get();
        const order = state.orders.find((o) => o.id === orderId);

        if (!order || !['pending', 'open', 'partially_filled'].includes(order.status)) {
          throw new Error('Order not found or cannot be cancelled');
        }

        // Cancel using TradingService
        TradingService.cancelOrder(order);

        // Return margin to wallet
        const marginUsed = new Decimal(order.marginUsed);
        const newWallet = { ...state.wallet };
        newWallet.availableBalance = new Decimal(newWallet.availableBalance)
          .plus(marginUsed)
          .toString();
        newWallet.updatedAt = new Date().toISOString();

        set({
          orders: state.orders.map((o) => (o.id === orderId ? order : o)),
          wallet: newWallet,
        });
      },

      // Cancel all orders
      cancelAllOrders: async (symbol) => {
        const state = get();
        const ordersToCancel = state.orders.filter(
          (o) => ['pending', 'open', 'partially_filled'].includes(o.status) && (!symbol || o.symbol === symbol)
        );

        let totalMarginToReturn = new Decimal(0);
        const updatedOrders = state.orders.map((o) => {
          if (ordersToCancel.includes(o)) {
            TradingService.cancelOrder(o);
            totalMarginToReturn = totalMarginToReturn.plus(o.marginUsed);
          }
          return o;
        });

        // Update wallet
        const newWallet = { ...state.wallet };
        newWallet.availableBalance = new Decimal(newWallet.availableBalance)
          .plus(totalMarginToReturn)
          .toString();
        newWallet.updatedAt = new Date().toISOString();

        set({
          orders: updatedOrders,
          wallet: newWallet,
        });

        return ordersToCancel.length;
      },

      // Close position
      closePosition: async (positionId, quantity, price) => {
        const state = get();
        const position = state.positions.find((p) => p.id === positionId && p.isOpen);

        if (!position) {
          throw new Error('Position not found');
        }

        // Determine close quantity
        const closeQuantity = quantity
          ? new Decimal(quantity)
          : new Decimal(position.quantity);
        const closePrice = price ? new Decimal(price) : new Decimal('95000'); // Mock price

        // Close position using TradingService
        const { position: updated, trade, pnl, releasedMargin } = TradingService.reducePosition(
          position,
          closePrice,
          closeQuantity
        );

        // Update wallet
        const newWallet = { ...state.wallet };
        newWallet.balance = new Decimal(newWallet.balance)
          .plus(pnl)
          .plus(releasedMargin)
          .toString();
        newWallet.availableBalance = new Decimal(newWallet.availableBalance)
          .plus(pnl)
          .plus(releasedMargin)
          .toString();
        newWallet.updatedAt = new Date().toISOString();

        set((s) => ({
          positions: s.positions
            .filter((p) => p.id !== positionId)
            .concat(updated.isOpen ? [updated] : []),
          trades: [...s.trades, trade],
          wallet: newWallet,
        }));
      },

      // Update TP/SL
      updatePositionTpSl: (positionId, tp, sl) => {
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === positionId
              ? {
                  ...p,
                  takeProfit: tp,
                  stopLoss: sl,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      // Settings
      setDefaultLeverage: (leverage) => set({ defaultLeverage: leverage }),
      setDefaultMarginMode: (marginMode) => set({ defaultMarginMode: marginMode }),

      // Reset wallet
      resetWallet: () => {
        const newWallet = { ...DEFAULT_WALLET, id: TradingService.generateId() };
        set({
          wallet: newWallet,
          positions: [],
          orders: get().orders.map((o) =>
            ['pending', 'open', 'partially_filled'].includes(o.status)
              ? TradingService.cancelOrder({ ...o })
              : o
          ),
        });
      },

      // Selectors
      getActiveOrders: (symbol) => {
        const state = get();
        return state.orders.filter(
          (o) => ['pending', 'open', 'partially_filled'].includes(o.status) && (!symbol || o.symbol === symbol)
        );
      },

      getOpenPositions: (symbol) => {
        const state = get();
        return state.positions.filter((p) => p.isOpen && (!symbol || p.symbol === symbol));
      },

      getPositionBySymbol: (symbol) => {
        const state = get();
        return state.positions.find((p) => p.symbol === symbol && p.isOpen) || null;
      },

      getTotalMarginUsed: () => {
        const state = get();
        return state.positions.reduce((sum, p) => sum.plus(p.margin), new Decimal(0));
      },
    }),
    {
      name: 'sorooshx-trade-store',
      partialize: (state) => ({
        orders: state.orders.slice(-100), // Keep last 100 orders
        positions: state.positions,
        trades: state.trades.slice(-100), // Keep last 100 trades
        wallet: state.wallet,
        defaultLeverage: state.defaultLeverage,
        defaultMarginMode: state.defaultMarginMode,
      }),
    }
  )
);
