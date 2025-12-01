import { create } from 'zustand';
import type { OrderbookEntry, OrderbookData } from '@/types';

export interface OrderbookState {
  // Orderbook data
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  lastUpdateId: number;
  
  // Current symbol
  symbol: string;
  
  // Settings
  precision: number;
  levels: number;
  
  // Connection status
  isConnected: boolean;
  
  // Actions
  setSnapshot: (data: {
    bids: OrderbookEntry[];
    asks: OrderbookEntry[];
    lastUpdateId: number;
    symbol?: string;
  }) => void;
  
  // Alias for setSnapshot (used by components)
  setOrderbook: (data: OrderbookData) => void;
  
  updateOrderbook: (data: {
    bids: OrderbookEntry[];
    asks: OrderbookEntry[];
    firstUpdateId: number;
    lastUpdateId: number;
  }) => void;
  
  // Merge incremental updates
  mergeOrderbook: (bids: OrderbookEntry[], asks: OrderbookEntry[], lastUpdateId: number) => void;
  
  clearOrderbook: () => void;
  
  // Reset alias
  reset: () => void;
  
  setPrecision: (precision: number) => void;
  setLevels: (levels: number) => void;
  setConnected: (connected: boolean) => void;
  
  // Computed
  getSpread: () => { value: string; percentage: string } | null;
  getTotalBidVolume: () => number;
  getTotalAskVolume: () => number;
}

/**
 * Merge orderbook updates into existing state
 * Sorted: bids descending by price, asks ascending by price
 */
function mergeOrderbookEntries(
  existing: OrderbookEntry[],
  updates: OrderbookEntry[],
  isAsk: boolean
): OrderbookEntry[] {
  const priceMap = new Map<string, string>();
  
  // Add existing entries
  for (const [price, qty] of existing) {
    priceMap.set(price, qty);
  }
  
  // Apply updates
  for (const [price, qty] of updates) {
    if (parseFloat(qty) === 0) {
      priceMap.delete(price);
    } else {
      priceMap.set(price, qty);
    }
  }
  
  // Convert back to array and sort
  const result = Array.from(priceMap.entries());
  result.sort((a, b) => {
    const priceA = parseFloat(a[0]);
    const priceB = parseFloat(b[0]);
    return isAsk ? priceA - priceB : priceB - priceA;
  });
  
  return result;
}

export const useOrderbookStore = create<OrderbookState>()((set, get) => ({
  // Initial state
  bids: [],
  asks: [],
  lastUpdateId: 0,
  symbol: '',
  precision: 2,
  levels: 20,
  isConnected: false,

  // Actions
  setSnapshot: ({ bids, asks, lastUpdateId, symbol }) =>
    set({
      bids: bids.slice(0, get().levels),
      asks: asks.slice(0, get().levels),
      lastUpdateId,
      symbol: symbol || get().symbol,
    }),

  // Alias for setSnapshot using OrderbookData type
  setOrderbook: (data: OrderbookData) =>
    set({
      bids: data.bids.slice(0, get().levels),
      asks: data.asks.slice(0, get().levels),
      lastUpdateId: data.lastUpdateId,
    }),

  updateOrderbook: ({ bids, asks, firstUpdateId, lastUpdateId }) => {
    const state = get();
    
    // Skip if update is stale
    if (firstUpdateId <= state.lastUpdateId) {
      return;
    }
    
    set({
      bids: mergeOrderbookEntries(state.bids, bids, false).slice(0, state.levels),
      asks: mergeOrderbookEntries(state.asks, asks, true).slice(0, state.levels),
      lastUpdateId,
    });
  },

  // Merge incremental orderbook updates
  mergeOrderbook: (bids, asks, lastUpdateId) => {
    const state = get();
    set({
      bids: mergeOrderbookEntries(state.bids, bids, false).slice(0, state.levels),
      asks: mergeOrderbookEntries(state.asks, asks, true).slice(0, state.levels),
      lastUpdateId,
    });
  },

  clearOrderbook: () =>
    set({
      bids: [],
      asks: [],
      lastUpdateId: 0,
    }),

  // Reset alias
  reset: () =>
    set({
      bids: [],
      asks: [],
      lastUpdateId: 0,
    }),

  setPrecision: (precision) => set({ precision }),
  setLevels: (levels) => set({ levels }),
  setConnected: (isConnected) => set({ isConnected }),

  // Computed
  getSpread: () => {
    const { bids, asks } = get();
    if (bids.length === 0 || asks.length === 0) return null;
    
    const bestBid = parseFloat(bids[0]?.[0] ?? '0');
    const bestAsk = parseFloat(asks[0]?.[0] ?? '0');
    
    if (bestBid === 0 || bestAsk === 0) return null;
    
    const spread = bestAsk - bestBid;
    const percentage = (spread / bestAsk) * 100;
    
    return {
      value: spread.toFixed(2),
      percentage: percentage.toFixed(4),
    };
  },

  getTotalBidVolume: () => {
    return get().bids.reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
  },

  getTotalAskVolume: () => {
    return get().asks.reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
  },
}));
