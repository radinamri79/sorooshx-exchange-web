/**
 * Compact Futures Unit Settings Modal
 */
'use client';

import { useFuturesUnitStore, type FuturesUnit } from '@/stores/useFuturesUnitStore';
import { X } from 'lucide-react';

interface FuturesUnitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_OPTIONS: Array<{
  id: FuturesUnit;
  label: string;
  description: string;
}> = [
  {
    id: 'BTC_QUANTITY',
    label: 'BTC Quantity',
    description: 'Quantity in BTC',
  },
  {
    id: 'USDT_COST',
    label: 'USDT Cost',
    description: 'Cost value in USDT',
  },
  {
    id: 'USDT_NOMINAL',
    label: 'USDT Nominal',
    description: 'Nominal value in USDT',
  },
];

export function FuturesUnitSettingsModal({
  isOpen,
  onClose,
}: FuturesUnitSettingsModalProps) {
  const { unit, setUnit } = useFuturesUnitStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-gray-800 bg-[#0d0d0f] p-4 shadow-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Futures Unit</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Unit Options */}
        <div className="space-y-1.5 mb-3">
          {UNIT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2.5 rounded-lg border border-gray-800 bg-gray-900 p-2 cursor-pointer hover:border-orange-500/50 transition"
            >
              <input
                type="radio"
                name="unit"
                value={option.id}
                checked={unit === option.id}
                onChange={() => setUnit(option.id)}
                className="w-3.5 h-3.5 accent-orange-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-white">
                  {option.label}
                </div>
                <div className="text-[9px] text-gray-500 truncate">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="w-full rounded bg-orange-500 py-1.5 text-[12px] font-bold text-white hover:bg-orange-600 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
