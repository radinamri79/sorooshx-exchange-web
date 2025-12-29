/**
 * Application constants
 */

// API URLs
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
export const BINANCE_WS_URL = process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://fstream.binance.com';

// Default trading pair
export const DEFAULT_SYMBOL = 'BTCUSDT';

// Leverage limits
export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 125;
export const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50, 75, 100, 125];

// Chart timeframes
export const TIMEFRAMES = [
  { label: '1m', value: '1m', interval: '1' },
  { label: '3m', value: '3m', interval: '3' },
  { label: '5m', value: '5m', interval: '5' },
  { label: '15m', value: '15m', interval: '15' },
  { label: '1H', value: '1h', interval: '60' },
  { label: '4H', value: '4h', interval: '240' },
  { label: '1D', value: '1d', interval: 'D' },
  { label: '1W', value: '1w', interval: 'W' },
] as const;

// Order types
export const ORDER_TYPES = {
  LIMIT: 'limit',
  MARKET: 'market',
  STOP_LIMIT: 'stop_limit',
  STOP_MARKET: 'stop_market',
} as const;

// Order sides
export const ORDER_SIDES = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

// Position sides
export const POSITION_SIDES = {
  LONG: 'long',
  SHORT: 'short',
} as const;

// Margin modes
export const MARGIN_MODES = {
  CROSS: 'cross',
  ISOLATED: 'isolated',
} as const;

// Trading fees (Binance futures)
export const TRADING_FEES = {
  TAKER: 0.0004, // 0.04%
  MAKER: 0.0002, // 0.02%
} as const;

// Orderbook settings
export const ORDERBOOK_LEVELS = 20;
export const ORDERBOOK_UPDATE_INTERVAL = 100; // ms

// WebSocket reconnect settings
export const WS_RECONNECT_DELAY = 1000; // ms
export const WS_MAX_RECONNECT_DELAY = 30000; // ms
export const WS_RECONNECT_MULTIPLIER = 1.5;

// Popular trading pairs
export const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'SOLUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'LINKUSDT',
];

// Symbol info (static for demo, would be fetched from API)
export const SYMBOL_INFO: Record<string, {
  base: string;
  quote: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQuantity: string;
  maxLeverage: number;
}> = {
  BTCUSDT: {
    base: 'BTC',
    quote: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 3,
    minQuantity: '0.001',
    maxLeverage: 125,
  },
  ETHUSDT: {
    base: 'ETH',
    quote: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 3,
    minQuantity: '0.001',
    maxLeverage: 100,
  },
  BNBUSDT: {
    base: 'BNB',
    quote: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 2,
    minQuantity: '0.01',
    maxLeverage: 75,
  },
  SOLUSDT: {
    base: 'SOL',
    quote: 'USDT',
    pricePrecision: 3,
    quantityPrecision: 0,
    minQuantity: '1',
    maxLeverage: 50,
  },
  XRPUSDT: {
    base: 'XRP',
    quote: 'USDT',
    pricePrecision: 4,
    quantityPrecision: 0,
    minQuantity: '1',
    maxLeverage: 50,
  },
};
