'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPrice, formatNumber } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { useOrderbookStore } from '@/stores/useOrderbookStore';
import { binanceWS } from '@/services/websocket';
import { fetchOrderbook } from '@/services/api';
import type { OrderbookEntry } from '@/types';

interface OrderbookProps {
  className?: string;
  maxRows?: number;
}

type DisplayMode = 'both' | 'bids' | 'asks';

interface OrderbookRowProps {
  entry: OrderbookEntry;
  maxTotal: number;
  isBid: boolean;
  onClick?: (price: string) => void;
}

function OrderbookRow({ entry, maxTotal, isBid, onClick }: OrderbookRowProps) {
  const [price, quantity] = entry;
  const total = parseFloat(price) * parseFloat(quantity);
  const depthPercentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <button
      type="button"
      onClick={() => onClick?.(price)}
      className={cn(
        'grid grid-cols-3 gap-2 px-2 py-0.5 text-xs tabular-nums hover:bg-background-tertiary transition-colors relative w-full text-left',
        'focus:outline-none focus:bg-background-tertiary'
      )}
    >
      {/* Depth bar background */}
      <div
        className={cn(
          'absolute top-0 bottom-0 opacity-20',
          isBid ? 'bg-trading-long right-0' : 'bg-trading-short left-0'
        )}
        style={{
          width: `${Math.min(depthPercentage, 100)}%`,
          [isBid ? 'right' : 'left']: 0,
        }}
      />
      
      {/* Price */}
      <span className={cn('relative z-10', isBid ? 'text-trading-long' : 'text-trading-short')}>
        {formatPrice(price)}
      </span>
      
      {/* Quantity */}
      <span className="relative z-10 text-text-primary text-right">
        {formatNumber(quantity, { decimals: 4 })}
      </span>
      
      {/* Total */}
      <span className="relative z-10 text-text-secondary text-right">
        {formatNumber(total, { decimals: 2 })}
      </span>
    </button>
  );
}

export function Orderbook({ className, maxRows = 15 }: OrderbookProps) {
  const t = useTranslations('trading');
  const { currentSymbol, tickers } = useMarketStore();
  const { bids, asks, lastUpdateId, setOrderbook, mergeOrderbook, reset } = useOrderbookStore();
  
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('both');
  const snapshotFetchedRef = useRef(false);
  const symbolRef = useRef(currentSymbol);

  const currentTicker = tickers[currentSymbol];
  const lastPrice = currentTicker ? currentTicker.c : '--';
  const priceChangePercent = currentTicker ? parseFloat(currentTicker.P) : 0;
  const isPositive = priceChangePercent >= 0;

  // Fetch initial orderbook snapshot
  useEffect(() => {
    const loadSnapshot = async () => {
      if (symbolRef.current !== currentSymbol) {
        snapshotFetchedRef.current = false;
        symbolRef.current = currentSymbol;
      }
      
      if (snapshotFetchedRef.current) return;
      
      try {
        reset();
        const data = await fetchOrderbook(currentSymbol, 100);
        setOrderbook(data);
        snapshotFetchedRef.current = true;
      } catch (error) {
        console.error('Failed to fetch orderbook:', error);
      }
    };

    loadSnapshot();
  }, [currentSymbol, setOrderbook, reset]);

  // Subscribe to depth updates
  useEffect(() => {
    const streamName = `${currentSymbol.toLowerCase()}@depth@100ms`;

    const handleDepthUpdate = (data: unknown) => {
      const depthData = data as {
        b: OrderbookEntry[];
        a: OrderbookEntry[];
        u: number;
        U: number;
        pu: number;
      };
      // Only process if we have snapshot and this is a valid update
      if (!snapshotFetchedRef.current) return;
      if (depthData.U > lastUpdateId + 1) {
        // Missing updates, refetch snapshot
        snapshotFetchedRef.current = false;
        return;
      }
      if (depthData.u <= lastUpdateId) return; // Already processed

      mergeOrderbook(depthData.b, depthData.a, depthData.u);
    };

    binanceWS.subscribe(streamName, handleDepthUpdate);

    return () => {
      binanceWS.unsubscribe(streamName, handleDepthUpdate);
    };
  }, [currentSymbol, lastUpdateId, mergeOrderbook]);

  // Calculate displayed bids and asks
  const { displayedBids, displayedAsks, maxTotal } = useMemo(() => {
    const rowCount = displayMode === 'both' ? maxRows : maxRows * 2;
    
    const displayedBids = bids.slice(0, rowCount);
    const displayedAsks = asks.slice(0, rowCount);

    // Calculate max total for depth visualization
    let maxTotal = 0;
    [...displayedBids, ...displayedAsks].forEach(([price, quantity]) => {
      const total = parseFloat(price) * parseFloat(quantity);
      if (total > maxTotal) maxTotal = total;
    });

    return { displayedBids, displayedAsks, maxTotal };
  }, [bids, asks, maxRows, displayMode]);

  // Calculate spread
  const spread = useMemo(() => {
    if (asks.length === 0 || bids.length === 0) return { value: 0, percent: 0 };
    
    const bestAskEntry = asks[0];
    const bestBidEntry = bids[0];
    if (!bestAskEntry || !bestBidEntry) return { value: 0, percent: 0 };
    
    const bestAsk = parseFloat(bestAskEntry[0]);
    const bestBid = parseFloat(bestBidEntry[0]);
    const spreadValue = bestAsk - bestBid;
    const spreadPercent = (spreadValue / bestAsk) * 100;
    
    return { value: spreadValue, percent: spreadPercent };
  }, [asks, bids]);

  // Handle price click to fill order form
  const handlePriceClick = useCallback((_price: string) => {
    // This would typically dispatch to order form
    // Could emit an event or update a store
  }, []);

  return (
    <div className={cn('flex flex-col bg-background-secondary rounded-lg border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">{t('orderbook.title')}</h3>
        
        {/* Display Mode Toggle */}
        <div className="flex items-center gap-0.5 bg-background-tertiary rounded p-0.5">
          <button
            onClick={() => setDisplayMode('both')}
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              displayMode === 'both'
                ? 'bg-background-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="0" width="12" height="5" className="fill-trading-short" />
              <rect x="0" y="7" width="12" height="5" className="fill-trading-long" />
            </svg>
          </button>
          <button
            onClick={() => setDisplayMode('bids')}
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              displayMode === 'bids'
                ? 'bg-background-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="0" width="12" height="12" className="fill-trading-long" />
            </svg>
          </button>
          <button
            onClick={() => setDisplayMode('asks')}
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              displayMode === 'asks'
                ? 'bg-background-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="0" width="12" height="12" className="fill-trading-short" />
            </svg>
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-2 py-1 text-xs text-text-muted border-b border-border">
        <span>{t('orderbook.price')}</span>
        <span className="text-right">{t('orderbook.amount')}</span>
        <span className="text-right">{t('orderbook.total')}</span>
      </div>

      {/* Asks (Sell Orders) - Reversed so lowest ask is at bottom */}
      {(displayMode === 'both' || displayMode === 'asks') && (
        <div className="flex flex-col-reverse overflow-hidden">
          {displayedAsks.map((entry, index) => (
            <OrderbookRow
              key={`ask-${entry[0]}-${index}`}
              entry={entry}
              maxTotal={maxTotal}
              isBid={false}
              onClick={handlePriceClick}
            />
          ))}
        </div>
      )}

      {/* Current Price / Spread */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-background-tertiary border-y border-border">
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          isPositive ? 'text-trading-long' : 'text-trading-short'
        )}>
          {formatPrice(lastPrice)}
        </span>
        <span className="text-xs text-text-muted">
          {t('orderbook.spread')}: {formatNumber(spread.value, { decimals: 2 })} ({formatNumber(spread.percent, { decimals: 3 })}%)
        </span>
      </div>

      {/* Bids (Buy Orders) */}
      {(displayMode === 'both' || displayMode === 'bids') && (
        <div className="flex flex-col overflow-hidden">
          {displayedBids.map((entry, index) => (
            <OrderbookRow
              key={`bid-${entry[0]}-${index}`}
              entry={entry}
              maxTotal={maxTotal}
              isBid={true}
              onClick={handlePriceClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Need to import React for useState
import * as React from 'react';
