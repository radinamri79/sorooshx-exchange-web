/**
 * Multi-source API fetcher for Next.js routes
 * Tries multiple data sources in priority order: Binance → OKX → Bybit → Bitget → CoinGecko
 * 
 * API Documentation:
 * - Binance Futures: https://binance-docs.github.io/apidocs/futures/
 * - OKX: https://www.okx.com/docs-v5/
 * - Bybit: https://bybit-exchange.github.io/docs/v5/
 * - Bitget: https://www.bitget.com/api-doc/
 * - CoinGecko: https://docs.coingecko.com/
 */

const SOURCE_URLS = {
  binance: 'https://fapi.binance.com',        // Binance Futures API
  okx: 'https://www.okx.com/api/v5',          // OKX V5 API
  bybit: 'https://api.bybit.com',              // Bybit V5 API
  bitget: 'https://api.bitget.com/api/v2',    // Bitget V2 API
  coingecko: 'https://api.coingecko.com/api/v3',
};

const TIMEOUT = 10000; // 10 second timeout per source to account for network latency

// Expanded CoinGecko ID mappings for common cryptocurrencies
const COINGECKO_IDS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'UNI': 'uniswap',
  'SHIB': 'shiba-inu',
  'PEPE': 'pepe',
  'FIL': 'filecoin',
  'NEAR': 'near',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'TRX': 'tron',
  'ETC': 'ethereum-classic',
  'BCH': 'bitcoin-cash',
  'XEC': 'ecash',
  'FLOW': 'flow',
  'THETA': 'theta-token',
  'ZEC': 'zcash',
  'DASH': 'dash',
  'COMP': 'compound-governance-token',
  'MKR': 'maker',
  'AAVE': 'aave',
  'SUSHI': 'sushi',
  'ENJ': 'enjincoin',
  'SAND': 'the-sandbox',
  'AXS': 'axie-infinity',
  'QTUM': 'qtum',
};

// Fallback mock data for common pairs when all sources fail
const FALLBACK_TICKER_DATA: Record<string, any> = {
  'BTCUSDT': { symbol: 'BTCUSDT', lastPrice: '93700', priceChange: '1200', priceChangePercent: '1.30', highPrice: '94200', lowPrice: '92500', volume: '1000000' },
  'ETHUSDT': { symbol: 'ETHUSDT', lastPrice: '3200', priceChange: '50', priceChangePercent: '1.58', highPrice: '3250', lowPrice: '3150', volume: '800000' },
  'BNBUSDT': { symbol: 'BNBUSDT', lastPrice: '905', priceChange: '5', priceChangePercent: '0.56', highPrice: '920', lowPrice: '890', volume: '600000' },
  'SOLUSDT': { symbol: 'SOLUSDT', lastPrice: '138', priceChange: '2', priceChangePercent: '1.47', highPrice: '142', lowPrice: '135', volume: '400000' },
  'XRPUSDT': { symbol: 'XRPUSDT', lastPrice: '2.35', priceChange: '0.20', priceChangePercent: '9.26', highPrice: '2.40', lowPrice: '2.10', volume: '300000' },
  'DOGEUSDT': { symbol: 'DOGEUSDT', lastPrice: '0.35', priceChange: '0.01', priceChangePercent: '2.94', highPrice: '0.36', lowPrice: '0.33', volume: '250000' },
  'ADAUSDT': { symbol: 'ADAUSDT', lastPrice: '0.95', priceChange: '0.02', priceChangePercent: '2.15', highPrice: '0.98', lowPrice: '0.92', volume: '200000' },
  'AVAXUSDT': { symbol: 'AVAXUSDT', lastPrice: '32', priceChange: '0.5', priceChangePercent: '1.59', highPrice: '33', lowPrice: '31', volume: '150000' },
  'MATICUSDT': { symbol: 'MATICUSDT', lastPrice: '0.72', priceChange: '0.01', priceChangePercent: '1.41', highPrice: '0.74', lowPrice: '0.70', volume: '180000' },
  'LINKUSDT': { symbol: 'LINKUSDT', lastPrice: '25', priceChange: '0.5', priceChangePercent: '2.04', highPrice: '26', lowPrice: '24', volume: '120000' },
  'UNIUSDT': { symbol: 'UNIUSDT', lastPrice: '19', priceChange: '0.3', priceChangePercent: '1.60', highPrice: '20', lowPrice: '18', volume: '100000' },
  'LTCUSDT': { symbol: 'LTCUSDT', lastPrice: '150', priceChange: '2', priceChangePercent: '1.35', highPrice: '155', lowPrice: '145', volume: '90000' },
  'TRXUSDT': { symbol: 'TRXUSDT', lastPrice: '0.32', priceChange: '0.01', priceChangePercent: '3.23', highPrice: '0.33', lowPrice: '0.30', volume: '80000' },
  'VETUSDT': { symbol: 'VETUSDT', lastPrice: '0.095', priceChange: '0.002', priceChangePercent: '2.15', highPrice: '0.10', lowPrice: '0.091', volume: '70000' },
  'FILUSDT': { symbol: 'FILUSDT', lastPrice: '18', priceChange: '0.3', priceChangePercent: '1.69', highPrice: '19', lowPrice: '17', volume: '60000' },
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch ticker data from multiple sources
 * Binance format: https://binance-docs.github.io/apidocs/futures/#24hr-ticker-price-change-statistics
 */
export async function fetchTickerFromMultipleSources(symbol: string): Promise<any> {
  const upperSymbol = symbol.toUpperCase();

  // Try Binance first (Futures API)
  try {
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.binance}/fapi/v1/ticker/24hr?symbol=${upperSymbol}`
    );
    if (response.ok) {
      console.log(`[API] Successfully fetched ticker for ${symbol} from Binance`);
      return await response.json();
    }
    if (response.status === 451) {
      console.warn(`[API] Binance blocked (451) for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Binance ticker failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try OKX
  // Documentation: https://www.okx.com/docs-v5/en/#public-data-get-tickers
  // Symbol format: BTC-USDT (with hyphen)
  try {
    const okxSymbol = upperSymbol.replace('USDT', '-USDT');
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.okx}/market/ticker?instId=${okxSymbol}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.code === '0' && data.data && data.data[0]) {
        console.log(`[API] Successfully fetched ticker for ${symbol} from OKX`);
        const tick = data.data[0];
        const lastPrice = parseFloat(tick.last);
        const open24h = parseFloat(tick.open24h);
        const priceChange = lastPrice - open24h;
        const priceChangePercent = (priceChange / open24h) * 100;
        
        return {
          symbol: upperSymbol,
          lastPrice: tick.last,
          priceChange: priceChange.toFixed(8),
          priceChangePercent: priceChangePercent.toFixed(4),
          highPrice: tick.high24h,
          lowPrice: tick.low24h,
          volume: tick.vol24h,         // volume in base coin
          quoteAssetVolume: tick.volCcy24h,  // volume in quote currency
          _source: 'okx',
        };
      }
    }
  } catch (error) {
    console.warn(`[API] OKX ticker failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try Bybit
  // Documentation: https://bybit-exchange.github.io/docs/v5/market/ticker
  // Symbol format: BTCUSDT (no transformation needed)
  // Category: linear for USDT perpetual futures
  try {
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.bybit}/v5/market/tickers?category=linear&symbol=${upperSymbol}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.retCode === 0 && data.result?.list?.[0]) {
        console.log(`[API] Successfully fetched ticker for ${symbol} from Bybit`);
        const tick = data.result.list[0];
        const lastPrice = parseFloat(tick.lastPrice);
        const prevPrice24h = parseFloat(tick.prevPrice24h);
        const priceChange = lastPrice - prevPrice24h;
        const priceChangePercent = parseFloat(tick.price24hPcnt) * 100;
        
        return {
          symbol: upperSymbol,
          lastPrice: tick.lastPrice,
          priceChange: priceChange.toFixed(8),
          priceChangePercent: priceChangePercent.toFixed(4),
          highPrice: tick.highPrice24h,
          lowPrice: tick.lowPrice24h,
          volume: tick.volume24h,        // volume in base coin
          quoteAssetVolume: tick.turnover24h,  // turnover in quote currency
          _source: 'bybit',
        };
      }
    }
  } catch (error) {
    console.warn(`[API] Bybit ticker failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try Bitget
  // Documentation: https://www.bitget.com/api-doc/spot/public/Get-Tickers
  // Symbol format: BTCUSDT (no transformation needed)
  try {
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.bitget}/spot/public/tickers?symbol=${upperSymbol}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.code === '00000' && data.data?.length > 0) {
        console.log(`[API] Successfully fetched ticker for ${symbol} from Bitget`);
        const tick = data.data[0];
        const priceChange = parseFloat(tick.change);
        const priceChangePercent = parseFloat(tick.changeUtc24h) * 100;
        
        return {
          symbol: upperSymbol,
          lastPrice: tick.lastPr,
          priceChange: priceChange.toFixed(8),
          priceChangePercent: priceChangePercent.toFixed(4),
          highPrice: tick.high24h,
          lowPrice: tick.low24h,
          volume: tick.baseVolume,      // base coin volume
          quoteAssetVolume: tick.quoteVolume,  // quote asset volume
          _source: 'bitget',
        };
      }
    }
  } catch (error) {
    console.warn(`[API] Bitget ticker failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try CoinGecko as last resort
  // Documentation: https://docs.coingecko.com/reference/simple-price
  try {
    const baseSymbol = upperSymbol.replace('USDT', '');
    const coingeckoId = COINGECKO_IDS[baseSymbol];
    if (coingeckoId) {
      const response = await fetchWithTimeout(
        `${SOURCE_URLS.coingecko}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );
      if (response.ok) {
        const data = await response.json();
        if (data[coingeckoId]) {
          console.log(`[API] Successfully fetched ticker for ${symbol} from CoinGecko`);
          const tick = data[coingeckoId];
          return {
            symbol: upperSymbol,
            lastPrice: tick.usd?.toString() || '0',
            priceChange: '0',
            priceChangePercent: (tick.usd_24h_change || 0).toFixed(4),
            highPrice: '0',
            lowPrice: '0',
            volume: (tick.usd_24h_vol || 0).toString(),
            quoteAssetVolume: '0',
            _source: 'coingecko',
            _note: 'CoinGecko data - not real-time',
          };
        }
      }
    }
  } catch (error) {
    console.warn(`[API] CoinGecko ticker failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // All sources failed - try fallback data
  console.warn(`[API] All live sources failed for ticker ${symbol}, using fallback data`);
  const fallbackData = FALLBACK_TICKER_DATA[upperSymbol];
  
  if (fallbackData) {
    console.log(`[API] Using fallback data for ${symbol}`);
    return {
      ...fallbackData,
      _source: 'fallback',
      _note: 'Using cached fallback data - not real-time',
    };
  }

  // No fallback data available
  console.error(`[API] All sources failed for ticker ${symbol} and no fallback available`);
  return {
    symbol: upperSymbol,
    lastPrice: '--',
    priceChange: '--',
    priceChangePercent: '--',
    _unavailable: true,
    _source: 'none',
  };
}

/**
 * Fetch klines data from multiple sources
 * Returns data in Binance format: [timestamp, open, high, low, close, volume, quoteAssetVolume, ...]
 */
export async function fetchKlinesFromMultipleSources(
  symbol: string,
  interval: string,
  limit: number
): Promise<any[]> {
  const upperSymbol = symbol.toUpperCase();
  const KLINES_TIMEOUT = 15000; // 15s timeout for klines (heavier requests)

  // Try Binance first
  // Documentation: https://binance-docs.github.io/apidocs/futures/#klines-candlestick-data
  try {
    console.log(`[API] Attempting Binance klines for ${symbol}...`);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.binance}/fapi/v1/klines?symbol=${upperSymbol}&interval=${interval}&limit=${limit}`,
      {},
      KLINES_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      console.log(`[API] Successfully fetched klines for ${symbol} from Binance`);
      return data;
    }
    if (response.status === 451) {
      console.warn(`[API] Binance blocked (451) for klines ${symbol}`);
    } else {
      console.warn(`[API] Binance klines HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Binance klines failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try OKX
  // Documentation: https://www.okx.com/docs-v5/en/#public-data-get-candlesticks
  // Symbol format: BTC-USDT (with hyphen)
  // Interval format: 1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W, 1M
  try {
    console.log(`[API] Attempting OKX klines for ${symbol}...`);
    const okxSymbol = upperSymbol.replace('USDT', '-USDT');
    const okxInterval = convertIntervalToOKX(interval);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.okx}/market/candles?instId=${okxSymbol}&bar=${okxInterval}&limit=${limit}`,
      {},
      KLINES_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      if (data.code === '0' && data.data) {
        console.log(`[API] Successfully fetched klines for ${symbol} from OKX`);
        // OKX format: [timestamp, open, high, low, close, volume, volCcy, ...]
        return data.data.map((candle: (string | undefined)[]) => [
          parseInt(candle[0] || '0'),
          candle[1], // open
          candle[2], // high
          candle[3], // low
          candle[4], // close
          candle[5], // volume
          candle[6], // volCcy (quote asset volume)
        ]);
      } else {
        console.warn(`[API] OKX klines invalid response: code=${data.code}`);
      }
    } else {
      console.warn(`[API] OKX klines HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] OKX klines failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try Bybit
  // Documentation: https://bybit-exchange.github.io/docs/v5/market/kline
  // Symbol format: BTCUSDT (no transformation needed)
  // Category: linear for USDT perpetual futures
  // Interval: 1, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M
  try {
    console.log(`[API] Attempting Bybit klines for ${symbol}...`);
    const bybitInterval = convertIntervalToBybit(interval);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.bybit}/v5/market/kline?category=linear&symbol=${upperSymbol}&interval=${bybitInterval}&limit=${limit}`,
      {},
      KLINES_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      if (data.retCode === 0 && data.result?.list) {
        console.log(`[API] Successfully fetched klines for ${symbol} from Bybit`);
        // Bybit format: [timestamp, open, high, low, close, volume, turnover, ...]
        return data.result.list.map((candle: (string | undefined)[]) => [
          parseInt(candle[0] || '0'),
          candle[1], // open
          candle[2], // high
          candle[3], // low
          candle[4], // close
          candle[5], // volume (in base coin)
          candle[6], // turnover (in quote currency)
        ]);
      } else {
        console.warn(`[API] Bybit klines invalid response: retCode=${data.retCode}`);
      }
    } else {
      console.warn(`[API] Bybit klines HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Bybit klines failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try Bitget
  // Documentation: https://www.bitget.com/api-doc/spot/public/Get-Candlesticks
  // Symbol format: BTCUSDT (no transformation needed)
  // Interval format: 1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 1d, 1w, 1M
  try {
    console.log(`[API] Attempting Bitget klines for ${symbol}...`);
    const bitgetInterval = convertIntervalToBitget(interval);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.bitget}/spot/public/candles?symbol=${upperSymbol}&granularity=${bitgetInterval}&limit=${limit}`,
      {},
      KLINES_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      if (data.code === '00000' && data.data) {
        console.log(`[API] Successfully fetched klines for ${symbol} from Bitget`);
        // Bitget format: [timestamp, open, high, low, close, volume, quoteVol, ...]
        return data.data.map((candle: (string | undefined)[]) => [
          parseInt(candle[0] || '0'),
          candle[1], // open
          candle[2], // high
          candle[3], // low
          candle[4], // close
          candle[5], // volume
          candle[6], // quoteVol (quote asset volume)
        ]);
      } else {
        console.warn(`[API] Bitget klines invalid response: code=${data.code}`);
      }
    } else {
      console.warn(`[API] Bitget klines HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Bitget klines failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.error(`[API] All sources failed for klines ${symbol}`);
  return [];
}

/**
 * Fetch orderbook depth from multiple sources
 */
export async function fetchDepthFromMultipleSources(symbol: string, limit: number): Promise<any> {
  const upperSymbol = symbol.toUpperCase();
  const DEPTH_TIMEOUT = 15000; // 15s timeout for depth requests

  // Try Binance first
  // Documentation: https://binance-docs.github.io/apidocs/futures/#order-book
  try {
    console.log(`[API] Attempting Binance depth for ${symbol}...`);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.binance}/fapi/v1/depth?symbol=${upperSymbol}&limit=${limit}`,
      {},
      DEPTH_TIMEOUT
    );
    if (response.ok) {
      console.log(`[API] Successfully fetched depth for ${symbol} from Binance`);
      return await response.json();
    }
    if (response.status === 451) {
      console.warn(`[API] Binance blocked (451) for depth ${symbol}`);
    } else {
      console.warn(`[API] Binance depth HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Binance depth failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try OKX
  // Documentation: https://www.okx.com/docs-v5/en/#public-data-get-order-book
  // Symbol format: BTC-USDT (with hyphen)
  // sz parameter: size of the order book (1, 5, 10, 15, 20, 50, 100, etc.)
  try {
    console.log(`[API] Attempting OKX depth for ${symbol}...`);
    const okxSymbol = upperSymbol.replace('USDT', '-USDT');
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.okx}/market/books?instId=${okxSymbol}&sz=${limit}`,
      {},
      DEPTH_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      if (data.code === '0' && data.data?.[0]) {
        console.log(`[API] Successfully fetched depth for ${symbol} from OKX`);
        const book = data.data[0];
        return {
          bids: book.bids.map((bid: string[]) => [bid[0], bid[1]]),
          asks: book.asks.map((ask: string[]) => [ask[0], ask[1]]),
        };
      } else {
        console.warn(`[API] OKX depth invalid response: code=${data.code}`);
      }
    } else {
      console.warn(`[API] OKX depth HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] OKX depth failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try Bybit
  // Documentation: https://bybit-exchange.github.io/docs/v5/market/orderbook
  // Symbol format: BTCUSDT (no transformation needed)
  // Category: linear for USDT perpetual futures
  try {
    console.log(`[API] Attempting Bybit depth for ${symbol}...`);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.bybit}/v5/market/orderbook?category=linear&symbol=${upperSymbol}&limit=${limit}`,
      {},
      DEPTH_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      if (data.retCode === 0 && data.result) {
        console.log(`[API] Successfully fetched depth for ${symbol} from Bybit`);
        return {
          bids: data.result.b.map((bid: string[]) => [bid[0], bid[1]]),
          asks: data.result.a.map((ask: string[]) => [ask[0], ask[1]]),
        };
      } else {
        console.warn(`[API] Bybit depth invalid response: retCode=${data.retCode}`);
      }
    } else {
      console.warn(`[API] Bybit depth HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Bybit depth failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Try Bitget
  // Documentation: https://www.bitget.com/api-doc/spot/public/Get-Order-Book
  // Symbol format: BTCUSDT (no transformation needed)
  try {
    console.log(`[API] Attempting Bitget depth for ${symbol}...`);
    const response = await fetchWithTimeout(
      `${SOURCE_URLS.bitget}/spot/public/orderbook?symbol=${upperSymbol}&limit=${limit}`,
      {},
      DEPTH_TIMEOUT
    );
    if (response.ok) {
      const data = await response.json();
      if (data.code === '00000' && data.data) {
        console.log(`[API] Successfully fetched depth for ${symbol} from Bitget`);
        const book = data.data;
        return {
          bids: book.bids.map((bid: string[]) => [bid[0], bid[1]]),
          asks: book.asks.map((ask: string[]) => [ask[0], ask[1]]),
        };
      } else {
        console.warn(`[API] Bitget depth invalid response: code=${data.code}`);
      }
    } else {
      console.warn(`[API] Bitget depth HTTP ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.warn(`[API] Bitget depth failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.error(`[API] All sources failed for depth ${symbol}`);
  return { bids: [], asks: [] };
}

/**
 * Convert interval format between exchanges
 * Binance format (standard): 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M
 */
function convertIntervalToOKX(interval: string): string {
  const mapping: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',     // OKX uses uppercase H
    '4h': '4H',
    '1d': '1D',
    '1w': '1W',
    '1M': '1M',
  };
  return mapping[interval] || '15m';
}

function convertIntervalToBybit(interval: string): string {
  const mapping: Record<string, string> = {
    '1m': '1',      // Bybit uses numeric format
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '1d': 'D',
    '1w': 'W',
    '1M': 'M',
  };
  return mapping[interval] || '15';
}

function convertIntervalToBitget(interval: string): string {
  const mapping: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '6h': '6h',
    '12h': '12h',
    '1d': '1d',
    '1w': '1w',
    '1M': '1M',
  };
  return mapping[interval] || '15m';
}

export default {
  fetchTickerFromMultipleSources,
  fetchKlinesFromMultipleSources,
  fetchDepthFromMultipleSources,
};
