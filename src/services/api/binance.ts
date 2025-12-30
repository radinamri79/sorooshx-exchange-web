import type { KlineData, SymbolInfo, TickerData, OrderbookData } from '@/types';
import {
  dataSourceManager,
  validateRealData,
  createUnavailableResponse,
  type TickerDataWithMeta,
  type DataSource,
} from '../dataSourceManager';

// API endpoints for different sources
const API_ENDPOINTS = {
  binance: '/api/binance',
  okx: 'https://www.okx.com/api/v5/market',
  bybit: 'https://api.bybit.com/v5/market',
  bitget: 'https://api.bitget.com/api/v2/spot/market',
  coingecko: 'https://api.coingecko.com/api/v3',
};

// Symbol mappings for different exchanges
const SYMBOL_MAPPINGS: Record<DataSource, (symbol: string) => string> = {
  binance: (s) => s.toUpperCase(),
  okx: (s) => `${s.replace('USDT', '')}-USDT`,
  bybit: (s) => s.toUpperCase(),
  bitget: (s) => `${s.replace('USDT', '')}USDT`,
  coingecko: (s) => s.toLowerCase().replace('usdt', ''),
};

// CoinGecko ID mappings for common coins
const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  bnb: 'binancecoin',
  sol: 'solana',
  xrp: 'ripple',
  doge: 'dogecoin',
  ada: 'cardano',
  avax: 'avalanche-2',
  dot: 'polkadot',
  link: 'chainlink',
  matic: 'matic-network',
  atom: 'cosmos',
  ltc: 'litecoin',
  uni: 'uniswap',
  shib: 'shiba-inu',
};

/**
 * Fetch with timeout - prevents hanging requests
 */
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch ticker from Binance (via proxy)
 */
async function fetchBinanceTicker(symbol: string): Promise<TickerDataWithMeta> {
  const startTime = Date.now();
  const response = await fetchWithTimeout(
    `${API_ENDPOINTS.binance}/ticker?symbol=${SYMBOL_MAPPINGS.binance(symbol)}`,
    5000
  );

  if (!response.ok) {
    throw new Error(`Binance HTTP ${response.status}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  dataSourceManager.recordSuccess('binance', responseTime);

  return {
    symbol: data.symbol,
    lastPrice: data.lastPrice,
    priceChange: data.priceChange,
    priceChangePercent: data.priceChangePercent,
    highPrice: data.highPrice,
    lowPrice: data.lowPrice,
    volume: data.volume,
    quoteVolume: data.quoteVolume,
    _meta: {
      source: 'binance',
      reality: 'real',
      timestamp: Date.now(),
      age: 0,
      isStale: false,
      confidence: 1,
    },
  };
}

/**
 * Fetch ticker from OKX
 */
async function fetchOKXTicker(symbol: string): Promise<TickerDataWithMeta> {
  const startTime = Date.now();
  const instId = SYMBOL_MAPPINGS.okx(symbol);
  const response = await fetchWithTimeout(
    `${API_ENDPOINTS.okx}/ticker?instId=${instId}`,
    5000
  );

  if (!response.ok) {
    throw new Error(`OKX HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== '0' || !json.data?.[0]) {
    throw new Error('OKX invalid response');
  }

  const data = json.data[0];
  const responseTime = Date.now() - startTime;
  dataSourceManager.recordSuccess('okx', responseTime);

  const lastPrice = parseFloat(data.last);
  const open24h = parseFloat(data.open24h);
  const priceChange = lastPrice - open24h;
  const priceChangePercent = (priceChange / open24h) * 100;

  return {
    symbol: symbol.toUpperCase(),
    lastPrice: data.last,
    priceChange: priceChange.toFixed(2),
    priceChangePercent: priceChangePercent.toFixed(2),
    highPrice: data.high24h,
    lowPrice: data.low24h,
    volume: data.vol24h,
    quoteVolume: data.volCcy24h,
    _meta: {
      source: 'okx',
      reality: 'real',
      timestamp: Date.now(),
      age: 0,
      isStale: false,
      confidence: 0.98,
    },
  };
}

/**
 * Fetch ticker from Bybit
 */
async function fetchBybitTicker(symbol: string): Promise<TickerDataWithMeta> {
  const startTime = Date.now();
  const response = await fetchWithTimeout(
    `${API_ENDPOINTS.bybit}/tickers?category=spot&symbol=${SYMBOL_MAPPINGS.bybit(symbol)}`,
    5000
  );

  if (!response.ok) {
    throw new Error(`Bybit HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.retCode !== 0 || !json.result?.list?.[0]) {
    throw new Error('Bybit invalid response');
  }

  const data = json.result.list[0];
  const responseTime = Date.now() - startTime;
  dataSourceManager.recordSuccess('bybit', responseTime);

  return {
    symbol: symbol.toUpperCase(),
    lastPrice: data.lastPrice,
    priceChange: data.price24hPcnt ? (parseFloat(data.lastPrice) * parseFloat(data.price24hPcnt)).toFixed(2) : '0',
    priceChangePercent: data.price24hPcnt ? (parseFloat(data.price24hPcnt) * 100).toFixed(2) : '0',
    highPrice: data.highPrice24h,
    lowPrice: data.lowPrice24h,
    volume: data.volume24h,
    quoteVolume: data.turnover24h,
    _meta: {
      source: 'bybit',
      reality: 'real',
      timestamp: Date.now(),
      age: 0,
      isStale: false,
      confidence: 0.97,
    },
  };
}

/**
 * Fetch ticker from Bitget
 */
async function fetchBitgetTicker(symbol: string): Promise<TickerDataWithMeta> {
  const startTime = Date.now();
  const response = await fetchWithTimeout(
    `${API_ENDPOINTS.bitget}/tickers?symbol=${SYMBOL_MAPPINGS.bitget(symbol)}`,
    5000
  );

  if (!response.ok) {
    throw new Error(`Bitget HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== '00000' || !json.data?.[0]) {
    throw new Error('Bitget invalid response');
  }

  const data = json.data[0];
  const responseTime = Date.now() - startTime;
  dataSourceManager.recordSuccess('bitget', responseTime);

  return {
    symbol: symbol.toUpperCase(),
    lastPrice: data.lastPr,
    priceChange: data.change,
    priceChangePercent: data.changeUtc24h,
    highPrice: data.high24h,
    lowPrice: data.low24h,
    volume: data.baseVolume,
    quoteVolume: data.quoteVolume,
    _meta: {
      source: 'bitget',
      reality: 'real',
      timestamp: Date.now(),
      age: 0,
      isStale: false,
      confidence: 0.96,
    },
  };
}

/**
 * Fetch ticker from CoinGecko (slower but reliable, free, never blocked)
 */
async function fetchCoinGeckoTicker(symbol: string): Promise<TickerDataWithMeta> {
  const startTime = Date.now();
  const coinId = SYMBOL_MAPPINGS.coingecko(symbol);
  const geckoId = COINGECKO_IDS[coinId] || coinId;

  const response = await fetchWithTimeout(
    `${API_ENDPOINTS.coingecko}/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`,
    8000 // CoinGecko can be slower
  );

  if (!response.ok) {
    throw new Error(`CoinGecko HTTP ${response.status}`);
  }

  const json = await response.json();
  const data = json[geckoId];

  if (!data) {
    throw new Error('CoinGecko coin not found');
  }

  const responseTime = Date.now() - startTime;
  dataSourceManager.recordSuccess('coingecko', responseTime);

  const lastPrice = data.usd.toString();
  const priceChangePercent = data.usd_24h_change?.toFixed(2) || '0';

  return {
    symbol: symbol.toUpperCase(),
    lastPrice,
    priceChange: '0', // CoinGecko doesn't provide absolute change
    priceChangePercent,
    highPrice: '0', // Not available in simple API
    lowPrice: '0',
    volume: data.usd_24h_vol?.toString() || '0',
    quoteVolume: '0',
    _meta: {
      source: 'coingecko',
      reality: 'real',
      timestamp: data.last_updated_at ? data.last_updated_at * 1000 : Date.now(),
      age: data.last_updated_at ? Date.now() - data.last_updated_at * 1000 : 0,
      isStale: false, // CoinGecko data is still real, just delayed
      confidence: 0.85, // Lower confidence due to update delay
    },
  };
}

/**
 * Fetch ticker with multi-source fallback
 * NEVER returns mock data - only real data, cached data, or unavailable state
 */
export async function fetchTickerWithFallback(symbol: string): Promise<TickerDataWithMeta> {
  const sources = dataSourceManager.getHealthySources();
  const fetchFunctions: Record<DataSource, () => Promise<TickerDataWithMeta>> = {
    binance: () => fetchBinanceTicker(symbol),
    okx: () => fetchOKXTicker(symbol),
    bybit: () => fetchBybitTicker(symbol),
    bitget: () => fetchBitgetTicker(symbol),
    coingecko: () => fetchCoinGeckoTicker(symbol),
  };

  // Try each source in priority order
  for (const source of sources) {
    try {
      const data = await fetchFunctions[source]();

      // Validate that data looks real
      const validation = validateRealData(data);
      if (!validation.isValid) {
        console.warn(`[API] ${source} returned invalid data:`, validation.reason);
        dataSourceManager.recordError(source, validation.reason || 'Invalid data');
        continue;
      }

      // Cache successful real data
      dataSourceManager.cacheData(symbol, data);

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[API] ${source} failed for ${symbol}:`, errorMsg);
      dataSourceManager.recordError(source, errorMsg);
      // Continue to next source
    }
  }

  // All sources failed - try cache
  const cached = dataSourceManager.getCachedData(symbol);
  if (cached) {
    console.info(`[API] Using cached data for ${symbol} (age: ${cached._meta.age}ms)`);
    return cached;
  }

  // No cache available - return unavailable state
  console.warn(`[API] No data available for ${symbol} from any source`);
  return createUnavailableResponse(symbol);
}

/**
 * Fetch 24hr ticker for a symbol (with fallback)
 */
export async function fetchTicker(symbol: string): Promise<TickerData> {
  const data = await fetchTickerWithFallback(symbol);
  // Strip metadata for backward compatibility
  const { _meta, ...tickerData } = data;
  return tickerData;
}

/**
 * Fetch exchange info (symbols, precision, etc.)
 */
export async function fetchExchangeInfo(): Promise<SymbolInfo[]> {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINTS.binance}/exchangeInfo`, 8000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
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
        maxLeverage: 125,
      }));
  } catch (error) {
    console.warn('[API] Failed to fetch exchange info:', error);
    return [];
  }
}

/**
 * Fetch all tickers with caching
 */
export async function fetchAllTickers(): Promise<TickerData[]> {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINTS.binance}/ticker`, 10000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const tickers = data.map((item: {
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

    // Cache tickers for fallback
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cached_all_tickers', JSON.stringify(tickers));
        localStorage.setItem('cached_all_tickers_time', Date.now().toString());
      } catch (e) {
        // Ignore storage errors
      }
    }

    return tickers;
  } catch (error) {
    console.warn('[API] Failed to fetch all tickers:', error);

    // Try cached data
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_all_tickers');
        const cacheTime = localStorage.getItem('cached_all_tickers_time');

        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime, 10);
          if (age < 60 * 60 * 1000) {
            // Cache < 1 hour old
            console.info('[API] Using cached tickers');
            return JSON.parse(cached);
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }

    return [];
  }
}

/**
 * Fetch orderbook snapshot
 */
export async function fetchOrderbook(symbol: string, limit = 100): Promise<OrderbookData> {
  try {
    const response = await fetchWithTimeout(
      `${API_ENDPOINTS.binance}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`,
      5000
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      lastUpdateId: data.lastUpdateId,
      bids: data.bids,
      asks: data.asks,
      timestamp: data.T || Date.now(),
    };
  } catch (error) {
    console.warn(`[API] Failed to fetch orderbook for ${symbol}:`, error);

    // Return empty orderbook - WebSocket will provide data
    return {
      lastUpdateId: 0,
      bids: [],
      asks: [],
      timestamp: Date.now(),
    };
  }
}

/**
 * Fetch historical klines with fallback
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 500
): Promise<KlineData[]> {
  // Try Binance first
  try {
    const response = await fetchWithTimeout(
      `${API_ENDPOINTS.binance}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
      10000
    );

    if (response.ok) {
      const data = await response.json();

      const klines = data.map((item: [number, string, string, string, string, string]) => ({
        time: Math.floor(item[0] / 1000),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));

      // Cache klines
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`klines_${symbol}_${interval}`, JSON.stringify(klines));
          localStorage.setItem(`klines_${symbol}_${interval}_time`, Date.now().toString());
        } catch (e) {
          // Ignore storage errors
        }
      }

      return klines;
    }
  } catch (error) {
    console.warn(`[API] Binance klines failed for ${symbol}:`, error);
  }

  // Try cached klines
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`klines_${symbol}_${interval}`);
      const cacheTime = localStorage.getItem(`klines_${symbol}_${interval}_time`);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < 24 * 60 * 60 * 1000) {
          // Cache < 24 hours old
          console.info(`[API] Using cached klines for ${symbol}`);
          return JSON.parse(cached);
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
  }

  // Return empty array - chart will show "No data available"
  console.warn(`[API] No kline data available for ${symbol}`);
  return [];
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
  try {
    const response = await fetchWithTimeout(
      `${API_ENDPOINTS.binance}/premiumIndex?symbol=${symbol.toUpperCase()}`,
      5000
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      markPrice: data.markPrice,
      indexPrice: data.indexPrice,
      fundingRate: data.lastFundingRate,
      nextFundingTime: data.nextFundingTime,
    };
  } catch (error) {
    console.warn(`[API] Failed to fetch mark price for ${symbol}:`, error);

    // Return zeros with clear indication
    return {
      markPrice: '0',
      indexPrice: '0',
      fundingRate: '0',
      nextFundingTime: 0,
    };
  }
}
