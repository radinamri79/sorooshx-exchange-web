/**
 * Market data types
 */

export interface TickerData {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  markPrice?: string;
  indexPrice?: string;
  fundingRate?: string;
  nextFundingTime?: number;
  openInterest?: string;
}

/**
 * Binance 24hr Ticker (from WebSocket)
 */
export interface BinanceTicker {
  e?: string; // Event type
  E?: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w?: string; // Weighted average price
  c: string; // Last price (close)
  Q?: string; // Last quantity
  o?: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O?: number; // Statistics open time
  C?: number; // Statistics close time
  F?: number; // First trade ID
  L?: number; // Last trade Id
  n?: number; // Total number of trades
}

/**
 * REST API Ticker response
 */
export interface Ticker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface SymbolInfo {
  symbol: string;
  base: string;
  quote: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQuantity: string;
  maxLeverage: number;
  tickSize?: string;
  stepSize?: string;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Orderbook types
 */

export type OrderbookEntry = [string, string]; // [price, quantity]

export interface OrderbookData {
  lastUpdateId: number;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp?: number;
}

export interface OrderbookUpdate {
  eventType: string;
  eventTime: number;
  symbol: string;
  firstUpdateId: number;
  lastUpdateId: number;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
}

/**
 * Trade types
 */

export interface TradeData {
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  time: number;
  isBuyerMaker: boolean;
}

/**
 * Order types
 */

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market' | 'stop_limit' | 'stop_market';
export type OrderStatus = 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
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

/**
 * Position types
 */

export type PositionSide = 'long' | 'short';

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

/**
 * Wallet types
 */

export interface Wallet {
  id: string;
  balance: string;
  availableBalance: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * WebSocket message types
 */

export interface WSTickerMessage {
  e: '24hrTicker';
  E: number;
  s: string;
  p: string;
  P: string;
  c: string;
  h: string;
  l: string;
  v: string;
  q: string;
}

export interface WSDepthMessage {
  e: 'depthUpdate';
  E: number;
  T: number;
  s: string;
  U: number;
  u: number;
  pu: number;
  b: OrderbookEntry[];
  a: OrderbookEntry[];
}

export interface WSKlineMessage {
  e: 'kline';
  E: number;
  s: string;
  k: {
    t: number;
    T: number;
    s: string;
    i: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
    x: boolean;
    q: string;
  };
}

export interface WSTradeMessage {
  e: 'aggTrade';
  E: number;
  s: string;
  a: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
}

export interface WSMarkPriceMessage {
  e: 'markPriceUpdate';
  E: number;
  s: string;
  p: string;
  i: string;
  P: string;
  r: string;
  T: number;
}
