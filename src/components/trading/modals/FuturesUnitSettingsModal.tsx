/**
 * Futures Unit Settings Modal - Professional design with smooth animations
 * Matching SOROOSHX brand colors
 */
'use client';

import React from 'react';
import { useFuturesUnitStore, type FuturesUnit } from '@/stores/useFuturesUnitStore';
import { X, DollarSign, TrendingUp, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// SOROOSHX BRAND COLORS
// ============================================================================
const COLORS = {
  orange: '#ffb496',
  orangeHover: '#ffc4b0',
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
  isMobile?: boolean;
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
  isMobile = false,
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

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex transition-all duration-200 ease-out',
        isMobile ? 'items-end' : 'items-center justify-center',
        isAnimating ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
      )}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full transition-all duration-200 ease-out',
          isMobile
            ? 'max-h-[70vh] rounded-t-xl'
            : 'max-w-sm mx-4 rounded-xl',
          isAnimating
            ? isMobile
              ? 'opacity-100 translate-y-0'
              : 'opacity-100 scale-100 translate-y-0'
            : isMobile
            ? 'opacity-0 translate-y-full'
            : 'opacity-0 scale-95 translate-y-4'
        )}
        style={{ backgroundColor: COLORS.bgPrimary, border: `1px solid ${COLORS.borderColor}` }}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between border-b', isMobile ? 'px-4 py-3' : 'px-5 py-4')} style={{ borderColor: COLORS.borderColor }}>
          <h2 className={cn('font-semibold', isMobile ? 'text-sm' : 'text-base')} style={{ color: COLORS.textPrimary }}>
            Order Unit Type
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#2B3139] transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            <X size={isMobile ? 16 : 18} />
          </button>
        </div>

        {/* Unit Options */}
        <div className={cn('space-y-2', isMobile ? 'p-3 overflow-y-auto' : 'p-4')}>
          {UNIT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                'flex items-center gap-3 cursor-pointer transition-all duration-200',
                isMobile ? 'p-2.5' : 'p-3',
                'rounded-lg border',
                'hover:border-[#ffb496]/50',
                unit === option.id 
                  ? 'border-[#ffb496] bg-[#ffb496]/10' 
                  : 'border-[#2B3139] bg-[#1E2329]'
              )}
              onClick={() => setUnit(option.id)}
            >
              {/* Radio */}
              <div
                className={cn(
                  'flex items-center justify-center transition-all duration-200 border-2 rounded-full flex-shrink-0',
                  isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4',
                  unit === option.id
                    ? 'border-[#ffb496]'
                    : 'border-[#5E6673]'
                )}
              >
                {unit === option.id && (
                  <div className={cn('rounded-full bg-[#ffb496]', isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
                )}
              </div>

              {/* Icon */}
              <div style={{ color: unit === option.id ? COLORS.orange : COLORS.textSecondary }}>
                {React.isValidElement(option.icon) 
                  ? React.cloneElement(option.icon, {
                      style: { width: isMobile ? 14 : 16, height: isMobile ? 14 : 16 }
                    } as any)
                  : option.icon
                }
              </div>

              {/* Label & Description */}
              <div className="flex-1 min-w-0">
                <div 
                  className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}
                  style={{ color: unit === option.id ? COLORS.textPrimary : COLORS.textSecondary }}
                >
                  {option.label}
                </div>
                <div className={isMobile ? 'text-[10px]' : 'text-[11px]'} style={{ color: COLORS.textMuted }}>
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Confirm Button */}
        <div className={isMobile ? 'px-3 pb-3' : 'px-4 pb-4'}>
          <button
            onClick={handleClose}
            className={cn(
              'w-full font-bold text-black transition-all duration-200 rounded-lg',
              isMobile ? 'h-8 text-xs' : 'h-10 text-sm',
              'hover:brightness-110 active:brightness-90 active:scale-[0.98]'
            )}
            style={{ backgroundColor: COLORS.orange }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
