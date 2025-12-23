import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChartType = 'candlestick' | 'line' | 'bar' | 'heikin-ashi';

export interface IndicatorSettings {
  enabled: boolean;
  period?: number;
  value?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDevMultiplier?: number;
}

export interface ChartSettings {
  chartType: ChartType;
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  
  // Indicators
  indicators: {
    sma?: IndicatorSettings & { value: number };
    ema?: IndicatorSettings & { value: number };
    rsi?: IndicatorSettings & { period: number };
    bbands?: IndicatorSettings & { period: number; stdDevMultiplier: number };
    macd?: IndicatorSettings & { fastPeriod: number; slowPeriod: number; signalPeriod: number };
    stochastic?: IndicatorSettings & { period: number; signalPeriod: number };
    atr?: IndicatorSettings & { period: number };
  };
  
  // Price Alerts
  alerts: PriceAlert[];
  
  // Drawing Tools
  drawingMode?: 'line' | 'rectangle' | 'fibonacci' | 'text' | null;
}

export interface PriceAlert {
  id: string;
  price: number;
  condition: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

export interface ChartState extends ChartSettings {
  // Actions
  setChartType: (type: ChartType) => void;
  setShowVolume: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowCrosshair: (show: boolean) => void;
  
  // Indicator actions
  toggleIndicator: (indicator: keyof ChartSettings['indicators']) => void;
  updateIndicatorSettings: (
    indicator: keyof ChartSettings['indicators'],
    settings: Partial<IndicatorSettings>
  ) => void;
  
  // Alert actions
  addAlert: (price: number, condition: 'above' | 'below') => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  
  // Drawing actions
  setDrawingMode: (mode: ChartState['drawingMode']) => void;
  
  // Reset to defaults
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: ChartSettings = {
  chartType: 'candlestick',
  showVolume: true,
  showGrid: true,
  showCrosshair: true,
  indicators: {
    sma: { enabled: false, value: 20 },
    ema: { enabled: false, value: 20 },
    rsi: { enabled: false, period: 14 },
    bbands: { enabled: false, period: 20, stdDevMultiplier: 2 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    stochastic: { enabled: false, period: 14, signalPeriod: 3 },
    atr: { enabled: false, period: 14 },
  },
  alerts: [],
};

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      
      setChartType: (type) => set({ chartType: type }),
      setShowVolume: (show) => set({ showVolume: show }),
      setShowGrid: (show) => set({ showGrid: show }),
      setShowCrosshair: (show) => set({ showCrosshair: show }),
      
      toggleIndicator: (indicator) =>
        set((state) => ({
          indicators: {
            ...state.indicators,
            [indicator]: {
              ...state.indicators[indicator as keyof typeof state.indicators],
              enabled: !state.indicators[indicator as keyof typeof state.indicators]?.enabled,
            },
          },
        })),
      
      updateIndicatorSettings: (indicator, settings) =>
        set((state) => ({
          indicators: {
            ...state.indicators,
            [indicator]: {
              ...state.indicators[indicator as keyof typeof state.indicators],
              ...settings,
            },
          },
        })),
      
      addAlert: (price, condition) => {
        const id = Date.now().toString();
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              id,
              price,
              condition,
              triggered: false,
              createdAt: Date.now(),
            },
          ],
        }));
      },
      
      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        })),
      
      triggerAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, triggered: true } : alert
          ),
        })),
      
      setDrawingMode: (mode) => set({ drawingMode: mode }),
      
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'chart-settings',
    }
  )
);
