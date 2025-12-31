/**
 * Exchange types and interfaces for multi-exchange support
 * Supports: Binance, Bybit, OKX, Gate.io, Bitget
 */

// ============================================================================
// Exchange Definitions
// ============================================================================

export type ExchangeName = 'binance' | 'bybit' | 'okx' | 'gateio' | 'bitget';

export enum ExchangeTier {
  PRIMARY = 'primary',      // Binance (best real-time data)
  FALLBACK_1 = 'fallback_1', // Bybit (near-equivalent capabilities)
  FALLBACK_2 = 'fallback_2', // OKX (comprehensive data, institutional)
  FALLBACK_3 = 'fallback_3', // Gate.io (good all-around)
  FALLBACK_4 = 'fallback_4', // Bitget (account trading, secondary)
}

export const EXCHANGE_RANKING: Record<ExchangeName, ExchangeTier> = {
  binance: ExchangeTier.PRIMARY,
  bybit: ExchangeTier.FALLBACK_1,
  okx: ExchangeTier.FALLBACK_2,
  gateio: ExchangeTier.FALLBACK_3,
  bitget: ExchangeTier.FALLBACK_4,
};

// ============================================================================
// Market Data Types (Normalized)
// ============================================================================

export interface KlineData {
  symbol: string;
  timestamp: number;      // Open time in ms
  open: string;          // Use Decimal for precision
  high: string;
  low: string;
  close: string;
  volume: string;        // Base asset volume
  quoteVolume: string;   // Quote asset volume (USDT)
  trades: number;        // Number of trades
  buyBaseVolume: string;
  buyQuoteVolume: string;
  isFinal: boolean;      // Candle finalized (not just preview)
}

export interface DepthLevel {
  price: string;
  quantity: string;
}

export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: DepthLevel[];    // Sorted descending
  asks: DepthLevel[];    // Sorted ascending
  lastUpdateId: number;  // For tracking updates
}

export interface TickerData {
  symbol: string;
  lastPrice: string;
  priceChange: string;   // 24h change in USDT
  priceChangePercent: string; // 24h change %
  highPrice: string;     // 24h high
  lowPrice: string;      // 24h low
  quoteVolume: string;   // 24h quote asset volume
  baseVolume: string;    // 24h base asset volume
  bidPrice: string;      // Best bid
  bidQuantity: string;
  askPrice: string;      // Best ask
  askQuantity: string;
  timestamp: number;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: string;   // Annual percentage
  fundingTime: number;   // Next settlement time in ms
  markPrice: string;
  indexPrice: string;
}

export interface MarkPriceData {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  timestamp: number;
  estimatedSettlePrice?: string;
}

export interface TradeData {
  symbol: string;
  tradeId: string;
  price: string;
  quantity: string;
  quoteQuantity: string;
  time: number;
  isBuyerMaker: boolean; // true = sell side initiated
}

// ============================================================================
// Account & Position Types (Normalized)
// ============================================================================

export interface AccountBalance {
  asset: string;
  balance: string;
  availableBalance: string;
  locked: string;
  freezed?: string;
}

export interface Account {
  totalBalance: string;
  totalUnrealizedProfit: string;
  totalMarginUsed: string;
  totalCollateral: string;
  availableBalance: string;
  balances: AccountBalance[];
  positions: Position[];
  timestamp: number;
  updateTime: number;
}

export interface Position {
  symbol: string;
  positionSide: 'LONG' | 'SHORT';
  quantity: string;        // Base asset quantity
  entryPrice: string;
  markPrice: string;
  liquidationPrice: string;
  unrealizedProfit: string;
  margin: string;           // Position margin
  marginType: 'cross' | 'isolated';
  leverage: number;
  riskRate: string;         // Margin ratio percentage
  isolatedCreated?: boolean;
  updateTime: number;
}

export interface Order {
  orderId: string | number;
  clientOrderId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
  quantity: string;
  price: string;
  stopPrice?: string;
  executedQuantity: string;
  cumulativeQuoteQuantity: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  commission?: string;
  commissionAsset?: string;
  updateTime: number;
  createTime: number;
  avgPrice?: string;
}

export interface Trade {
  symbol: string;
  tradeId: string | number;
  orderId: string | number;
  side: 'BUY' | 'SELL';
  price: string;
  quantity: string;
  commission: string;
  commissionAsset: string;
  time: number;
  positionSide?: 'LONG' | 'SHORT';
  realizedPnl?: string;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface WebSocketEvent {
  type: 'kline' | 'depth' | 'ticker' | 'trade' | 'account' | 'order' | 'position' | 'funding' | 'markPrice';
  exchange: ExchangeName;
  data: any;
  timestamp: number;
}

export interface AccountUpdateEvent {
  type: 'ACCOUNT_UPDATE';
  balances?: AccountBalance[];
  positions?: Position[];
  timestamp: number;
}

export interface OrderUpdateEvent {
  type: 'ORDER_TRADE_UPDATE';
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: string;
  quantity: string;
  price: string;
  filledQuantity: string;
  status: string;
  timestamp: number;
  fills?: Array<{
    price: string;
    quantity: string;
    fee: string;
    timestamp: number;
  }>;
}

// ============================================================================
// Exchange Client Interface
// ============================================================================

export interface IExchangeClient {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Market Data (REST)
  getKlines(symbol: string, interval: string, limit?: number): Promise<KlineData[]>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
  getTicker(symbol: string): Promise<TickerData>;
  getFundingRate(symbol: string): Promise<FundingRateData>;
  getMarkPrice(symbol: string): Promise<MarkPriceData>;
  getRecentTrades(symbol: string, limit?: number): Promise<TradeData[]>;
  getOpenInterest(symbol: string): Promise<{ symbol: string; openInterest: string }>;

  // Account Data (REST)
  getAccount(): Promise<Account>;
  getBalance(): Promise<AccountBalance[]>;
  getPositions(): Promise<Position[]>;
  getOrders(symbol?: string): Promise<Order[]>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getTrades(symbol?: string): Promise<Trade[]>;

  // Order Management
  placeOrder(params: PlaceOrderParams): Promise<Order>;
  cancelOrder(symbol: string, orderId: string | number): Promise<Order>;
  cancelAllOrders(symbol: string): Promise<Order[]>;
  modifyOrder(symbol: string, orderId: string | number, params: Partial<PlaceOrderParams>): Promise<Order>;

  // WebSocket Subscriptions
  subscribeToKlines(symbol: string, interval: string, callback: (data: KlineData) => void): string;
  subscribeToDepth(symbol: string, callback: (data: OrderBook) => void): string;
  subscribeToTicker(symbol: string, callback: (data: TickerData) => void): string;
  subscribeToTrades(symbol: string, callback: (data: TradeData) => void): string;
  subscribeToAccount(callback: (data: AccountUpdateEvent) => void): string;
  subscribeToOrders(callback: (data: OrderUpdateEvent) => void): string;
  subscribeToMarkPrice(symbol: string, callback: (data: MarkPriceData) => void): string;
  unsubscribe(subscriptionId: string): void;

  // Health Check
  ping(): Promise<number>; // Returns latency in ms
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
  quantity: string;
  price?: string;
  stopPrice?: string;
  callbackRate?: string; // For trailing stops
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  positionSide?: 'LONG' | 'SHORT';
  closePosition?: boolean;
  postOnly?: boolean;
  reduceOnly?: boolean;
  clientOrderId?: string;
}

// ============================================================================
// Exchange Health & Status
// ============================================================================

export interface ExchangeHealth {
  exchange: ExchangeName;
  tier: ExchangeTier;
  isConnected: boolean;
  isHealthy: boolean;
  lastPing: number;     // ms since last successful ping
  latency: number;       // Last measured latency in ms
  errorCount: number;    // Consecutive errors
  lastError?: string;
  lastErrorTime?: number;
  uptime: number;        // Percentage (0-100)
  failoverCount: number; // Total failovers triggered by this exchange
}

export interface DataFreshness {
  kline: { age: number; source: ExchangeName };
  depth: { age: number; source: ExchangeName };
  ticker: { age: number; source: ExchangeName };
  account: { age: number; source: ExchangeName };
  fundingRate: { age: number; source: ExchangeName };
  markPrice: { age: number; source: ExchangeName };
}
