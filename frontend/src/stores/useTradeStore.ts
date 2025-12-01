import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, Position, Wallet, CreateOrderParams, MarginMode } from '@/types';
import { generateId } from '@/lib/utils';

interface TradeState {
  // Orders
  orders: Order[];
  
  // Positions
  positions: Position[];
  
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
  
  closePosition: (positionId: string, quantity?: string) => Promise<void>;
  updatePositionTpSl: (positionId: string, tp: string | null, sl: string | null) => void;
  
  setDefaultLeverage: (leverage: number) => void;
  setDefaultMarginMode: (mode: MarginMode) => void;
  
  resetWallet: () => void;
  
  // Selectors
  getActiveOrders: (symbol?: string) => Order[];
  getOpenPositions: (symbol?: string) => Position[];
  getPositionBySymbol: (symbol: string) => Position | null;
}

const DEFAULT_WALLET: Wallet = {
  id: 'mock-wallet',
  balance: '10000.00000000',
  availableBalance: '10000.00000000',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      // Initial state
      orders: [],
      positions: [],
      wallet: DEFAULT_WALLET,
      defaultLeverage: 10,
      defaultMarginMode: 'cross',
      isSubmitting: false,

      // Create order (mock implementation)
      createOrder: async (params) => {
        set({ isSubmitting: true });

        try {
          const state = get();
          const { symbol, side, orderType, price, quantity, leverage, marginMode } = params;

          // Calculate margin required
          const executionPrice = price ? parseFloat(price) : 95000; // Mock price
          const qty = parseFloat(quantity);
          const notionalValue = qty * executionPrice;
          const marginRequired = notionalValue / leverage;

          // Check available balance
          const available = parseFloat(state.wallet.availableBalance);
          if (marginRequired > available) {
            throw new Error('Insufficient balance');
          }

          // Create order
          const order: Order = {
            id: generateId(),
            symbol,
            side,
            orderType,
            status: orderType === 'market' ? 'filled' : 'open',
            price: price || null,
            stopPrice: params.stopPrice || null,
            quantity,
            filledQuantity: orderType === 'market' ? quantity : '0',
            leverage,
            marginMode,
            marginUsed: marginRequired.toFixed(8),
            averagePrice: orderType === 'market' ? executionPrice.toFixed(2) : null,
            commission: (notionalValue * 0.0004).toFixed(8),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            filledAt: orderType === 'market' ? new Date().toISOString() : null,
            cancelledAt: null,
          };

          // Update wallet
          const newAvailable = available - marginRequired;
          const commission = notionalValue * 0.0004;

          // If market order, create/update position
          if (orderType === 'market') {
            const existingPosition = state.positions.find(
              (p) => p.symbol === symbol && p.isOpen
            );

            if (existingPosition) {
              // Update existing position
              const newPositions = state.positions.map((p) => {
                if (p.id !== existingPosition.id) return p;

                const isSameSide =
                  (existingPosition.side === 'long' && side === 'buy') ||
                  (existingPosition.side === 'short' && side === 'sell');

                if (isSameSide) {
                  // Add to position
                  const totalQty = parseFloat(p.quantity) + qty;
                  const totalValue =
                    parseFloat(p.entryPrice) * parseFloat(p.quantity) + executionPrice * qty;
                  const newEntry = totalValue / totalQty;

                  return {
                    ...p,
                    quantity: totalQty.toFixed(8),
                    entryPrice: newEntry.toFixed(2),
                    margin: (parseFloat(p.margin) + marginRequired).toFixed(8),
                    updatedAt: new Date().toISOString(),
                  };
                } else {
                  // Reduce position
                  const remainingQty = parseFloat(p.quantity) - qty;
                  if (remainingQty <= 0) {
                    return {
                      ...p,
                      isOpen: false,
                      closedAt: new Date().toISOString(),
                    };
                  }
                  return {
                    ...p,
                    quantity: remainingQty.toFixed(8),
                    updatedAt: new Date().toISOString(),
                  };
                }
              });

              set({
                orders: [...state.orders, order],
                positions: newPositions.filter((p) => p.isOpen),
                wallet: {
                  ...state.wallet,
                  availableBalance: (newAvailable - commission).toFixed(8),
                  balance: (parseFloat(state.wallet.balance) - commission).toFixed(8),
                  updatedAt: new Date().toISOString(),
                },
              });
            } else {
              // Create new position
              const positionSide = side === 'buy' ? 'long' : 'short';
              const liqPrice =
                positionSide === 'long'
                  ? executionPrice * (1 - (1 / leverage) * 0.9)
                  : executionPrice * (1 + (1 / leverage) * 0.9);

              const newPosition: Position = {
                id: generateId(),
                symbol,
                side: positionSide,
                quantity,
                entryPrice: executionPrice.toFixed(2),
                leverage,
                marginMode,
                margin: marginRequired.toFixed(8),
                liquidationPrice: liqPrice.toFixed(2),
                takeProfit: null,
                stopLoss: null,
                realizedPnl: '0',
                isOpen: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                closedAt: null,
              };

              set({
                orders: [...state.orders, order],
                positions: [...state.positions, newPosition],
                wallet: {
                  ...state.wallet,
                  availableBalance: (newAvailable - commission).toFixed(8),
                  balance: (parseFloat(state.wallet.balance) - commission).toFixed(8),
                  updatedAt: new Date().toISOString(),
                },
              });
            }
          } else {
            // Limit order - just reserve margin
            set({
              orders: [...state.orders, order],
              wallet: {
                ...state.wallet,
                availableBalance: newAvailable.toFixed(8),
                updatedAt: new Date().toISOString(),
              },
            });
          }

          return order;
        } finally {
          set({ isSubmitting: false });
        }
      },

      // Cancel order
      cancelOrder: async (orderId) => {
        const state = get();
        const order = state.orders.find((o) => o.id === orderId);

        if (!order || order.status !== 'open') {
          throw new Error('Order not found or cannot be cancelled');
        }

        // Return margin
        const marginUsed = parseFloat(order.marginUsed);
        const newAvailable = parseFloat(state.wallet.availableBalance) + marginUsed;

        set({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'cancelled' as const,
                  cancelledAt: new Date().toISOString(),
                }
              : o
          ),
          wallet: {
            ...state.wallet,
            availableBalance: newAvailable.toFixed(8),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      // Cancel all orders
      cancelAllOrders: async (symbol) => {
        const state = get();
        const ordersToCancel = state.orders.filter(
          (o) => o.status === 'open' && (!symbol || o.symbol === symbol)
        );

        const marginToReturn = ordersToCancel.reduce(
          (sum, o) => sum + parseFloat(o.marginUsed),
          0
        );

        const newAvailable = parseFloat(state.wallet.availableBalance) + marginToReturn;

        set({
          orders: state.orders.map((o) =>
            ordersToCancel.includes(o)
              ? {
                  ...o,
                  status: 'cancelled' as const,
                  cancelledAt: new Date().toISOString(),
                }
              : o
          ),
          wallet: {
            ...state.wallet,
            availableBalance: newAvailable.toFixed(8),
            updatedAt: new Date().toISOString(),
          },
        });

        return ordersToCancel.length;
      },

      // Close position
      closePosition: async (positionId, _quantity) => {
        const state = get();
        const position = state.positions.find((p) => p.id === positionId && p.isOpen);

        if (!position) {
          throw new Error('Position not found');
        }

        // Mock close at current price
        const closePrice = 95000; // Would come from ticker
        const qty = parseFloat(position.quantity);
        const entryPrice = parseFloat(position.entryPrice);
        const margin = parseFloat(position.margin);

        // Calculate PnL
        const pnl =
          position.side === 'long'
            ? (closePrice - entryPrice) * qty
            : (entryPrice - closePrice) * qty;

        const commission = closePrice * qty * 0.0004;
        const netPnl = pnl - commission;

        // Update wallet and close position
        const newBalance = parseFloat(state.wallet.balance) + margin + netPnl;
        const newAvailable = parseFloat(state.wallet.availableBalance) + margin + netPnl;

        set({
          positions: state.positions.map((p) =>
            p.id === positionId
              ? {
                  ...p,
                  isOpen: false,
                  realizedPnl: netPnl.toFixed(8),
                  closedAt: new Date().toISOString(),
                }
              : p
          ),
          wallet: {
            ...state.wallet,
            balance: newBalance.toFixed(8),
            availableBalance: newAvailable.toFixed(8),
            updatedAt: new Date().toISOString(),
          },
        });
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
      setDefaultLeverage: (defaultLeverage) => set({ defaultLeverage }),
      setDefaultMarginMode: (defaultMarginMode) => set({ defaultMarginMode }),

      // Reset wallet
      resetWallet: () => {
        set({
          wallet: DEFAULT_WALLET,
          positions: [],
          orders: get().orders.map((o) =>
            o.status === 'open'
              ? { ...o, status: 'cancelled' as const, cancelledAt: new Date().toISOString() }
              : o
          ),
        });
      },

      // Selectors
      getActiveOrders: (symbol) => {
        const state = get();
        return state.orders.filter(
          (o) => o.status === 'open' && (!symbol || o.symbol === symbol)
        );
      },

      getOpenPositions: (symbol) => {
        const state = get();
        return state.positions.filter(
          (p) => p.isOpen && (!symbol || p.symbol === symbol)
        );
      },

      getPositionBySymbol: (symbol) => {
        const state = get();
        return state.positions.find((p) => p.symbol === symbol && p.isOpen) || null;
      },
    }),
    {
      name: 'sorooshx-trade-store',
      partialize: (state) => ({
        orders: state.orders.slice(-100), // Keep last 100 orders
        positions: state.positions,
        wallet: state.wallet,
        defaultLeverage: state.defaultLeverage,
        defaultMarginMode: state.defaultMarginMode,
      }),
    }
  )
);
