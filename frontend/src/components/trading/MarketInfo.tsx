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
  // Translation hook ready for future localization
  useTranslations('trading');
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
        'flex items-center gap-6 px-0 py-0 bg-transparent border-0',
        className
      )}
    >
      {/* Symbol and Price */}
      <div className="flex items-center gap-3 min-w-fit">
        {/* Main Price */}
        <div className="flex flex-col gap-0">
          <span
            className={cn(
              'text-base font-bold tabular-nums',
              isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}
          >
            {stats.lastPrice}
          </span>
          <span className={cn(
            'text-[10px] tabular-nums',
            isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
          )}>
            {isPositive ? '+' : ''}{stats.priceChangePercent}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-[#1e2329]" />

      {/* Compact Stats - All in one row */}
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* 24h High */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[9px] text-[#5e6673]">24h high</span>
          <span className="text-xs text-white tabular-nums font-medium">{stats.high24h}</span>
        </div>

        {/* 24h Low */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[9px] text-[#5e6673]">24h low</span>
          <span className="text-xs text-white tabular-nums font-medium">{stats.low24h}</span>
        </div>

        {/* 24h Volume (base) */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[9px] text-[#5e6673]">24h Volume({currentSymbol.replace('USDT', '')})</span>
          <span className="text-xs text-white tabular-nums font-medium">{stats.volume24h}</span>
        </div>

        {/* 24h Volume (quote) */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[9px] text-[#5e6673]">24h Volume(USDT)</span>
          <span className="text-xs text-white tabular-nums font-medium">{stats.quoteVolume24h}</span>
        </div>

        {/* Funding Rate */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[9px] text-[#5e6673]">Funding / Countdown</span>
          <span className="text-xs text-[#26a69a] tabular-nums font-medium">0.0100% / 02:15:32</span>
        </div>

        {/* Open Interest */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <span className="text-[9px] text-[#5e6673]">Open Interest(USDT)</span>
          <span className="text-xs text-white tabular-nums font-medium">4,521,891,234</span>
        </div>
      </div>
    </div>
  );
}
