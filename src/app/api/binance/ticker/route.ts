import { NextRequest, NextResponse } from 'next/server';
import { fetchTickerFromMultipleSources } from '../lib/multi-source';

// Extended list of popular and top trading pairs
const ALL_POPULAR_PAIRS = [
  // Top 10 by market cap
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'MATICUSDT', 'LINKUSDT',
  // DeFi & Layer 2
  'UNIUSDT', 'AAVEUSDT', 'ARBITUSDT', 'OPUSDT', 'GNOSISUSDT',
  // Exchange & Gaming
  'FTUSDT', 'GUSDT', 'AXSUSDT', 'SANDUSDT', 'ENJUSDT',
  // AI & Emerging
  'AIUSDT', 'RENDERUSDT', 'WLDUSDT', 'ARBUSDT', 'NOTUSDT',
  // Staking & L2
  'STXUSDT', 'INJUSDT', 'JUPUSDT',
  // Major Altcoins
  'LTCUSDT', 'BCHUSDT', 'ETCUSDT', 'ZECUSDT', 'DASHUSDT',
  'COSMOSUSDT', 'ATOMUSDT', 'NEARUSDT', 'ALGOUSDT', 'FLOWUSDT',
  'THETAUSDT', 'HBARUSDT', 'TRXUSDT', 'VEUSDT', 'VETUSDT',
  'QTUMUSDT', 'ICONUSDT', 'ONEUSDT', 'FILUSDT', 'SUSHIUSDT',
  'COMPUSDT', 'MKRUSDT', 'CDTUSDT', 'PEPEUSDT',
];

// Cache for ticker data (5 minute TTL)
const TICKER_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedTicker(key: string): any | null {
  const cached = TICKER_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  TICKER_CACHE.delete(key);
  return null;
}

function setCachedTicker(key: string, data: any): void {
  TICKER_CACHE.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (symbol) {
    // Single symbol ticker - check cache first
    const cacheKey = `ticker_${symbol}`;
    const cached = getCachedTicker(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const data = await fetchTickerFromMultipleSources(symbol);
    if (data) {
      setCachedTicker(cacheKey, data);
    }
    return NextResponse.json(data);
  }

  // All tickers - fetch with fallback and error handling
  const results = await Promise.allSettled(
    ALL_POPULAR_PAIRS.map(async (sym) => {
      const cacheKey = `ticker_${sym}`;
      
      // Try to get from cache first
      const cached = getCachedTicker(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from sources with retry logic
      const data = await fetchTickerFromMultipleSources(sym);
      if (data && data.symbol) {
        setCachedTicker(cacheKey, data);
        return data;
      }
      return null;
    })
  );

  // Filter out failed promises and null values
  const tickers = results
    .filter((result) => result.status === 'fulfilled' && result.value !== null)
    .map((result) => (result as PromiseFulfilledResult<any>).value);

  // If we got some results, return them
  if (tickers.length > 0) {
    return NextResponse.json(tickers);
  }

  // If all failed, return empty array with a cache-control header for retry
  return NextResponse.json([], {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
