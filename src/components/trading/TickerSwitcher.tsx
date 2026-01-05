'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Star,
  ChevronDown,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn, formatPrice, formatPercentage } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { binanceWS } from '@/services/websocket';
import { fetchAllTickers } from '@/services/api';
import type { BinanceTicker } from '@/types';

type Category = 'all' | 'favorites' | 'btc' | 'eth' | 'altcoins';

interface TickerSwitcherProps {
  className?: string;
}

const CATEGORIES: { id: Category; labelKey: string }[] = [
  { id: 'favorites', labelKey: 'favorites' },
  { id: 'all', labelKey: 'all' },
  { id: 'btc', labelKey: 'btc' },
  { id: 'eth', labelKey: 'eth' },
  { id: 'altcoins', labelKey: 'altcoins' },
];

// Popular trading pairs to show at top
const POPULAR_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
];

export function TickerSwitcher({ className }: TickerSwitcherProps) {
  const t = useTranslations('trading.tickerSwitcher');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    currentSymbol,
    setCurrentSymbol,
    tickers,
    setTicker,
    favorites,
    toggleFavorite,
  } = useMarketStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all tickers on mount
  useEffect(() => {
    const loadTickers = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAllTickers();
        const symbols = data
          .filter((t) => t.symbol.endsWith('USDT'))
          .map((t) => t.symbol);
        setAllSymbols(symbols);

        // Update tickers in store
        data.forEach((t) => {
          if (t.symbol.endsWith('USDT')) {
            setTicker(t.symbol, {
              s: t.symbol,
              c: t.lastPrice,
              p: t.priceChange,
              P: t.priceChangePercent,
              h: t.highPrice,
              l: t.lowPrice,
              v: t.volume,
              q: t.quoteVolume,
            });
          }
        });
      } catch (error) {
        console.error('Failed to fetch tickers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickers();
  }, [setTicker]);

  // Subscribe to mini ticker stream for all symbols when dialog is open
  useEffect(() => {
    if (!isOpen) return;

    const streamName = '!miniTicker@arr';

    const handleTickerArray = (data: unknown) => {
      // Handle both array (real Binance) and single object (mock data)
      const tickerArray = Array.isArray(data) ? data : [data];
      const tickers = tickerArray as BinanceTicker[];
      tickers.forEach((ticker) => {
        if (ticker?.s?.endsWith('USDT')) {
          setTicker(ticker.s, ticker);
        }
      });
    };

    binanceWS.subscribe(streamName, handleTickerArray);

    return () => {
      binanceWS.unsubscribe(streamName, handleTickerArray);
    };
  }, [isOpen, setTicker]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Filter symbols based on search and category
  const filteredSymbols = useMemo(() => {
    let symbols = allSymbols;

    // Apply category filter
    switch (selectedCategory) {
      case 'favorites':
        symbols = symbols.filter((s) => favorites.includes(s));
        break;
      case 'btc':
        symbols = symbols.filter((s) => s.includes('BTC'));
        break;
      case 'eth':
        symbols = symbols.filter((s) => s.includes('ETH'));
        break;
      case 'altcoins':
        symbols = symbols.filter(
          (s) => !s.startsWith('BTC') && !s.startsWith('ETH')
        );
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toUpperCase();
      symbols = symbols.filter((s) => s.includes(query));
    }

    // Sort: favorites first, then popular, then alphabetically
    return symbols.sort((a, b) => {
      const aFav = favorites.includes(a);
      const bFav = favorites.includes(b);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      const aPopular = POPULAR_PAIRS.indexOf(a);
      const bPopular = POPULAR_PAIRS.indexOf(b);
      if (aPopular !== -1 && bPopular === -1) return -1;
      if (aPopular === -1 && bPopular !== -1) return 1;
      if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;

      return a.localeCompare(b);
    });
  }, [allSymbols, searchQuery, selectedCategory, favorites]);

  // Current ticker for the button display
  const currentTicker = tickers[currentSymbol];
  const isPositive = currentTicker && parseFloat(currentTicker.P) >= 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded bg-[#17181b] hover:bg-[#1e1f23] transition-colors border border-[#2a2a2d]',
          className,
          isOpen && 'bg-[#1e1f23] border-[#ed7620]'
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#f5f5f5] text-xs">
            {currentSymbol.replace('USDT', '')}/USDT
          </span>
          <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-[#ed7620]/10 text-[#ed7620]">
            Perp
          </span>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}
          >
            {currentTicker ? formatPercentage(currentTicker.P) : '--'}
          </span>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#6b6b6b] transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Blur Overlay */}
          <div 
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-96 max-h-[500px] flex flex-col bg-[#0B0E11] border border-[#2a2a2d] rounded-lg shadow-2xl z-50 overflow-hidden">
            {/* Search Input */}
            <div className="relative px-4 pt-4 pb-2 flex items-center">
              <Search className="absolute left-6 w-4 h-4 text-[#6b6b6b]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full h-9 pl-9 pr-9 rounded-lg border border-[#2a2a2d] bg-[#1E2329] text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ed7620] focus:border-transparent text-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 text-[#6b6b6b] hover:text-[#a1a1a1] p-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[#2a2a2d] overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap transition-all flex items-center gap-1 shrink-0',
                    selectedCategory === category.id
                      ? 'bg-[#ed7620] text-white'
                      : 'text-[#6b6b6b] hover:text-[#a1a1a1] hover:bg-[#1E2329]'
                  )}
                >
                  {category.id === 'favorites' && (
                    <Star className="w-3 h-3" />
                  )}
                  {category.id === 'favorites' ? 'Favorites' : 
                   category.id === 'all' ? 'All' :
                   category.id === 'btc' ? 'BTC' :
                   category.id === 'eth' ? 'ETH' : 'Altcoins'}
                </button>
              ))}
            </div>

            {/* Ticker List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ed7620]" />
                </div>
              ) : filteredSymbols.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-[#6b6b6b] py-4">
                  <Search className="w-8 h-8 mb-1 opacity-50" />
                  <p className="text-xs">{t('noResults')}</p>
                </div>
              ) : (
                filteredSymbols.slice(0, 100).map((symbol) => {
                  const ticker = tickers[symbol];
                  const isUp = ticker && parseFloat(ticker.P) >= 0;

                  return (
                    <div
                      key={symbol}
                      onClick={() => {
                        setCurrentSymbol(symbol);
                        setIsOpen(false);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCurrentSymbol(symbol);
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#1E2329] transition-colors border-b border-[#1E2329] last:border-b-0 cursor-pointer',
                        currentSymbol === symbol && 'bg-[#1E2329] border-l-2 border-l-[#ed7620]'
                      )}
                    >
                      {/* Symbol with Star */}
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(symbol);
                          }}
                          className="p-0.5 text-[#6b6b6b] hover:text-[#ed7620] transition-colors flex-shrink-0"
                        >
                          <Star
                            className="w-3.5 h-3.5"
                            fill={favorites.includes(symbol) ? '#ed7620' : 'none'}
                          />
                        </button>

                        {/* Symbol Name */}
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-[#f5f5f5] text-xs">
                            {symbol.replace('USDT', '')}
                          </span>
                          <span className="text-[10px] text-[#6b6b6b]">USDT</span>
                        </div>
                      </div>

                      {/* Price & Change */}
                      <div className="flex items-center justify-end gap-2 flex-shrink-0">
                        {/* Price */}
                        <span className="text-[#f5f5f5] tabular-nums text-xs font-medium">
                          {ticker ? formatPrice(ticker.c) : '--'}
                        </span>

                        {/* Change */}
                        <div className="flex items-center gap-0.5">
                          {isUp ? (
                            <TrendingUp className="w-3 h-3 text-[#0D9D5F]" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-[#C8102E]" />
                          )}
                          <span
                            className={cn(
                              'tabular-nums text-xs font-medium min-w-[45px] text-right',
                              isUp ? 'text-[#0D9D5F]' : 'text-[#C8102E]'
                            )}
                          >
                            {ticker ? formatPercentage(ticker.P) : '--'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
