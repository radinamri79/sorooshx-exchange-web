'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPrice, formatNumber } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { useOrderbookStore } from '@/stores/useOrderbookStore';
import { binanceWS } from '@/services/websocket';
import { fetchOrderbook } from '@/services/api';
import type { OrderbookEntry } from '@/types';
import * as React from 'react';

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
      className="grid grid-cols-3 gap-2 px-2 py-[3px] text-xs tabular-nums hover:bg-[#1a1a1a] transition-colors relative w-full text-left focus:outline-none"
    >
      {/* Depth bar background */}
      <div
        className={cn(
          'absolute top-0 bottom-0 opacity-15',
          isBid ? 'bg-[#26a69a] right-0' : 'bg-[#ef5350] left-0'
        )}
        style={{
          width: `${Math.min(depthPercentage, 100)}%`,
          [isBid ? 'right' : 'left']: 0,
        }}
      />
      
      {/* Price */}
      <span className={cn('relative z-10 font-mono', isBid ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
        {formatPrice(price)}
      </span>
      
      {/* Quantity */}
      <span className="relative z-10 text-white text-right font-mono">
        {formatNumber(quantity, { decimals: 4 })}
      </span>
      
      {/* Total */}
      <span className="relative z-10 text-[#848e9c] text-right font-mono">
        {formatNumber(total, { decimals: 2 })}
      </span>
    </button>
  );
}

export function Orderbook({ className, maxRows = 15 }: OrderbookProps) {
  // Translation hook ready for future localization
  useTranslations('trading');
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
      if (!snapshotFetchedRef.current) return;
      if (depthData.U > lastUpdateId + 1) {
        snapshotFetchedRef.current = false;
        return;
      }
      if (depthData.u <= lastUpdateId) return;

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

  // Handle price click
  const handlePriceClick = useCallback((_price: string) => {
    // This would typically dispatch to order form
  }, []);

  return (
    <div className={cn('flex flex-col bg-black overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-[#1e2329]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Order book</span>
          <span className="text-sm text-[#848e9c]">Trade history</span>
        </div>
        
        {/* Display Mode Toggle */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setDisplayMode('both')}
            className={cn(
              'p-1 rounded transition-colors',
              displayMode === 'both' ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="5" rx="1" fill="#ef5350" />
              <rect x="1" y="8" width="12" height="5" rx="1" fill="#26a69a" />
            </svg>
          </button>
          <button
            onClick={() => setDisplayMode('bids')}
            className={cn(
              'p-1 rounded transition-colors',
              displayMode === 'bids' ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="1" fill="#26a69a" />
            </svg>
          </button>
          <button
            onClick={() => setDisplayMode('asks')}
            className={cn(
              'p-1 rounded transition-colors',
              displayMode === 'asks' ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="1" fill="#ef5350" />
            </svg>
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-2 py-1.5 text-[11px] text-[#848e9c] border-b border-[#1e2329]">
        <span>Price</span>
        <span className="text-right">Amount(BTC)</span>
        <span className="text-right">Total (BTC)</span>
      </div>

      {/* Asks (Sell Orders) - Reversed so lowest ask is at bottom */}
      {(displayMode === 'both' || displayMode === 'asks') && (
        <div className="flex flex-col-reverse overflow-hidden flex-1">
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
      <div className="flex items-center justify-between px-2 py-2 bg-black border-y border-[#1e2329]">
        <span className={cn(
          'text-lg font-semibold tabular-nums',
          isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
        )}>
          {formatPrice(lastPrice)}
        </span>
        <span className="text-xs text-[#848e9c]">
          Spread: {formatNumber(spread.value, { decimals: 2 })} ({formatNumber(spread.percent, { decimals: 3 })}%)
        </span>
      </div>

      {/* Bids (Buy Orders) */}
      {(displayMode === 'both' || displayMode === 'bids') && (
        <div className="flex flex-col overflow-hidden flex-1">
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

      {/* Bottom depth indicator */}
      <div className="flex items-center h-6 px-2 border-t border-[#1e2329]">
        <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#26a69a]" style={{ width: '72%' }} />
          <div className="h-full bg-[#ef5350]" style={{ width: '28%' }} />
        </div>
        <div className="flex items-center gap-2 ml-2 text-[10px]">
          <span className="text-[#26a69a]">72%</span>
          <span className="text-[#ef5350]">28%</span>
        </div>
      </div>
    </div>
  );
}
