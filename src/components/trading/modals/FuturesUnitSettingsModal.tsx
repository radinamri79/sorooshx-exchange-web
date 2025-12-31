/**
 * Futures Unit Settings Modal - Professional design with smooth animations
 * Matching SOROOSHX brand colors
 */
'use client';

import { useFuturesUnitStore, type FuturesUnit } from '@/stores/useFuturesUnitStore';
import { X, DollarSign, TrendingUp, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// SOROOSHX BRAND COLORS
// ============================================================================
const COLORS = {
  orange: '#FF7A00',
  orangeHover: '#FF8A20',
  bgPrimary: '#0B0E11',
  bgSecondary: '#1E2329',
  bgTertiary: '#2B3139',
  textPrimary: '#EAECEF',
  textSecondary: '#848E9C',
  textMuted: '#5E6673',
  borderColor: '#2B3139',
};

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
    description: 'Place orders by specifying the quantity in BTC',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: 'USDT_COST',
    label: 'USDT Cost',
    description: 'Place orders by specifying how much USDT to spend',
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: 'USDT_NOMINAL',
    label: 'USDT Nominal Value',
    description: 'Based on the nominal value including leverage',
    icon: <TrendingUp className="w-4 h-4" />,
  },
];

export function FuturesUnitSettingsModal({
  isOpen,
  onClose,
}: FuturesUnitSettingsModalProps) {
  const { unit, setUnit } = useFuturesUnitStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation handling
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'transition-all duration-200 ease-out',
        isAnimating ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
      )}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-sm mx-4 rounded-xl shadow-2xl',
          'transition-all duration-200 ease-out',
          isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        )}
        style={{ backgroundColor: COLORS.bgPrimary, border: `1px solid ${COLORS.borderColor}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: COLORS.borderColor }}>
          <h2 className="text-base font-semibold" style={{ color: COLORS.textPrimary }}>
            Order Unit Type
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#2B3139] transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Unit Options */}
        <div className="p-4 space-y-2">
          {UNIT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                'border hover:border-[#FF6B35]/50',
                unit === option.id 
                  ? 'border-[#FF6B35] bg-[#FF6B35]/10' 
                  : 'border-[#2B3139] bg-[#1E2329]'
              )}
              onClick={() => setUnit(option.id)}
            >
              {/* Radio */}
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  unit === option.id
                    ? 'border-[#FF6B35]'
                    : 'border-[#5E6673]'
                )}
              >
                {unit === option.id && (
                  <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
                )}
              </div>

              {/* Icon */}
              <div style={{ color: unit === option.id ? COLORS.orange : COLORS.textSecondary }}>
                {option.icon}
              </div>

              {/* Label & Description */}
              <div className="flex-1 min-w-0">
                <div 
                  className="text-sm font-medium"
                  style={{ color: unit === option.id ? COLORS.textPrimary : COLORS.textSecondary }}
                >
                  {option.label}
                </div>
                <div className="text-[11px]" style={{ color: COLORS.textMuted }}>
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Confirm Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleClose}
            className="w-full h-10 rounded-lg text-sm font-bold text-white transition-all duration-200
                       hover:brightness-110 active:brightness-90 active:scale-[0.98]"
            style={{ backgroundColor: COLORS.orange }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
