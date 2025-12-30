import { NextRequest, NextResponse } from 'next/server';
import { fetchKlinesFromMultipleSources } from '../lib/multi-source';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '15m';
  const limit = parseInt(searchParams.get('limit') || '500');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  const klines = await fetchKlinesFromMultipleSources(symbol, interval, limit);
  return NextResponse.json(klines);
}
