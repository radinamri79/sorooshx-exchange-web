/**
 * Futures Unit Settings Modal - Allows users to select unit type for position sizing
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
    label: 'BTC (Quantity Unit)',
    description: 'Price will be based on BTC quantity',
  },
  {
    id: 'USDT_COST',
    label: 'USDT (Cost Value)',
    description:
      'When placing orders based on the cost value, adjusting the leverage will not affect the cost.',
  },
  {
    id: 'USDT_NOMINAL',
    label: 'USDT (Nominal Value)',
    description:
      'The position opening cost varies with leverage when using the underlying asset\'s market value.',
  },
];

export function FuturesUnitSettingsModal({
  isOpen,
  onClose,
}: FuturesUnitSettingsModalProps) {
  const { unit, setUnit } = useFuturesUnitStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Futures Unit Setting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Unit Options */}
        <div className="space-y-4">
          {UNIT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start space-x-4 rounded-lg border border-gray-700 p-4 transition hover:border-orange-500 hover:bg-gray-800/50"
            >
              <input
                type="radio"
                name="unit"
                value={option.id}
                checked={unit === option.id}
                onChange={() => setUnit(option.id)}
                className="mt-1 h-5 w-5 text-orange-500 accent-orange-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-white">{option.label}</div>
                <div className="mt-1 text-sm text-gray-400">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 flex gap-3">
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
