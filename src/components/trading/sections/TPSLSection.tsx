/**
 * Take Profit / Stop Loss Section - Advanced TP/SL management for orders
 */
'use client';

import { TPSLConfig } from '@/types/orderForm';
import { ChevronRight } from 'lucide-react';

interface TPSLSectionProps {
  tpsl: TPSLConfig;
  onToggle: (enabled: boolean) => void;
  onTPChange: (price: string) => void;
  onSLChange: (price: string) => void;
  onAdvancedToggle: (advanced: boolean) => void;
  errors?: {
    takeProfitPrice?: string;
    stopLossPrice?: string;
  };
}

export function TPSLSection({
  tpsl,
  onToggle,
  onTPChange,
  onSLChange,
  onAdvancedToggle,
  errors,
}: TPSLSectionProps) {
  return (
    <div className="space-y-3 rounded-lg bg-gray-800/30 p-4">
      {/* Header with Toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={tpsl.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 accent-orange-500"
        />
        <span className="font-semibold text-white">TP / SL</span>
        {!tpsl.enabled && (
          <span className="text-xs text-gray-400">Not set</span>
        )}
      </label>

      {/* Advanced TP/SL Inputs */}
      {tpsl.enabled && (
        <>
          {/* Advanced Mode Toggle */}
          <button
            type="button"
            onClick={() => onAdvancedToggle(!tpsl.advancedMode)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-sm transition hover:bg-gray-700/50"
          >
            <span className="text-gray-300">Advanced</span>
            <ChevronRight
              size={18}
              className={`transition ${tpsl.advancedMode ? 'rotate-90' : ''}`}
            />
          </button>

          {/* TP Input */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              TP (Take Profit Price)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={tpsl.takeProfitPrice || ''}
                onChange={(e) => onTPChange(e.target.value)}
                placeholder="TP Price (USDT)"
                className={`flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white outline-none transition focus:ring-2 ${
                  errors?.takeProfitPrice
                    ? 'ring-2 ring-red-500 focus:ring-red-500'
                    : 'focus:ring-orange-500'
                }`}
              />
              <button
                type="button"
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-600"
              >
                Mark
              </button>
            </div>
            {errors?.takeProfitPrice && (
              <p className="mt-1 text-xs text-red-400">
                {errors.takeProfitPrice}
              </p>
            )}
          </div>

          {/* SL Input */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              SL (Stop Loss Price)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={tpsl.stopLossPrice || ''}
                onChange={(e) => onSLChange(e.target.value)}
                placeholder="SL Price (USDT)"
                className={`flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white outline-none transition focus:ring-2 ${
                  errors?.stopLossPrice
                    ? 'ring-2 ring-red-500 focus:ring-red-500'
                    : 'focus:ring-orange-500'
                }`}
              />
              <button
                type="button"
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-600"
              >
                Mark
              </button>
            </div>
            {errors?.stopLossPrice && (
              <p className="mt-1 text-xs text-red-400">
                {errors.stopLossPrice}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
