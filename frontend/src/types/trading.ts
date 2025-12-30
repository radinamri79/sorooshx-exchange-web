/**
 * Trading Types - Core data models for the trading system
 */

export type OrderType = 'limit' | 'market' | 'stop_limit' | 'stop_market' | 'take_profit' | 'stop_loss';
export type OrderStatus = 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
export type OrderSide = 'buy' | 'sell';
export type PositionSide = 'long' | 'short';
export type MarginMode = 'cross' | 'isolated';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  status: OrderStatus;
  price: string | null;
  stopPrice: string | null;
  quantity: string;
  filledQuantity: string;
  leverage: number;
  marginMode: MarginMode;
  marginUsed: string;
  averagePrice: string | null;
  commission: string;
  createdAt: string;
  updatedAt: string;
  filledAt: string | null;
  cancelledAt: string | null;
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: string;
  entryPrice: string;
  leverage: number;
  marginMode: MarginMode;
  margin: string;
  liquidationPrice: string | null;
  takeProfit: string | null;
  stopLoss: string | null;
  realizedPnl: string;
  unrealizedPnl?: string;
  roe?: string;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface Trade {
  id: string;
  orderId?: string;
  positionId?: string;
  symbol: string;
  side: OrderSide;
  price: string;
  quantity: string;
  commission: string;
  realizedPnl: string;
  executedAt: string;
}

export interface Wallet {
  id: string;
  balance: string;
  availableBalance: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  price?: string;
  stopPrice?: string;
  quantity: string;
  leverage: number;
  marginMode: MarginMode;
}

export interface ClosePositionParams {
  positionId: string;
  price?: string;
  quantity?: string;
}

export interface UpdatePositionParams {
  positionId: string;
  takeProfit?: string | null;
  stopLoss?: string | null;
}
