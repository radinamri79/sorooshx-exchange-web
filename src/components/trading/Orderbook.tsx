'use client';

import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { useOrderbookStore } from '@/stores/useOrderbookStore';
import { binanceWS } from '@/services/websocket';
import { fetchOrderbook } from '@/services/api';
import type { OrderbookEntry } from '@/types';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';

// ============================================================================
// BITUNIX-STYLE ORDERBOOK COMPONENT
// Professional trading interface with real-time updates
// ============================================================================

interface OrderbookProps {
  className?: string;
  maxRows?: number;
}

type DisplayMode = 'both' | 'buyOnly' | 'sellOnly';
type DecimalPrecision = '0.1' | '0.01' | '1' | '10';

interface OrderbookRowProps {
  entry: OrderbookEntry;
  cumulativeSum: number;
  maxSum: number;
  isBid: boolean;
  isFlashing?: boolean;
  flashDirection?: 'up' | 'down';
  onClick?: (price: string) => void;
  precision: DecimalPrecision;
}

// Format number with precision
function formatWithPrecision(value: number | string, decimals: number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function OrderbookRow({ 
  entry, 
  cumulativeSum,
  maxSum, 
  isBid, 
  isFlashing,
  flashDirection,
  onClick,
  precision 
}: OrderbookRowProps) {
  const [price, quantity] = entry;
  const depthPercentage = maxSum > 0 ? (cumulativeSum / maxSum) * 100 : 0;
  
  // Determine decimal places based on precision
  const priceDecimals = precision === '10' ? 0 : precision === '1' ? 0 : precision === '0.1' ? 1 : 2;
  const qtyDecimals = 4;
  const sumDecimals = 4;

  // Colors - Bitunix style
  const priceColor = isBid ? '#0D9D5F' : '#C8102E';
  const depthColor = isBid ? 'rgba(13, 157, 95, 0.12)' : 'rgba(200, 16, 46, 0.12)';
  const flashClass = isFlashing 
    ? flashDirection === 'up' 
      ? 'animate-flash-green' 
      : 'animate-flash-red'
    : '';

  return (
    <div
      onClick={() => onClick?.(price)}
      className={cn(
        'grid grid-cols-3 gap-1 px-2 py-[3px] text-[11px] cursor-pointer relative w-full',
        'transition-colors duration-75 hover:bg-[#1E2329]',
        'tabular-nums tracking-tight',
        flashClass
      )}
      style={{ fontFamily: "'DIN Pro', 'Roboto Mono', 'SF Mono', 'Consolas', monospace" }}
    >
      {/* Depth bar - fills from RIGHT for both bids and asks like Bitunix */}
      <div
        className="absolute top-0 bottom-0 right-0 transition-all duration-200 pointer-events-none"
        style={{
          backgroundColor: depthColor,
          width: `${Math.min(depthPercentage, 100)}%`,
        }}
      />
      
      {/* Price */}
      <span 
        className="relative z-10 font-medium"
        style={{ color: priceColor }}
      >
        {formatWithPrecision(price, priceDecimals)}
      </span>
      
      {/* Quantity */}
      <span className="relative z-10 text-right text-[#EAECEF]">
        {formatWithPrecision(quantity, qtyDecimals)}
      </span>
      
      {/* Cumulative Sum */}
      <span className="relative z-10 text-right text-[#848E9C]">
        {formatWithPrecision(cumulativeSum, sumDecimals)}
      </span>
    </div>
  );
}

export function Orderbook({ className, maxRows = 10 }: OrderbookProps) {
  const { currentSymbol, tickers } = useMarketStore();
  const { bids, asks, lastUpdateId, setOrderbook, mergeOrderbook, reset } = useOrderbookStore();
  
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
  const [precision, setPrecision] = useState<DecimalPrecision>('0.1');
  const [showPrecisionDropdown, setShowPrecisionDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>('orderbook');
  const [flashingPrices, setFlashingPrices] = useState<Map<string, 'up' | 'down'>>(new Map());
  
  const snapshotFetchedRef = useRef(false);
  const symbolRef = useRef(currentSymbol);
  const prevBidsRef = useRef<OrderbookEntry[]>([]);
  const prevAsksRef = useRef<OrderbookEntry[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTicker = tickers[currentSymbol];
  const lastPrice = currentTicker ? parseFloat(currentTicker.c) : 0;
  const prevClose = currentTicker ? parseFloat(currentTicker.p || currentTicker.c) : lastPrice;
  const priceDirection = lastPrice >= prevClose ? 'up' : 'down';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPrecisionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load initial orderbook snapshot
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

  // Subscribe to WebSocket updates
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

  // Detect price changes for flash animation
  useEffect(() => {
    const newFlashing = new Map<string, 'up' | 'down'>();
    
    // Check bids for changes
    bids.forEach(([price, qty]) => {
      const prevBid = prevBidsRef.current.find(([p]) => p === price);
      if (prevBid) {
        const prevQty = parseFloat(prevBid[1]);
        const newQty = parseFloat(qty);
        if (newQty > prevQty) {
          newFlashing.set(price, 'up');
        } else if (newQty < prevQty) {
          newFlashing.set(price, 'down');
        }
      }
    });

    // Check asks for changes
    asks.forEach(([price, qty]) => {
      const prevAsk = prevAsksRef.current.find(([p]) => p === price);
      if (prevAsk) {
        const prevQty = parseFloat(prevAsk[1]);
        const newQty = parseFloat(qty);
        if (newQty > prevQty) {
          newFlashing.set(price, 'up');
        } else if (newQty < prevQty) {
          newFlashing.set(price, 'down');
        }
      }
    });

    if (newFlashing.size > 0) {
      setFlashingPrices(newFlashing);
      // Clear flash after animation
      setTimeout(() => setFlashingPrices(new Map()), 300);
    }

    prevBidsRef.current = [...bids];
    prevAsksRef.current = [...asks];
  }, [bids, asks]);

  // Process orderbook data with cumulative sums
  const { displayedBids, displayedAsks, maxSum, buyPercentage, sellPercentage } = useMemo(() => {
    const rowCount = displayMode === 'both' ? maxRows : maxRows * 2;
    
    const slicedBids = displayMode === 'sellOnly' ? [] : bids.slice(0, rowCount);
    const slicedAsks = displayMode === 'buyOnly' ? [] : asks.slice(0, rowCount);

    // Calculate cumulative sums for depth visualization
    let bidSum = 0;
    const displayedBids = slicedBids.map(([price, qty]) => {
      bidSum += parseFloat(qty);
      return { entry: [price, qty] as OrderbookEntry, cumSum: bidSum };
    });

    let askSum = 0;
    // For asks, we want to show cumulative from best ask (lowest price)
    const asksWithSum = slicedAsks.map(([price, qty]) => {
      askSum += parseFloat(qty);
      return { entry: [price, qty] as OrderbookEntry, cumSum: askSum };
    });
    // Reverse for display (highest price at top)
    const displayedAsks = [...asksWithSum].reverse();

    const maxSum = Math.max(bidSum, askSum);

    // Calculate buy/sell percentages based on total volume
    const totalBidVolume = slicedBids.reduce((sum, [, q]) => sum + parseFloat(q), 0);
    const totalAskVolume = slicedAsks.reduce((sum, [, q]) => sum + parseFloat(q), 0);
    const total = totalBidVolume + totalAskVolume;
    const buyPercentage = total > 0 ? ((totalBidVolume / total) * 100).toFixed(2) : '50.00';
    const sellPercentage = total > 0 ? ((totalAskVolume / total) * 100).toFixed(2) : '50.00';

    return { displayedBids, displayedAsks, maxSum, buyPercentage, sellPercentage };
  }, [bids, asks, maxRows, displayMode]);

  const handlePriceClick = useCallback((price: string) => {
    // TODO: Dispatch to order form
    console.log('Price clicked:', price);
  }, []);

  const precisionOptions: DecimalPrecision[] = ['0.01', '0.1', '1', '10'];

  return (
    <div className={cn(
      'flex flex-col bg-[#0B0E11] overflow-hidden',
      'border-0 rounded-none',
      className
    )}>
      {/* Header - Tabs + Controls */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#1E2329]">
        {/* Tabs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('orderbook')}
            className={cn(
              'text-xs font-medium pb-1 border-b-2 transition-colors',
              activeTab === 'orderbook'
                ? 'text-[#EAECEF] border-[#FF7A00]'
                : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
            )}
          >
            Orderbook
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={cn(
              'text-xs font-medium pb-1 border-b-2 transition-colors',
              activeTab === 'trades'
                ? 'text-[#EAECEF] border-[#FF7A00]'
                : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
            )}
          >
            Trades
          </button>
        </div>

        {/* Controls - Bitunix Style */}
        <div className="flex items-center gap-1.5">
          {/* Display Mode Icons - Exact Bitunix Style */}
          <button
            onClick={() => setDisplayMode('both')}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all',
              displayMode === 'both' ? 'bg-[#2B3139]' : 'hover:bg-[#1E2329]'
            )}
            title="Buy and Sell"
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-[2px]">
              <div className="bg-[#C8102E] rounded-[2px]" />
              <div className="bg-[#C8102E] rounded-[2px]" />
              <div className="bg-[#0D9D5F] rounded-[2px]" />
              <div className="bg-[#0D9D5F] rounded-[2px]" />
            </div>
          </button>

          <button
            onClick={() => setDisplayMode('buyOnly')}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all',
              displayMode === 'buyOnly' ? 'bg-[#2B3139]' : 'hover:bg-[#1E2329]'
            )}
            title="Buy Only"
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-[2px]">
              <div className="bg-[#0D9D5F] rounded-[2px]" />
              <div className="bg-[#0D9D5F] rounded-[2px]" />
              <div className="bg-[#0D9D5F] rounded-[2px]" />
              <div className="bg-[#0D9D5F] rounded-[2px]" />
            </div>
          </button>

          <button
            onClick={() => setDisplayMode('sellOnly')}
            className={cn(
              'w-6 h-6 rounded flex items-center justify-center transition-all',
              displayMode === 'sellOnly' ? 'bg-[#2B3139]' : 'hover:bg-[#1E2329]'
            )}
            title="Sell Only"
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-[2px]">
              <div className="bg-[#C8102E] rounded-[2px]" />
              <div className="bg-[#C8102E] rounded-[2px]" />
              <div className="bg-[#C8102E] rounded-[2px]" />
              <div className="bg-[#C8102E] rounded-[2px]" />
            </div>
          </button>

          {/* Precision Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowPrecisionDropdown(!showPrecisionDropdown)}
              className="flex items-center gap-0.5 px-2 py-1 text-[11px] text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#1E2329] rounded transition-colors font-mono"
            >
              {precision}
              <ChevronDown size={12} />
            </button>
            
            {showPrecisionDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-[#1E2329] border border-[#2B3139] rounded shadow-lg z-50 min-w-[50px]">
                {precisionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setPrecision(opt);
                      setShowPrecisionDropdown(false);
                    }}
                    className={cn(
                      'w-full px-2 py-1 text-[10px] text-left font-mono transition-colors',
                      precision === opt
                        ? 'text-[#FF7A00] bg-[#2B3139]'
                        : 'text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139]'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings Icon */}
          <button
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#EAECEF]"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[10px] text-[#5E6673] font-medium border-b border-[#1E2329]">
        <span>Price (USDT)</span>
        <span className="text-right">Qty. (BTC)</span>
        <span className="text-right">Sum (BTC)</span>
      </div>

      {/* Orderbook Content */}
      {activeTab === 'orderbook' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Asks (Sell Orders) - Top Section */}
          {(displayMode === 'both' || displayMode === 'sellOnly') && (
            <div className={cn(
              'overflow-y-auto overflow-x-hidden scrollbar-none',
              displayMode === 'both' ? 'flex-1' : 'flex-1'
            )}>
              <div className="flex flex-col">
                {displayedAsks.map(({ entry, cumSum }, index) => (
                  <OrderbookRow
                    key={`ask-${entry[0]}-${index}`}
                    entry={entry}
                    cumulativeSum={cumSum}
                    maxSum={maxSum}
                    isBid={false}
                    isFlashing={flashingPrices.has(entry[0])}
                    flashDirection={flashingPrices.get(entry[0])}
                    onClick={handlePriceClick}
                    precision={precision}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Current Price - Center Separator */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-[#0B0E11] border-y border-[#1E2329]">
            <div className="flex items-center gap-1">
              <span 
                className="text-base font-bold tabular-nums"
                style={{ 
                  color: priceDirection === 'up' ? '#0D9D5F' : '#C8102E',
                  fontFamily: "'DIN Pro', 'Roboto Mono', 'SF Mono', 'Consolas', monospace"
                }}
              >
                {formatWithPrecision(lastPrice, precision === '10' ? 0 : precision === '1' ? 0 : precision === '0.1' ? 1 : 2)}
              </span>
              {priceDirection === 'up' ? (
                <ChevronUp size={14} className="text-[#0D9D5F]" />
              ) : (
                <ChevronDown size={14} className="text-[#C8102E]" />
              )}
            </div>
            <span 
              className="text-[10px] text-[#5E6673] tabular-nums"
              style={{ fontFamily: "'DIN Pro', 'Roboto Mono', 'SF Mono', 'Consolas', monospace" }}
            >
              <span className="text-[#848E9C]">M</span> {formatWithPrecision(lastPrice, precision === '10' ? 0 : precision === '1' ? 0 : precision === '0.1' ? 1 : 2)}
            </span>
          </div>

          {/* Bids (Buy Orders) - Bottom Section */}
          {(displayMode === 'both' || displayMode === 'buyOnly') && (
            <div className={cn(
              'overflow-y-auto overflow-x-hidden scrollbar-none',
              displayMode === 'both' ? 'flex-1' : 'flex-1'
            )}>
              <div className="flex flex-col">
                {displayedBids.map(({ entry, cumSum }, index) => (
                  <OrderbookRow
                    key={`bid-${entry[0]}-${index}`}
                    entry={entry}
                    cumulativeSum={cumSum}
                    maxSum={maxSum}
                    isBid={true}
                    isFlashing={flashingPrices.has(entry[0])}
                    flashDirection={flashingPrices.get(entry[0])}
                    onClick={handlePriceClick}
                    precision={precision}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Trades tab placeholder
        <div className="flex-1 flex items-center justify-center text-[#5E6673] text-xs">
          Trades coming soon
        </div>
      )}

      {/* Footer - Buy/Sell Ratio Bar - Bitunix Style */}
      <div 
        className="flex items-center justify-between px-2 py-1.5 border-t border-[#1E2329] bg-[#0B0E11]"
        style={{ fontFamily: "'DIN Pro', 'Roboto Mono', 'SF Mono', 'Consolas', monospace" }}
      >
        {/* Buy Percentage */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="px-1 py-0.5 bg-[#0D9D5F]/20 text-[#0D9D5F] rounded text-[10px] font-medium">B</span>
          <span className="text-[#0D9D5F]">{buyPercentage}%</span>
        </div>

        {/* Ratio Bar */}
        <div className="flex-1 h-1.5 mx-3 bg-[#1E2329] rounded overflow-hidden flex">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${buyPercentage}%`,
              backgroundColor: '#0D9D5F'
            }} 
          />
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${sellPercentage}%`,
              backgroundColor: '#C8102E'
            }} 
          />
        </div>
        
        {/* Sell Percentage */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-[#C8102E]">{sellPercentage}%</span>
          <span className="px-1 py-0.5 bg-[#C8102E]/20 text-[#C8102E] rounded text-[10px] font-medium">S</span>
        </div>
      </div>

      {/* Custom CSS for flash animations */}
      <style jsx global>{`
        @keyframes flashGreen {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(13, 157, 95, 0.3); }
        }
        @keyframes flashRed {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(200, 16, 46, 0.3); }
        }
        .animate-flash-green {
          animation: flashGreen 0.3s ease-out;
        }
        .animate-flash-red {
          animation: flashRed 0.3s ease-out;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
