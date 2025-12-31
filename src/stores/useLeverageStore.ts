/**
 * Leverage Store - Manages leverage settings for long and short positions
 * Supports leverage from 1X to 200X
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LeverageState {
  longLeverage: number;
  shortLeverage: number;
  setLongLeverage: (leverage: number) => void;
  setShortLeverage: (leverage: number) => void;
  setLeverageBoth: (leverage: number) => void;
  adjustLongLeverage: (delta: number) => void;
  adjustShortLeverage: (delta: number) => void;
}

const MIN_LEVERAGE = 1;
const MAX_LEVERAGE = 200;

const clampLeverage = (value: number): number => {
  return Math.max(MIN_LEVERAGE, Math.min(MAX_LEVERAGE, value));
};

export const useLeverageStore = create<LeverageState>()(
  persist(
    (set) => ({
      longLeverage: 20,
      shortLeverage: 20,
      setLongLeverage: (leverage: number) =>
        set({ longLeverage: clampLeverage(leverage) }),
      setShortLeverage: (leverage: number) =>
        set({ shortLeverage: clampLeverage(leverage) }),
      setLeverageBoth: (leverage: number) => {
        const clamped = clampLeverage(leverage);
        set({ longLeverage: clamped, shortLeverage: clamped });
      },
      adjustLongLeverage: (delta: number) =>
        set((state) => ({
          longLeverage: clampLeverage(state.longLeverage + delta),
        })),
      adjustShortLeverage: (delta: number) =>
        set((state) => ({
          shortLeverage: clampLeverage(state.shortLeverage + delta),
        })),
    }),
    {
      name: 'leverage-store',
      version: 1,
    }
  )
);

export { MIN_LEVERAGE, MAX_LEVERAGE };
