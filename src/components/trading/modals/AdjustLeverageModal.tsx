/**
 * Adjust Leverage Modal - Professional Bitunix-inspired Design
 * With smooth animations and SOROOSHX brand colors
 */
'use client';

import { useLeverageStore, MIN_LEVERAGE, MAX_LEVERAGE } from '@/stores/useLeverageStore';
import { X, Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// SOROOSHX BRAND COLORS
// ============================================================================
const COLORS = {
  orange: '#ffb496',
  orangeHover: '#ffc4b0',
  longGreen: '#0D9D5F',
  longGreenDark: '#0B7A4A',
  shortRed: '#C8102E',
  shortRedDark: '#A80A24',
  bgPrimary: '#0B0E11',
  bgSecondary: '#1E2329',
  bgTertiary: '#2B3139',
  textPrimary: '#EAECEF',
  textSecondary: '#848E9C',
  textMuted: '#5E6673',
  borderColor: '#2B3139',
  warning: '#F0B90B',
  warningBg: 'rgba(240, 185, 11, 0.1)',
};

interface AdjustLeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export function AdjustLeverageModal({ isOpen, onClose, isMobile = false }: AdjustLeverageModalProps) {
  const { longLeverage, shortLeverage, setLongLeverage, setShortLeverage } = useLeverageStore();
  const [adjustBoth, setAdjustBoth] = useState(false);
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
            : 'max-w-md mx-4 rounded-xl shadow-2xl',
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
        {/* ================================================================ */}
        {/* HEADER                                                          */}
        {/* ================================================================ */}
        <div className={cn('flex items-center justify-between border-b', isMobile ? 'px-4 py-3' : 'px-5 py-4')} style={{ borderColor: COLORS.borderColor }}>
          <h2 className={cn('font-semibold', isMobile ? 'text-sm' : 'text-base')} style={{ color: COLORS.textPrimary }}>
            Adjust Leverage
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#2B3139] transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            <X size={isMobile ? 16 : 18} />
          </button>
        </div>

        {/* ================================================================ */}
        {/* SIMULTANEOUS TOGGLE                                             */}
        {/* ================================================================ */}
        <div className={cn('border-b', isMobile ? 'px-4 py-2.5' : 'px-5 py-3')} style={{ borderColor: COLORS.borderColor }}>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setAdjustBoth(!adjustBoth)}
              className={cn(
                'rounded flex items-center justify-center transition-all duration-200',
                'border-2 cursor-pointer flex-shrink-0',
                isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4',
                adjustBoth
                  ? 'bg-[#ffb496] border-[#ffb496]'
                  : 'bg-transparent border-[#5E6673] group-hover:border-[#848E9C]'
              )}
            >
              {adjustBoth && (
                <svg className={isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'} fill="#000000" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </div>
            <span className="text-xs" style={{ color: COLORS.textSecondary }}>
              Adjust Long and Short Leverage Simultaneously
            </span>
          </label>
        </div>

        {/* ================================================================ */}
        {/* CONTENT                                                         */}
        {/* ================================================================ */}
        <div className={cn('space-y-4', isMobile ? 'px-4 py-3' : 'px-5 py-4')}>
          {/* Long Leverage Section */}
          <LeverageSection
            label="Leverage (Open Long)"
            value={longLeverage}
            onChange={handleLongChange}
            color={COLORS.longGreen}
            isMobile={isMobile}
          />

          {/* Short Leverage Section */}
          <LeverageSection
            label="Leverage (Open Short)"
            value={shortLeverage}
            onChange={handleShortChange}
            color={COLORS.shortRed}
            isMobile={isMobile}
          />
        </div>

        {/* ================================================================ */}
        {/* WARNING MESSAGE                                                 */}
        {/* ================================================================ */}
        <div className={cn('mb-4 p-3 rounded-lg', isMobile ? 'mx-4' : 'mx-5')} style={{ backgroundColor: COLORS.warningBg }}>
          <p className={cn('leading-relaxed', isMobile ? 'text-[11px]' : 'text-xs')} style={{ color: COLORS.warning }}>
            Reminder: Maximum openings are limited by leverage, available funds, and open position quantity.
          </p>
        </div>

        {/* ================================================================ */}
        {/* ACTION BUTTONS                                                  */}
        {/* ================================================================ */}
        <div className={cn('flex gap-3', isMobile ? 'px-4 pb-4' : 'px-5 pb-5')}>
          <button
            onClick={handleClose}
            className={cn('flex-1 rounded-lg font-semibold transition-all duration-200 hover:brightness-110 active:brightness-90 active:scale-[0.98]', isMobile ? 'h-8 text-xs' : 'h-11 text-sm')}
            style={{ backgroundColor: COLORS.bgTertiary, color: COLORS.textPrimary }}
          >
            Cancel
          </button>
          <button
            onClick={handleClose}
            className={cn('flex-1 rounded-lg font-bold text-black transition-all duration-200 hover:brightness-110 active:brightness-90 active:scale-[0.98]', isMobile ? 'h-8 text-xs' : 'h-11 text-sm')}
            style={{ backgroundColor: COLORS.orange }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LEVERAGE SECTION COMPONENT
// ============================================================================
interface LeverageSectionProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  isMobile?: boolean;
}

function LeverageSection({ label, value, onChange, color, isMobile = false }: LeverageSectionProps) {
  return (
    <div className={cn('space-y-2', isMobile ? 'py-1.5' : 'py-2')}>
      {/* Label */}
      <span className={cn('block font-medium', isMobile ? 'text-xs' : 'text-sm')} style={{ color }}>
        {label}
      </span>

      {/* Input Field with +/- Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          className={cn('rounded-lg transition-colors hover:brightness-110 active:scale-95 flex-shrink-0', isMobile ? 'p-1.5' : 'p-2')}
          style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textSecondary }}
        >
          <Minus size={isMobile ? 16 : 18} />
        </button>

        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || MIN_LEVERAGE)}
          className={cn('flex-1 rounded-lg outline-none transition-all duration-200 text-center font-bold', isMobile ? 'h-9 text-lg' : 'h-11 text-2xl')}
          style={{
            backgroundColor: COLORS.bgSecondary,
            color,
            border: `1.5px solid ${color}`,
          }}
        />

        <button
          onClick={() => onChange(value + 1)}
          className={cn('rounded-lg transition-colors hover:brightness-110 active:scale-95 flex-shrink-0', isMobile ? 'p-1.5' : 'p-2')}
          style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textSecondary }}
        >
          <Plus size={isMobile ? 16 : 18} />
        </button>
      </div>
    </div>
  );
}
