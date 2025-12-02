import { NextRequest, NextResponse } from 'next/server';
import { fetchTickerFromMultipleSources } from '../lib/multi-source';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (symbol) {
    // Single symbol ticker
    const data = await fetchTickerFromMultipleSources(symbol);
    return NextResponse.json(data);
  }

  // All tickers - fetch top symbols
  const topSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT'];
  const tickers = await Promise.all(
    topSymbols.map(sym => fetchTickerFromMultipleSources(sym))
  );

  return NextResponse.json(tickers);
}
