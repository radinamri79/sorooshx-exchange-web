import type { KlineData, SymbolInfo, TickerData, OrderbookData } from '@/types';

// Use local API proxy to avoid CORS issues
const API_PROXY_BASE = '/api/binance';

/**
 * Fetch exchange info (symbols, precision, etc.)
 */
export async function fetchExchangeInfo(): Promise<SymbolInfo[]> {
  const response = await fetch(`${API_PROXY_BASE}/exchangeInfo`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch exchange info');
  }
  
  const data = await response.json();
  
  return data.symbols
    .filter((s: { status: string }) => s.status === 'TRADING')
    .map((s: {
      symbol: string;
      baseAsset: string;
      quoteAsset: string;
      pricePrecision: number;
      quantityPrecision: number;
      filters: Array<{ filterType: string; minQty?: string }>;
    }) => ({
      symbol: s.symbol,
      base: s.baseAsset,
      quote: s.quoteAsset,
      pricePrecision: s.pricePrecision,
      quantityPrecision: s.quantityPrecision,
      minQuantity: s.filters.find((f) => f.filterType === 'LOT_SIZE')?.minQty || '0.001',
      maxLeverage: 125, // Would need separate API call for actual leverage
    }));
}

/**
 * Fetch 24hr ticker for a symbol
 */
export async function fetchTicker(symbol: string): Promise<TickerData> {
  const response = await fetch(
    `${API_PROXY_BASE}/ticker?symbol=${symbol.toUpperCase()}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ticker for ${symbol}`);
  }
  
  const data = await response.json();
  
  return {
    symbol: data.symbol,
    lastPrice: data.lastPrice,
    priceChange: data.priceChange,
    priceChangePercent: data.priceChangePercent,
    highPrice: data.highPrice,
    lowPrice: data.lowPrice,
    volume: data.volume,
    quoteVolume: data.quoteVolume,
  };
}

/**
 * Fetch all tickers
 */
export async function fetchAllTickers(): Promise<TickerData[]> {
  const response = await fetch(`${API_PROXY_BASE}/ticker`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch tickers');
  }
  
  const data = await response.json();
  
  return data.map((item: {
    symbol: string;
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
  }) => ({
    symbol: item.symbol,
    lastPrice: item.lastPrice,
    priceChange: item.priceChange,
    priceChangePercent: item.priceChangePercent,
    highPrice: item.highPrice,
    lowPrice: item.lowPrice,
    volume: item.volume,
    quoteVolume: item.quoteVolume,
  }));
}

/**
 * Fetch orderbook snapshot
 */
export async function fetchOrderbook(symbol: string, limit = 100): Promise<OrderbookData> {
  const response = await fetch(
    `${API_PROXY_BASE}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch orderbook for ${symbol}`);
  }
  
  const data = await response.json();
  
  return {
    lastUpdateId: data.lastUpdateId,
    bids: data.bids,
    asks: data.asks,
    timestamp: data.T || Date.now(),
  };
}

/**
 * Fetch historical klines
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 500
): Promise<KlineData[]> {
  const response = await fetch(
    `${API_PROXY_BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch klines for ${symbol}`);
  }
  
  const data = await response.json();
  
  return data.map((item: [number, string, string, string, string, string]) => ({
    time: Math.floor(item[0] / 1000),
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
  }));
}

/**
 * Fetch mark price and funding rate
 */
export async function fetchMarkPrice(symbol: string): Promise<{
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  nextFundingTime: number;
}> {
  const response = await fetch(
    `${API_PROXY_BASE}/premiumIndex?symbol=${symbol.toUpperCase()}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch mark price for ${symbol}`);
  }
  
  const data = await response.json();
  
  return {
    markPrice: data.markPrice,
    indexPrice: data.indexPrice,
    fundingRate: data.lastFundingRate,
    nextFundingTime: data.nextFundingTime,
  };
}
