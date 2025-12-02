import { NextRequest, NextResponse } from 'next/server';
import { generateMockKlines } from '../lib/mock-data';
import { isBinanceBlocked, markBinanceBlocked } from '../lib/cache';

const BINANCE_REST_URL = 'https://fapi.binance.com';
const BINANCE_TESTNET_URL = 'https://testnet.binancefuture.com';

const USE_MOCK_DATA = process.env.USE_MOCK_BINANCE_DATA === 'true';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '15m';
  const limit = searchParams.get('limit') || '500';
  
  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  // If mock data is enabled or Binance is known to be blocked, return mock data
  if (USE_MOCK_DATA || isBinanceBlocked()) {
    return NextResponse.json(generateMockKlines(symbol, interval, parseInt(limit)));
  }
  
  const urls = [
    `${BINANCE_REST_URL}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
    `${BINANCE_TESTNET_URL}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 1 },
      });
      
      if (response.status === 451) {
        markBinanceBlocked();
        continue;
      }
      
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      continue;
    }
  }
  
  markBinanceBlocked();
  return NextResponse.json(generateMockKlines(symbol, interval, parseInt(limit)));
}
