import { NextRequest, NextResponse } from 'next/server';
import { fetchDepthFromMultipleSources } from '../lib/multi-source';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const limit = parseInt(searchParams.get('limit') || '100');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  const depth = await fetchDepthFromMultipleSources(symbol, limit);
  return NextResponse.json(depth);
}
