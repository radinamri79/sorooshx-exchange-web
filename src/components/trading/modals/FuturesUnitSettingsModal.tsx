/**
 * Futures Unit Settings Modal - Professional design inspired by Bitunix
 */
'use client';

import { useFuturesUnitStore, type FuturesUnit } from '@/stores/useFuturesUnitStore';
import { X, DollarSign, TrendingUp, Zap } from 'lucide-react';

interface FuturesUnitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_OPTIONS: Array<{
  id: FuturesUnit;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'BTC_QUANTITY',
    label: 'BTC Quantity',
    description: 'Place orders by specifying the quantity in BTC. Useful for traders who think in terms of cryptocurrency amounts.',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'USDT_COST',
    label: 'USDT Cost',
    description: 'Place orders by specifying how much USDT to spend. Best for position sizing based on your trading capital.',
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    id: 'USDT_NOMINAL',
    label: 'USDT Nominal Value',
    description: 'Place orders based on the nominal value of the position in USDT, including leverage effect.',
    icon: <TrendingUp className="w-5 h-5" />,
  },
];

export function FuturesUnitSettingsModal({
  isOpen,
  onClose,
}: FuturesUnitSettingsModalProps) {
  const { unit, setUnit } = useFuturesUnitStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#000000] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-700 pb-4">
          <h2 className="text-lg font-bold text-white">Order Unit Type</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Unit Options */}
        <div className="space-y-3 mb-6">
          {UNIT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-900/30 p-4 cursor-pointer hover:border-orange-500/50 transition"
            >
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="radio"
                  name="unit"
                  value={option.id}
                  checked={unit === option.id}
                  onChange={() => setUnit(option.id)}
                  className="w-5 h-5 accent-orange-500"
                  style={{ accentColor: '#FF6B35' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-orange-500">{option.icon}</div>
                  <div className="text-base font-semibold text-white">
                    {option.label}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {option.description}
                </div>
              </div>
              {unit === option.id && (
                <div className="flex-shrink-0 mt-0.5 text-orange-500">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-orange-500 py-3 text-base font-bold text-white hover:bg-orange-600 active:bg-orange-700 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
