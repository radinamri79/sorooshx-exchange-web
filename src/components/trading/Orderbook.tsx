'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { useOrderbookStore } from '@/stores/useOrderbookStore';
import { binanceWS } from '@/services/websocket';
import { fetchOrderbook } from '@/services/api';
import type { OrderbookEntry } from '@/types';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface OrderbookProps {
  className?: string;
  maxRows?: number;
}

type DisplayMode = 'both' | 'buyOnly' | 'sellOnly';

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

  const color = isBid ? '#0D9D5F' : '#C8102E';
  const bgColor = isBid ? 'rgba(13, 157, 95, 0.15)' : 'rgba(200, 16, 46, 0.15)';

  return (
    <button
      type="button"
      onClick={() => onClick?.(price)}
      className="grid grid-cols-3 gap-2 px-3 py-[6px] text-xs hover:brightness-110 transition-all duration-150 relative w-full text-left focus:outline-none font-mono"
    >
      {/* Depth bar background - fills from right for bids, left for asks */}
      <div
        className="absolute top-0 bottom-0 transition-all duration-300"
        style={{
          backgroundColor: bgColor,
          width: `${Math.min(depthPercentage, 100)}%`,
          [isBid ? 'right' : 'left']: 0,
        }}
      />
      
      {/* Price */}
      <span className="relative z-10 font-bold" style={{ color }}>
        {parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </span>
      
      {/* Quantity */}
      <span className="relative z-10 text-right text-[#EAECEF]">
        {parseFloat(quantity).toFixed(4)}
      </span>
      
      {/* Total */}
      <span className="relative z-10 text-right text-[#848E9C]">
        {total.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
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

  const { displayedBids, displayedAsks, maxTotal, buyPercentage, sellPercentage } = useMemo(() => {
    const rowCount = displayMode === 'both' ? maxRows : maxRows * 2;
    
    const displayedBids = displayMode === 'sellOnly' ? [] : bids.slice(0, rowCount);
    const displayedAsks = displayMode === 'buyOnly' ? [] : asks.slice(0, rowCount);

    let maxTotal = 0;
    [...displayedBids, ...displayedAsks].forEach(([price, quantity]) => {
      const total = parseFloat(price) * parseFloat(quantity);
      if (total > maxTotal) maxTotal = total;
    });

    // Calculate buy/sell percentages
    const totalBidVolume = displayedBids.reduce((sum, [p, q]) => sum + (parseFloat(p) * parseFloat(q)), 0);
    const totalAskVolume = displayedAsks.reduce((sum, [p, q]) => sum + (parseFloat(p) * parseFloat(q)), 0);
    const total = totalBidVolume + totalAskVolume;
    const buyPercentage = total > 0 ? ((totalBidVolume / total) * 100).toFixed(2) : '0.00';
    const sellPercentage = total > 0 ? ((totalAskVolume / total) * 100).toFixed(2) : '0.00';

    return { displayedBids, displayedAsks, maxTotal, buyPercentage, sellPercentage };
  }, [bids, asks, maxRows, displayMode]);

  const handlePriceClick = useCallback((_price: string) => {
    // Dispatch to order form
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-[#0B0E11] border border-[#2B3139] rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2B3139]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[#EAECEF]">Orderbook</h3>
          <button className="text-xs text-[#848E9C] hover:text-[#EAECEF] transition-colors">Trades</button>
        </div>
        
        {/* Display Mode Toggle - 3 Icons */}
        <div className="flex items-center gap-1.5">
          {/* Both Buy & Sell */}
          <button
            onClick={() => setDisplayMode('both')}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all duration-200',
              displayMode === 'both' ? 'bg-[#1E2329] ring-1 ring-[#3D4450]' : 'hover:bg-[#1E2329]'
            )}
            title="Buy and Sell"
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
              <div className="bg-[#C8102E] rounded-sm" />
              <div className="bg-[#C8102E] rounded-sm" />
              <div className="bg-[#0D9D5F] rounded-sm" />
              <div className="bg-[#0D9D5F] rounded-sm" />
            </div>
          </button>

          {/* Buy Only */}
          <button
            onClick={() => setDisplayMode('buyOnly')}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all duration-200',
              displayMode === 'buyOnly' ? 'bg-[#1E2329] ring-1 ring-[#3D4450]' : 'hover:bg-[#1E2329]'
            )}
            title="Only Buy"
          >
            <div className="w-4 h-4 bg-[#0D9D5F] rounded-sm" />
          </button>

          {/* Sell Only */}
          <button
            onClick={() => setDisplayMode('sellOnly')}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all duration-200',
              displayMode === 'sellOnly' ? 'bg-[#1E2329] ring-1 ring-[#3D4450]' : 'hover:bg-[#1E2329]'
            )}
            title="Only Sell"
          >
            <div className="w-4 h-4 bg-[#C8102E] rounded-sm" />
          </button>

          {/* Hamburger Menu */}
          <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#EAECEF]">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V5zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 15a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-[10px] text-[#848E9C] border-b border-[#2B3139]">
        <span>Price (USDT)</span>
        <span className="text-right">Qty. (BTC)</span>
        <span className="text-right">Sum (BTC)</span>
      </div>

      {/* Asks (Sell Orders) - Top Section */}
      {(displayMode === 'both' || displayMode === 'sellOnly') && (
        <div className="flex flex-col-reverse flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2B3139] scrollbar-track-[#0B0E11]">
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

      {/* Current Price - Center */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0B0E11] border-y border-[#2B3139]">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono" style={{ color: '#C8102E' }}>
            {parseFloat(lastPrice).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <ChevronDown size={16} className="text-[#C8102E]" />
        </div>
        <span className="text-xs text-[#848E9C] font-mono">M {parseFloat(lastPrice).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      </div>

      {/* Bids (Buy Orders) - Bottom Section */}
      {(displayMode === 'both' || displayMode === 'buyOnly') && (
        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2B3139] scrollbar-track-[#0B0E11]">
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

      {/* Footer - Buy/Sell Ratio */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#2B3139] bg-[#0B0E11]">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span style={{ color: '#0D9D5F' }}>B {buyPercentage}%</span>
          <span style={{ color: '#C8102E' }}>S {sellPercentage}%</span>
        </div>
      </div>
    </div>
  );
}
