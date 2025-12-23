'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPrice, formatNumber, formatPercentage } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { binanceWS } from '@/services/websocket';
import type { BinanceTicker } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketInfoProps {
  className?: string;
}

export function MarketInfo({ className }: MarketInfoProps) {
  useTranslations('trading');
  const { currentSymbol, tickers, setTicker } = useMarketStore();
  const tickerRef = useRef<BinanceTicker | null>(null);

  const ticker = tickers[currentSymbol] || null;
  tickerRef.current = ticker as BinanceTicker | null;

  useEffect(() => {
    const streamName = `${currentSymbol.toLowerCase()}@ticker`;

    const handleTickerMessage = (data: unknown) => {
      const tickerData = data as BinanceTicker;
      setTicker(tickerData.s, tickerData);
    };

    binanceWS.subscribe(streamName, handleTickerMessage);

    return () => {
      binanceWS.unsubscribe(streamName, handleTickerMessage);
    };
  }, [currentSymbol, setTicker]);

  const priceChangePercent = useMemo(() => {
    if (!ticker) return 0;
    return parseFloat(ticker.P);
  }, [ticker]);

  const isPositive = priceChangePercent >= 0;

  const stats = useMemo(() => {
    if (!ticker) {
      return {
        lastPrice: '--',
        priceChange: '--',
        priceChangePercent: '--',
        high24h: '--',
        low24h: '--',
        volume24h: '--',
        quoteVolume24h: '--',
      };
    }

    return {
      lastPrice: formatPrice(ticker.c),
      priceChange: formatPrice(ticker.p),
      priceChangePercent: formatPercentage(ticker.P),
      high24h: formatPrice(ticker.h),
      low24h: formatPrice(ticker.l),
      volume24h: formatNumber(ticker.v, { decimals: 2 }),
      quoteVolume24h: formatNumber(ticker.q, { decimals: 2 }),
    };
  }, [ticker]);

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-0 py-0 bg-transparent border-0',
        className
      )}
    >
      {/* Main Price with Change */}
      <div className="flex items-center gap-2 min-w-fit">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-base font-bold tabular-nums',
                isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
              )}
            >
              {stats.lastPrice}
            </span>
            <div className={cn(
              'flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium',
              isPositive ? 'bg-[#26a69a]/10 text-[#26a69a]' : 'bg-[#ef5350]/10 text-[#ef5350]'
            )}>
              {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {isPositive ? '+' : ''}{stats.priceChangePercent}
            </div>
          </div>
          <span className="text-[9px] text-[#6b6b6b] tabular-nums">
            ≈ ${stats.lastPrice}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-[#2a2a2d]" />

      {/* Compact Stats */}
      <div className="flex items-center gap-4 overflow-x-auto">
        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">24h High</span>
          <span className="text-[10px] text-[#f5f5f5] tabular-nums">{stats.high24h}</span>
        </div>

        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">24h Low</span>
          <span className="text-[10px] text-[#f5f5f5] tabular-nums">{stats.low24h}</span>
        </div>

        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">24h Vol</span>
          <span className="text-[10px] text-[#f5f5f5] tabular-nums">{stats.volume24h}</span>
        </div>

        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">Vol(USDT)</span>
          <span className="text-[10px] text-[#f5f5f5] tabular-nums">{stats.quoteVolume24h}</span>
        </div>

        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">Funding</span>
          <span className="text-[10px] text-[#26a69a] tabular-nums">0.0100%</span>
        </div>

        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">Next</span>
          <span className="text-[10px] text-[#f5f5f5] tabular-nums">02:15:32</span>
        </div>

        <div className="flex flex-col gap-0 min-w-fit">
          <span className="text-[9px] text-[#6b6b6b]">OI</span>
          <span className="text-[10px] text-[#f5f5f5] tabular-nums">4.52B</span>
        </div>
      </div>
    </div>
  );
}
