/**
 * Futures Unit Store - Manages futures contract unit settings
 * Supports three unit types: BTC (Quantity), USDT (Cost Value), USDT (Nominal Value)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FuturesUnit = 'BTC_QUANTITY' | 'USDT_COST' | 'USDT_NOMINAL';

interface FuturesUnitState {
  unit: FuturesUnit;
  setUnit: (unit: FuturesUnit) => void;
  getUnitLabel: () => string;
  getUnitDescription: () => string;
}

export const useFuturesUnitStore = create<FuturesUnitState>()(
  persist(
    (set, get) => ({
      unit: 'BTC_QUANTITY',
      setUnit: (unit: FuturesUnit) => set({ unit }),
      getUnitLabel: () => {
        const { unit } = get();
        switch (unit) {
          case 'BTC_QUANTITY':
            return 'BTC (Quantity Unit)';
          case 'USDT_COST':
            return 'USDT (Cost Value)';
          case 'USDT_NOMINAL':
            return 'USDT (Nominal Value)';
          default:
            return 'BTC (Quantity Unit)';
        }
      },
      getUnitDescription: () => {
        const { unit } = get();
        switch (unit) {
          case 'BTC_QUANTITY':
            return 'Price will be based on BTC quantity';
          case 'USDT_COST':
            return 'When placing orders based on the cost value, adjusting the leverage will not affect the cost';
          case 'USDT_NOMINAL':
            return 'The position opening cost varies with leverage when using the underlying asset\'s market value';
          default:
            return 'Price will be based on BTC quantity';
        }
      },
    }),
    {
      name: 'futures-unit-store',
      version: 1,
    }
  )
);
