'use client';

import { useChartStore } from '@/stores/useChartStore';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChartSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChartSettingsModal({ open, onOpenChange }: ChartSettingsModalProps) {
  const {
    showVolume,
    setShowVolume,
    showGrid,
    setShowGrid,
    showCrosshair,
    setShowCrosshair,
    indicators,
    updateIndicatorSettings,
    resetToDefaults,
  } = useChartStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0e27] border-[#1e2329] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Chart Settings</DialogTitle>
          <DialogDescription className="text-[#848e9c]">
            Customize your chart appearance and indicators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Display Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Display</h3>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(e) => setShowVolume(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1e2329] bg-[#1a1a2e] cursor-pointer"
                />
                <span className="text-sm text-[#848e9c]">Show Volume</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1e2329] bg-[#1a1a2e] cursor-pointer"
                />
                <span className="text-sm text-[#848e9c]">Show Grid</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCrosshair}
                  onChange={(e) => setShowCrosshair(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1e2329] bg-[#1a1a2e] cursor-pointer"
                />
                <span className="text-sm text-[#848e9c]">Show Crosshair</span>
              </label>
            </div>
          </div>

          {/* Indicator Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Indicator Parameters</h3>

            {/* SMA Settings */}
            {indicators.sma?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <label className="text-xs font-medium text-[#848e9c]">SMA Period</label>
                <input
                  type="number"
                  value={indicators.sma.value || 20}
                  onChange={(e) =>
                    updateIndicatorSettings('sma', { value: parseInt(e.target.value) || 20 })
                  }
                  className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                  min="1"
                  max="500"
                />
              </div>
            )}

            {/* EMA Settings */}
            {indicators.ema?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <label className="text-xs font-medium text-[#848e9c]">EMA Period</label>
                <input
                  type="number"
                  value={indicators.ema.value || 20}
                  onChange={(e) =>
                    updateIndicatorSettings('ema', { value: parseInt(e.target.value) || 20 })
                  }
                  className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                  min="1"
                  max="500"
                />
              </div>
            )}

            {/* RSI Settings */}
            {indicators.rsi?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <label className="text-xs font-medium text-[#848e9c]">RSI Period</label>
                <input
                  type="number"
                  value={indicators.rsi.period || 14}
                  onChange={(e) =>
                    updateIndicatorSettings('rsi', { period: parseInt(e.target.value) || 14 })
                  }
                  className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                  min="1"
                  max="100"
                />
              </div>
            )}

            {/* Bollinger Bands Settings */}
            {indicators.bbands?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Period</label>
                  <input
                    type="number"
                    value={indicators.bbands.period || 20}
                    onChange={(e) =>
                      updateIndicatorSettings('bbands', {
                        period: parseInt(e.target.value) || 20,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="1"
                    max="500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Std Dev Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={indicators.bbands.stdDevMultiplier || 2}
                    onChange={(e) =>
                      updateIndicatorSettings('bbands', {
                        stdDevMultiplier: parseFloat(e.target.value) || 2,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="0.1"
                    max="5"
                  />
                </div>
              </div>
            )}

            {/* MACD Settings */}
            {indicators.macd?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Fast Period</label>
                  <input
                    type="number"
                    value={indicators.macd.fastPeriod || 12}
                    onChange={(e) =>
                      updateIndicatorSettings('macd', {
                        fastPeriod: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Slow Period</label>
                  <input
                    type="number"
                    value={indicators.macd.slowPeriod || 26}
                    onChange={(e) =>
                      updateIndicatorSettings('macd', {
                        slowPeriod: parseInt(e.target.value) || 26,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Signal Period</label>
                  <input
                    type="number"
                    value={indicators.macd.signalPeriod || 9}
                    onChange={(e) =>
                      updateIndicatorSettings('macd', {
                        signalPeriod: parseInt(e.target.value) || 9,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="1"
                    max="50"
                  />
                </div>
              </div>
            )}

            {/* Stochastic Settings */}
            {indicators.stochastic?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Period</label>
                  <input
                    type="number"
                    value={indicators.stochastic.period || 14}
                    onChange={(e) =>
                      updateIndicatorSettings('stochastic', {
                        period: parseInt(e.target.value) || 14,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#848e9c]">Signal Period</label>
                  <input
                    type="number"
                    value={indicators.stochastic.signalPeriod || 3}
                    onChange={(e) =>
                      updateIndicatorSettings('stochastic', {
                        signalPeriod: parseInt(e.target.value) || 3,
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                    min="1"
                    max="50"
                  />
                </div>
              </div>
            )}

            {/* ATR Settings */}
            {indicators.atr?.enabled && (
              <div className="space-y-2 p-2 rounded bg-[#1a1a2e] border border-[#1e2329]">
                <label className="text-xs font-medium text-[#848e9c]">ATR Period</label>
                <input
                  type="number"
                  value={indicators.atr.period || 14}
                  onChange={(e) =>
                    updateIndicatorSettings('atr', { period: parseInt(e.target.value) || 14 })
                  }
                  className="w-full px-2 py-1 text-sm rounded bg-[#0a0e27] border border-[#1e2329] text-white"
                  min="1"
                  max="100"
                />
              </div>
            )}
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="w-full text-[#848e9c] border-[#1e2329] hover:text-white hover:bg-[#1a1a2e]"
          >
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
