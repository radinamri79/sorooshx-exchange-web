'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown } from 'lucide-react';
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

  const PriceChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 md:gap-6 bg-background-secondary border-b border-border px-4 py-3',
        className
      )}
    >
      {/* Current Price */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-muted">{t('marketInfo.lastPrice')}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xl font-semibold tabular-nums',
              isPositive ? 'text-trading-long' : 'text-trading-short'
            )}
          >
            {stats.lastPrice}
          </span>
          <span className="text-sm text-text-secondary">USDT</span>
        </div>
      </div>

      {/* 24h Change */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-muted">{t('marketInfo.change24h')}</span>
        <div className="flex items-center gap-1">
          <PriceChangeIcon
            className={cn(
              'w-4 h-4',
              isPositive ? 'text-trading-long' : 'text-trading-short'
            )}
          />
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              isPositive ? 'text-trading-long' : 'text-trading-short'
            )}
          >
            {stats.priceChange} ({stats.priceChangePercent})
          </span>
        </div>
      </div>

      {/* 24h High */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-muted">{t('marketInfo.high24h')}</span>
        <span className="text-sm text-text-primary tabular-nums">{stats.high24h}</span>
      </div>

      {/* 24h Low */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-muted">{t('marketInfo.low24h')}</span>
        <span className="text-sm text-text-primary tabular-nums">{stats.low24h}</span>
      </div>

      {/* 24h Volume */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-muted">{t('marketInfo.volume24h')}</span>
        <span className="text-sm text-text-primary tabular-nums">
          {stats.volume24h} <span className="text-text-muted">{currentSymbol.replace('USDT', '')}</span>
        </span>
      </div>

      {/* 24h Turnover */}
      <div className="flex flex-col gap-0.5 hidden md:flex">
        <span className="text-xs text-text-muted">{t('marketInfo.turnover24h')}</span>
        <span className="text-sm text-text-primary tabular-nums">
          {stats.quoteVolume24h} <span className="text-text-muted">USDT</span>
        </span>
      </div>
    </div>
  );
}
