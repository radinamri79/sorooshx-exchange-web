/**
 * Compact Adjust Leverage Modal - Professional futures leverage management
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

  const quickButtons = [1, 10, 25, 50, 100, 125];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-gray-800 bg-[#0d0d0f] p-4 shadow-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Leverage</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Simultaneous Toggle */}
        <label className="mb-3 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={adjustBoth}
            onChange={(e) => setAdjustBoth(e.target.checked)}
            className="w-3.5 h-3.5 accent-orange-500"
          />
          <span className="text-[10px] text-gray-400">Adjust both</span>
        </label>

        <div className="space-y-3">
          {/* Long Leverage */}
          <div className="rounded border border-gray-800 bg-gray-900 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold text-emerald-500">
                Long
              </label>
              <span className="text-sm font-bold text-white">{longLeverage}x</span>
            </div>
            
            {/* Slider */}
            <input
              type="range"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
              value={longLeverage}
              onChange={(e) => handleLongChange(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded cursor-pointer accent-emerald-500"
            />

            {/* Quick Buttons */}
            <div className="mt-1.5 grid grid-cols-3 gap-0.5">
              {quickButtons.slice(0, 3).map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleLongChange(btn)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${
                    longLeverage === btn
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {btn}x
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {quickButtons.slice(3).map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleLongChange(btn)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${
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
            <div className="mt-1.5 flex items-center gap-0.5">
              <button
                onClick={() => handleLongChange(longLeverage - 1)}
                className="flex-shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-gray-400 hover:bg-gray-700 transition"
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                value={longLeverage}
                onChange={(e) => handleLongChange(parseInt(e.target.value) || MIN_LEVERAGE)}
                className="flex-1 rounded bg-gray-800 px-1.5 py-0.5 text-[11px] text-center text-white outline-none border border-gray-700 focus:border-emerald-500 transition"
              />
              <button
                onClick={() => handleLongChange(longLeverage + 1)}
                className="flex-shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-gray-400 hover:bg-gray-700 transition"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Short Leverage */}
          <div className="rounded border border-gray-800 bg-gray-900 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold text-red-500">
                Short
              </label>
              <span className="text-sm font-bold text-white">{shortLeverage}x</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={MIN_LEVERAGE}
              max={MAX_LEVERAGE}
              value={shortLeverage}
              onChange={(e) => handleShortChange(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded cursor-pointer accent-red-500"
            />

            {/* Quick Buttons */}
            <div className="mt-1.5 grid grid-cols-3 gap-0.5">
              {quickButtons.slice(0, 3).map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleShortChange(btn)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${
                    shortLeverage === btn
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {btn}x
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {quickButtons.slice(3).map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleShortChange(btn)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${
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
            <div className="mt-1.5 flex items-center gap-0.5">
              <button
                onClick={() => handleShortChange(shortLeverage - 1)}
                className="flex-shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-gray-400 hover:bg-gray-700 transition"
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                value={shortLeverage}
                onChange={(e) => handleShortChange(parseInt(e.target.value) || MIN_LEVERAGE)}
                className="flex-1 rounded bg-gray-800 px-1.5 py-0.5 text-[11px] text-center text-white outline-none border border-gray-700 focus:border-red-500 transition"
              />
              <button
                onClick={() => handleShortChange(shortLeverage + 1)}
                className="flex-shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-gray-400 hover:bg-gray-700 transition"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="mt-3 w-full rounded bg-orange-500 py-2 text-[12px] font-bold text-white hover:bg-orange-600 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
