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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (symbol) {
    // Single symbol ticker
    const data = await fetchTickerFromMultipleSources(symbol);
    return NextResponse.json(data);
  }

  // All tickers - fetch all popular symbols
  const tickers = await Promise.all(
    ALL_POPULAR_PAIRS.map(sym => fetchTickerFromMultipleSources(sym))
  );

  return NextResponse.json(tickers);
}
