/**
 * Adjust Leverage Modal - Allows users to adjust leverage for long and short positions
 */
'use client';

import { useLeverageStore, MIN_LEVERAGE, MAX_LEVERAGE } from '@/stores/useLeverageStore';
import { X, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface AdjustLeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxNominalValue?: string; // Max position size in USDT
}

export function AdjustLeverageModal({
  isOpen,
  onClose,
  maxNominalValue = '30,000,000',
}: AdjustLeverageModalProps) {
  const {
    longLeverage,
    shortLeverage,
    setLongLeverage,
    setShortLeverage,
    adjustLongLeverage,
    adjustShortLeverage,
  } = useLeverageStore();

  const [adjustBoth, setAdjustBoth] = useState(false);

  const handleLongChange = (value: string) => {
    const num = parseInt(value) || MIN_LEVERAGE;
    setLongLeverage(num);
    if (adjustBoth) setShortLeverage(num);
  };

  const handleShortChange = (value: string) => {
    const num = parseInt(value) || MIN_LEVERAGE;
    setShortLeverage(num);
    if (adjustBoth) setLongLeverage(num);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Adjust Leverage</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Long Leverage Section */}
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-green-400">
            Leverage (Open Long)
          </h3>

          {/* Value Display */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
            <span className="text-2xl font-bold text-green-400">
              {longLeverage}X
            </span>
            <span className="text-xs text-gray-400">
              Max Position Nominal Value
            </span>
          </div>

          {/* Slider */}
          <div className="mb-4">
            <input
              type="range"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
              value={longLeverage}
              onChange={(e) => handleLongChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Quick Select Buttons */}
          <div className="mb-4 grid grid-cols-5 gap-2">
            {[1, 40, 80, 120, 160, 200].map((val) => (
              <button
                key={val}
                onClick={() => setLongLeverage(val)}
                className={`rounded py-1 text-xs font-semibold transition ${
                  longLeverage === val
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {val}X
              </button>
            ))}
          </div>

          {/* +/- Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => adjustLongLeverage(-1)}
              className="flex-1 rounded bg-gray-800 py-2 transition hover:bg-gray-700"
            >
              <Minus className="mx-auto" size={18} />
            </button>
            <input
              type="number"
              value={longLeverage}
              onChange={(e) => handleLongChange(e.target.value)}
              className="flex-1 rounded bg-gray-800 px-3 py-2 text-center font-semibold text-white outline-none"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
            />
            <button
              onClick={() => adjustLongLeverage(1)}
              className="flex-1 rounded bg-gray-800 py-2 transition hover:bg-gray-700"
            >
              <Plus className="mx-auto" size={18} />
            </button>
          </div>

          {/* Max Position Value */}
          <div className="mt-3 text-sm text-gray-400">
            Max Position Nominal Value: <span className="text-white">{maxNominalValue} USDT</span>
          </div>
        </div>

        {/* Short Leverage Section */}
        <div className="mb-6">
          <h3 className="mb-4 text-sm font-semibold text-red-400">
            Leverage (Open Short)
          </h3>

          {/* Value Display */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
            <span className="text-2xl font-bold text-red-400">
              {shortLeverage}X
            </span>
            <span className="text-xs text-gray-400">
              Max Position Nominal Value
            </span>
          </div>

          {/* Slider */}
          <div className="mb-4">
            <input
              type="range"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
              value={shortLeverage}
              onChange={(e) => handleShortChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Quick Select Buttons */}
          <div className="mb-4 grid grid-cols-5 gap-2">
            {[1, 40, 80, 120, 160, 200].map((val) => (
              <button
                key={val}
                onClick={() => setShortLeverage(val)}
                className={`rounded py-1 text-xs font-semibold transition ${
                  shortLeverage === val
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {val}X
              </button>
            ))}
          </div>

          {/* +/- Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => adjustShortLeverage(-1)}
              className="flex-1 rounded bg-gray-800 py-2 transition hover:bg-gray-700"
            >
              <Minus className="mx-auto" size={18} />
            </button>
            <input
              type="number"
              value={shortLeverage}
              onChange={(e) => handleShortChange(e.target.value)}
              className="flex-1 rounded bg-gray-800 px-3 py-2 text-center font-semibold text-white outline-none"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
            />
            <button
              onClick={() => adjustShortLeverage(1)}
              className="flex-1 rounded bg-gray-800 py-2 transition hover:bg-gray-700"
            >
              <Plus className="mx-auto" size={18} />
            </button>
          </div>

          {/* Max Position Value */}
          <div className="mt-3 text-sm text-gray-400">
            Max Position Nominal Value: <span className="text-white">{maxNominalValue} USDT</span>
          </div>
        </div>

        {/* Simultaneous Adjustment Toggle */}
        <label className="mb-6 flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800 p-3">
          <input
            type="checkbox"
            checked={adjustBoth}
            onChange={(e) => setAdjustBoth(e.target.checked)}
            className="h-5 w-5 accent-orange-500"
          />
          <span className="text-sm text-gray-300">
            Adjust Long and Short Leverage Simultaneously
          </span>
        </label>

        {/* Footer */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 py-3 font-semibold text-white transition hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
