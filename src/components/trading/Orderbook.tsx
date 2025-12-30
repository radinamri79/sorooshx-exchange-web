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
import { ArrowUp, ArrowDown, Settings2 } from 'lucide-react';

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
      className="grid grid-cols-3 gap-1 px-2 py-[2px] text-[10px] hover:bg-[#1e1f23] transition-colors relative w-full text-left focus:outline-none"
    >
      {/* Depth bar background */}
      <div
        className={cn(
          'absolute top-0 bottom-0 opacity-10',
          isBid ? 'bg-[#26a69a] right-0' : 'bg-[#ef5350] left-0'
        )}
        style={{
          width: `${Math.min(depthPercentage, 100)}%`,
          [isBid ? 'right' : 'left']: 0,
        }}
      />
      
      {/* Price */}
      <span className={cn('relative z-10 trading-font', isBid ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
        {formatPrice(price)}
      </span>
      
      {/* Quantity */}
      <span className="relative z-10 text-[#f5f5f5] text-right trading-font">
        {formatNumber(quantity, { decimals: 4 })}
      </span>
      
      {/* Total */}
      <span className="relative z-10 text-[#6b6b6b] text-right trading-font">
        {formatNumber(total, { decimals: 2 })}
      </span>
    </button>
  );
}

export function Orderbook({ className, maxRows = 15 }: OrderbookProps) {
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

  const handlePriceClick = useCallback((_price: string) => {
    // Dispatch to order form
  }, []);

  return (
    <div className={cn('flex flex-col bg-transparent overflow-hidden', className)}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2d]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#f5f5f5]">Order Book</span>
          <span className="text-xs text-[#6b6b6b] hover:text-[#a1a1a1] cursor-pointer">Trades</span>
        </div>
        
        {/* Display Mode Toggle */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setDisplayMode('both')}
            className={cn(
              'p-1 rounded transition-colors',
              displayMode === 'both' ? 'bg-[#17181b]' : 'hover:bg-[#17181b]'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="5" rx="1" fill="#ef5350" />
              <rect x="2" y="9" width="12" height="5" rx="1" fill="#26a69a" />
            </svg>
          </button>
          <button
            onClick={() => setDisplayMode('bids')}
            className={cn(
              'p-1 rounded transition-colors',
              displayMode === 'bids' ? 'bg-[#17181b]' : 'hover:bg-[#17181b]'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="#26a69a" />
            </svg>
          </button>
          <button
            onClick={() => setDisplayMode('asks')}
            className={cn(
              'p-1 rounded transition-colors',
              displayMode === 'asks' ? 'bg-[#17181b]' : 'hover:bg-[#17181b]'
            )}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="#ef5350" />
            </svg>
          </button>
          <button className="p-1 rounded hover:bg-[#17181b] transition-colors">
            <Settings2 className="w-3.5 h-3.5 text-[#6b6b6b]" />
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[9px] text-[#6b6b6b] border-b border-[#2a2a2d]">
        <span>Price(USDT)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sell Orders) */}
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

      {/* Current Price / Spread - Compact */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#17181b] border-y border-[#2a2a2d]">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm font-bold trading-font',
            isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
          )}>
            {formatPrice(lastPrice)}
          </span>
          {isPositive ? (
            <ArrowUp className="w-3 h-3 text-[#26a69a]" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#ef5350]" />
          )}
        </div>
        <span className="text-[9px] text-[#6b6b6b] trading-font">
          {formatNumber(spread.value, { decimals: 2 })} ({formatNumber(spread.percent, { decimals: 3 })}%)
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
      <div className="flex items-center h-5 px-2 border-t border-[#2a2a2d] bg-[#121214]">
        <div className="flex-1 h-0.5 bg-[#17181b] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#26a69a]" style={{ width: '72%' }} />
          <div className="h-full bg-[#ef5350]" style={{ width: '28%' }} />
        </div>
        <div className="flex items-center gap-2 ml-2 text-[9px] font-medium">
          <span className="text-[#26a69a]">B 72%</span>
          <span className="text-[#ef5350]">S 28%</span>
        </div>
      </div>
    </div>
  );
}
