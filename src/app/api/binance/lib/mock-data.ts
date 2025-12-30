/**
 * Mock data generator for Binance API when blocked by geo-restrictions
 * Generates realistic-looking trading data for development
 */

// Base prices for popular symbols
const BASE_PRICES: Record<string, number> = {
  BTCUSDT: 97500,
  ETHUSDT: 3650,
  BNBUSDT: 635,
  XRPUSDT: 2.35,
  SOLUSDT: 235,
  DOGEUSDT: 0.42,
  ADAUSDT: 1.05,
  AVAXUSDT: 45,
  DOTUSDT: 9.5,
  LINKUSDT: 24,
};

function getBasePrice(symbol: string): number {
  return BASE_PRICES[symbol.toUpperCase()] || 100;
}

type KlineData = [number, string, string, string, string, string, number, string, number, string, string, string];

/**
 * Generate mock klines (candlestick) data
 */
export function generateMockKlines(
  symbol: string,
  interval: string,
  limit: number = 500
): KlineData[] {
  const basePrice = getBasePrice(symbol);
  const now = Date.now();
  const intervalMs = getIntervalMs(interval);
  const klines: KlineData[] = [];
  
  let currentPrice = basePrice * (0.95 + Math.random() * 0.1); // Start with some variation
  
  for (let i = limit - 1; i >= 0; i--) {
    const openTime = now - (i * intervalMs);
    const closeTime = openTime + intervalMs - 1;
    
    const open = currentPrice;
    const volatility = 0.5 + Math.random() * 1; // 0.5-1.5% volatility
    const high = open * (1 + (Math.random() * volatility) / 100);
    const low = open * (1 - (Math.random() * volatility) / 100);
    const close = low + Math.random() * (high - low);
    
    const volume = 100 + Math.random() * 10000;
    const quoteVolume = volume * ((high + low) / 2);
    
    klines.push([
      openTime,
      open.toFixed(2),
      high.toFixed(2),
      low.toFixed(2),
      close.toFixed(2),
      volume.toFixed(8),
      closeTime,
      quoteVolume.toFixed(8),
      Math.floor(50 + Math.random() * 500), // Number of trades
      (volume * 0.4 + Math.random() * volume * 0.2).toFixed(8), // Taker buy volume
      (quoteVolume * 0.4 + Math.random() * quoteVolume * 0.2).toFixed(8), // Taker buy quote volume
      '0',
    ]);
    
    // Next candle starts at previous close with some gap
    currentPrice = close * (0.999 + Math.random() * 0.002);
  }
  
  return klines;
}

/**
 * Generate mock orderbook data
 */
export function generateMockOrderbook(symbol: string, limit: number = 100) {
  const basePrice = getBasePrice(symbol);
  const spread = basePrice * 0.0001; // 0.01% spread
  
  const bids: [string, string][] = [];
  const asks: [string, string][] = [];
  
  let bidPrice = basePrice - spread / 2;
  let askPrice = basePrice + spread / 2;
  
  for (let i = 0; i < limit; i++) {
    const bidQty = 0.1 + Math.random() * 10;
    const askQty = 0.1 + Math.random() * 10;
    
    bids.push([bidPrice.toFixed(2), bidQty.toFixed(4)]);
    asks.push([askPrice.toFixed(2), askQty.toFixed(4)]);
    
    bidPrice -= basePrice * 0.0001 * (1 + Math.random());
    askPrice += basePrice * 0.0001 * (1 + Math.random());
  }
  
  return {
    lastUpdateId: Date.now(),
    E: Date.now(),
    T: Date.now(),
    bids,
    asks,
  };
}

/**
 * Generate mock ticker data
 */
export function generateMockTicker(symbol: string) {
  const basePrice = getBasePrice(symbol);
  const priceChange = (Math.random() - 0.5) * basePrice * 0.1; // -5% to +5%
  const lastPrice = basePrice + priceChange * 0.5;
  
  return {
    symbol: symbol.toUpperCase(),
    priceChange: priceChange.toFixed(2),
    priceChangePercent: ((priceChange / basePrice) * 100).toFixed(2),
    weightedAvgPrice: (basePrice + priceChange * 0.3).toFixed(2),
    lastPrice: lastPrice.toFixed(2),
    lastQty: (Math.random() * 10).toFixed(4),
    openPrice: basePrice.toFixed(2),
    highPrice: (basePrice * (1 + Math.abs(priceChange) / basePrice * 1.2)).toFixed(2),
    lowPrice: (basePrice * (1 - Math.abs(priceChange) / basePrice * 1.2)).toFixed(2),
    volume: (10000 + Math.random() * 100000).toFixed(4),
    quoteVolume: ((10000 + Math.random() * 100000) * basePrice).toFixed(2),
    openTime: Date.now() - 24 * 60 * 60 * 1000,
    closeTime: Date.now(),
    firstId: 1000000,
    lastId: 1100000,
    count: 100000,
  };
}

/**
 * Generate mock tickers for all symbols
 */
export function generateMockAllTickers() {
  return Object.keys(BASE_PRICES).map(symbol => generateMockTicker(symbol));
}

/**
 * Generate mock premium index (mark price, funding rate)
 */
export function generateMockPremiumIndex(symbol: string) {
  const basePrice = getBasePrice(symbol);
  const markPrice = basePrice * (1 + (Math.random() - 0.5) * 0.001);
  const indexPrice = basePrice * (1 + (Math.random() - 0.5) * 0.0005);
  
  return {
    symbol: symbol.toUpperCase(),
    markPrice: markPrice.toFixed(2),
    indexPrice: indexPrice.toFixed(2),
    estimatedSettlePrice: basePrice.toFixed(2),
    lastFundingRate: ((Math.random() - 0.3) * 0.001).toFixed(8), // Usually positive
    nextFundingTime: Date.now() + (8 - (Date.now() / 3600000) % 8) * 3600000,
    interestRate: '0.00010000',
    time: Date.now(),
  };
}

/**
 * Generate mock exchange info
 */
export function generateMockExchangeInfo() {
  const symbols = Object.keys(BASE_PRICES).map(symbol => ({
    symbol,
    pair: symbol,
    contractType: 'PERPETUAL',
    deliveryDate: 4133404800000,
    onboardDate: 1569398400000,
    status: 'TRADING',
    baseAsset: symbol.replace('USDT', ''),
    quoteAsset: 'USDT',
    marginAsset: 'USDT',
    pricePrecision: 2,
    quantityPrecision: 3,
    baseAssetPrecision: 8,
    quotePrecision: 8,
    filters: [
      { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '1000000', tickSize: '0.01' },
      { filterType: 'LOT_SIZE', minQty: '0.001', maxQty: '10000', stepSize: '0.001' },
      { filterType: 'MIN_NOTIONAL', notional: '5' },
    ],
    orderTypes: ['LIMIT', 'MARKET', 'STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET'],
    timeInForce: ['GTC', 'IOC', 'FOK', 'GTX'],
  }));
  
  return {
    timezone: 'UTC',
    serverTime: Date.now(),
    futuresType: 'U_MARGINED',
    rateLimits: [],
    exchangeFilters: [],
    assets: [],
    symbols,
  };
}

function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  return map[interval] || 15 * 60 * 1000;
}
