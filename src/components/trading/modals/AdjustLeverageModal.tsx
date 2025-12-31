/**
 * Adjust Leverage Modal - Professional futures leverage management inspired by Bitunix
 */
'use client';

import { useLeverageStore, MIN_LEVERAGE, MAX_LEVERAGE } from '@/stores/useLeverageStore';
import { X, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface AdjustLeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdjustLeverageModal({
  isOpen,
  onClose,
}: AdjustLeverageModalProps) {
  const {
    longLeverage,
    shortLeverage,
    setLongLeverage,
    setShortLeverage,
  } = useLeverageStore();

  const [adjustBoth, setAdjustBoth] = useState(false);

  const handleLongChange = (value: number) => {
    const num = Math.max(MIN_LEVERAGE, Math.min(MAX_LEVERAGE, value));
    setLongLeverage(num);
    if (adjustBoth) setShortLeverage(num);
  };

  const handleShortChange = (value: number) => {
    const num = Math.max(MIN_LEVERAGE, Math.min(MAX_LEVERAGE, value));
    setShortLeverage(num);
    if (adjustBoth) setLongLeverage(num);
  };

  if (!isOpen) return null;

  const quickButtons = [1, 40, 80, 120, 160, 200];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-black p-4 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
          <h2 className="text-base font-bold text-white">Adjust Leverage</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Simultaneous Toggle */}
        <label className="mb-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={adjustBoth}
            onChange={(e) => setAdjustBoth(e.target.checked)}
            className="w-4 h-4 accent-orange-500 rounded cursor-pointer bg-black border-gray-700 border"
          />
          <span className="text-xs text-gray-400">Adjust Long and Short Together</span>
        </label>

        <div className="space-y-4">
          {/* Long Leverage */}
          <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-emerald-500">
                Long
              </label>
              <span className="text-xl font-bold text-white">{longLeverage}X</span>
            </div>
            
            {/* Slider */}
            <input
              type="range"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
              value={longLeverage}
              onChange={(e) => handleLongChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-emerald-500"
              style={{ accentColor: '#10b981' }}
            />

            {/* Quick Buttons */}
            <div className="mt-3 grid grid-cols-6 gap-1">
              {quickButtons.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleLongChange(btn)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                    longLeverage === btn
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {btn}x
                </button>
              ))}
            </div>

            {/* Input with +/- */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleLongChange(longLeverage - 1)}
                className="flex-shrink-0 rounded-lg bg-gray-800 px-2 py-1 text-gray-400 hover:bg-gray-700 transition"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={longLeverage}
                onChange={(e) => handleLongChange(parseInt(e.target.value) || MIN_LEVERAGE)}
                className="flex-1 rounded-lg bg-gray-800 px-3 py-1.5 text-center text-base font-bold text-white outline-none border border-gray-700 focus:border-emerald-500 transition"
              />
              <button
                onClick={() => handleLongChange(longLeverage + 1)}
                className="flex-shrink-0 rounded-lg bg-gray-800 px-2 py-1 text-gray-400 hover:bg-gray-700 transition"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Short Leverage */}
          <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-red-500">
                Short
              </label>
              <span className="text-xl font-bold text-white">{shortLeverage}X</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
              value={shortLeverage}
              onChange={(e) => handleShortChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg cursor-pointer accent-red-500"
              style={{ accentColor: '#ef4444' }}
            />

            {/* Quick Buttons */}
            <div className="mt-3 grid grid-cols-6 gap-1">
              {quickButtons.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleShortChange(btn)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                    shortLeverage === btn
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {btn}x
                </button>
              ))}
            </div>

            {/* Input with +/- */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleShortChange(shortLeverage - 1)}
                className="flex-shrink-0 rounded-lg bg-gray-800 px-2 py-1 text-gray-400 hover:bg-gray-700 transition"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={shortLeverage}
                onChange={(e) => handleShortChange(parseInt(e.target.value) || MIN_LEVERAGE)}
                className="flex-1 rounded-lg bg-gray-800 px-3 py-1.5 text-center text-base font-bold text-white outline-none border border-gray-700 focus:border-red-500 transition"
              />
              <button
                onClick={() => handleShortChange(shortLeverage + 1)}
                className="flex-shrink-0 rounded-lg bg-gray-800 px-2 py-1 text-gray-400 hover:bg-gray-700 transition"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 active:bg-orange-700 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
