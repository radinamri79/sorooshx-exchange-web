'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPrice, formatNumber, formatPercentage } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { binanceWS } from '@/services/websocket';
import type { BinanceTicker } from '@/types';

interface MarketInfoProps {
  className?: string;
}

export function MarketInfo({ className }: MarketInfoProps) {
  const t = useTranslations('trading');
  const { currentSymbol, tickers, setTicker } = useMarketStore();
  const tickerRef = useRef<BinanceTicker | null>(null);

  const ticker = tickers[currentSymbol] || null;
  tickerRef.current = ticker as BinanceTicker | null;

  // Subscribe to 24hr ticker stream for current symbol
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

  // Derived values
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
        'flex items-center bg-black border-b border-[#1e2329] px-4 py-2',
        className
      )}
    >
      {/* Symbol and Price */}
      <div className="flex items-center gap-6 mr-8">
        {/* Main Price */}
        <div className="flex flex-col">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums',
              isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}
          >
            {stats.lastPrice}
          </span>
          <span className={cn(
            'text-xs tabular-nums',
            isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
          )}>
            ≈${stats.lastPrice}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 overflow-x-auto">
        {/* 24h Change */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">24h Change</span>
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}
          >
            {isPositive ? '+' : ''}{stats.priceChangePercent}
          </span>
        </div>

        {/* 24h High */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">24h High</span>
          <span className="text-xs text-white tabular-nums">{stats.high24h}</span>
        </div>

        {/* 24h Low */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">24h Low</span>
          <span className="text-xs text-white tabular-nums">{stats.low24h}</span>
        </div>

        {/* 24h Volume (base) */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">24h Volume({currentSymbol.replace('USDT', '')})</span>
          <span className="text-xs text-white tabular-nums">{stats.volume24h}</span>
        </div>

        {/* 24h Volume (quote) */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">24h Volume(USDT)</span>
          <span className="text-xs text-white tabular-nums">{stats.quoteVolume24h}</span>
        </div>

        {/* Funding Rate */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">Funding / Countdown</span>
          <span className="text-xs text-[#26a69a] tabular-nums">0.0100% / 02:15:32</span>
        </div>

        {/* Open Interest */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[10px] text-[#5e6673]">Open Interest(USDT)</span>
          <span className="text-xs text-white tabular-nums">4,521,891,234</span>
        </div>
      </div>
    </div>
  );
}
