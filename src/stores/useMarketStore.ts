import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BinanceTicker, SymbolInfo } from '@/types';
import { DEFAULT_SYMBOL, SYMBOL_INFO } from '@/lib/constants';

export interface MarketState {
  // Current symbol
  currentSymbol: string;
  
  // Ticker data for all subscribed symbols (using BinanceTicker format)
  tickers: Record<string, BinanceTicker>;
  
  // Symbol information
  symbols: SymbolInfo[];
  
  // Favorite symbols
  favorites: string[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setCurrentSymbol: (symbol: string) => void;
  updateTicker: (symbol: string, data: Partial<BinanceTicker>) => void;
  setTicker: (symbol: string, data: BinanceTicker) => void;
  setSymbols: (symbols: SymbolInfo[]) => void;
  toggleFavorite: (symbol: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Computed getters
  getCurrentTicker: () => BinanceTicker | null;
  getCurrentSymbolInfo: () => SymbolInfo | null;
  isFavorite: (symbol: string) => boolean;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSymbol: DEFAULT_SYMBOL,
      tickers: {},
      symbols: Object.entries(SYMBOL_INFO).map(([symbol, info]) => ({
        symbol,
        ...info,
      })),
      favorites: ['BTCUSDT', 'ETHUSDT'],
      isLoading: false,

      // Actions
      setCurrentSymbol: (symbol) => set({ currentSymbol: symbol.toUpperCase() }),

      updateTicker: (symbol, data) =>
        set((state) => ({
          tickers: {
            ...state.tickers,
            [symbol]: {
              ...state.tickers[symbol],
              ...data,
            } as BinanceTicker,
          },
        })),

      setTicker: (symbol, data) =>
        set((state) => ({
          tickers: {
            ...state.tickers,
            [symbol]: data,
          },
        })),

      setSymbols: (symbols) => set({ symbols }),

      toggleFavorite: (symbol) =>
        set((state) => ({
          favorites: state.favorites.includes(symbol)
            ? state.favorites.filter((s) => s !== symbol)
            : [...state.favorites, symbol],
        })),

      setLoading: (isLoading) => set({ isLoading }),

      // Computed getters
      getCurrentTicker: () => {
        const { currentSymbol, tickers } = get();
        return tickers[currentSymbol] || null;
      },

      getCurrentSymbolInfo: () => {
        const { currentSymbol, symbols } = get();
        return symbols.find((s) => s.symbol === currentSymbol) || null;
      },

      isFavorite: (symbol: string) => {
        return get().favorites.includes(symbol);
      },
    }),
    {
      name: 'sorooshx-market-store',
      partialize: (state) => ({
        favorites: state.favorites,
      }),
    }
  )
);
