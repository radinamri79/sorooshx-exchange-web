'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
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
  const {
    currentSymbol,
    setCurrentSymbol,
    tickers,
    setTicker,
    favorites,
    toggleFavorite,
    isFavorite,
  } = useMarketStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const tickers = data as BinanceTicker[];
      tickers.forEach((ticker) => {
        if (ticker.s.endsWith('USDT')) {
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
  const priceChangePercent = currentTicker
    ? parseFloat(currentTicker.P)
    : 0;
  const isPositive = priceChangePercent >= 0;

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      setCurrentSymbol(symbol);
      setIsOpen(false);
    },
    [setCurrentSymbol]
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      toggleFavorite(symbol);
    },
    [toggleFavorite]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg bg-background-tertiary hover:bg-background-secondary transition-colors border border-border',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">
              {currentSymbol.replace('USDT', '')}/USDT
            </span>
            <span
              className={cn(
                'text-sm font-medium tabular-nums',
                isPositive ? 'text-trading-long' : 'text-trading-short'
              )}
            >
              {currentTicker ? formatPercentage(currentTicker.P) : '--'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-10 pl-10 pr-10 rounded-md border border-border bg-background-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors',
                selectedCategory === category.id
                  ? 'bg-brand-500 text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
              )}
            >
              {category.id === 'favorites' && (
                <Star className="w-3.5 h-3.5 inline-block mr-1" />
              )}
              {t(`categories.${category.labelKey}`)}
            </button>
          ))}
        </div>

        {/* Ticker List */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          ) : filteredSymbols.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Search className="w-12 h-12 mb-2 opacity-50" />
              <p>{t('noResults')}</p>
            </div>
          ) : (
            <div className="grid gap-1 py-2">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 px-3 py-1 text-xs text-text-muted sticky top-0 bg-background-secondary">
                <span className="w-6" />
                <span>{t('pair')}</span>
                <span className="text-right">{t('price')}</span>
                <span className="text-right">{t('change')}</span>
              </div>

              {/* Rows */}
              {filteredSymbols.slice(0, 50).map((symbol) => {
                const ticker = tickers[symbol];
                const change = ticker ? parseFloat(ticker.P) : 0;
                const isUp = change >= 0;
                const isFav = isFavorite(symbol);

                return (
                  <button
                    key={symbol}
                    onClick={() => handleSelectSymbol(symbol)}
                    className={cn(
                      'grid grid-cols-[auto_1fr_1fr_1fr] gap-2 px-3 py-2 rounded-md transition-colors text-left',
                      symbol === currentSymbol
                        ? 'bg-brand-500/10 border border-brand-500/20'
                        : 'hover:bg-background-tertiary'
                    )}
                  >
                    {/* Favorite Star */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, symbol)}
                      className="w-6 flex items-center justify-center"
                    >
                      <Star
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isFav
                            ? 'fill-brand-400 text-brand-400'
                            : 'text-text-muted hover:text-brand-400'
                        )}
                      />
                    </button>

                    {/* Symbol */}
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-text-primary">
                        {symbol.replace('USDT', '')}
                      </span>
                      <span className="text-text-muted text-xs">/USDT</span>
                    </div>

                    {/* Price */}
                    <span className="text-right text-text-primary tabular-nums">
                      {ticker ? formatPrice(ticker.c) : '--'}
                    </span>

                    {/* Change */}
                    <div className="flex items-center justify-end gap-1">
                      {isUp ? (
                        <TrendingUp className="w-3 h-3 text-trading-long" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-trading-short" />
                      )}
                      <span
                        className={cn(
                          'tabular-nums text-sm',
                          isUp ? 'text-trading-long' : 'text-trading-short'
                        )}
                      >
                        {ticker ? formatPercentage(ticker.P) : '--'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredSymbols.length > 50 && (
                <p className="text-center text-text-muted text-sm py-2">
                  {t('showingCount', { count: 50, total: filteredSymbols.length })}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
