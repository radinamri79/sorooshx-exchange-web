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
  orange: '#FF6B35',
  orangeHover: '#FF8555',
  longGreen: '#0ECB81',
  longGreenDark: '#0A8F5A',
  shortRed: '#F6465D',
  shortRedDark: '#C9354A',
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
}

export function AdjustLeverageModal({ isOpen, onClose }: AdjustLeverageModalProps) {
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

  if (!isVisible) return null;

  const quickButtons = [1, 40, 80, 120, 160, 200];
  const sliderTicks = [1, 40, 80, 120, 160, 200];

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
          'w-full max-w-md mx-4 rounded-xl shadow-2xl',
          'transition-all duration-200 ease-out',
          isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        )}
        style={{ backgroundColor: COLORS.bgPrimary, border: `1px solid ${COLORS.borderColor}` }}
      >
        {/* ================================================================ */}
        {/* HEADER                                                          */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: COLORS.borderColor }}>
          <h2 className="text-base font-semibold" style={{ color: COLORS.textPrimary }}>
            Adjust Leverage
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#2B3139] transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ================================================================ */}
        {/* SIMULTANEOUS TOGGLE                                             */}
        {/* ================================================================ */}
        <div className="px-5 py-3 border-b" style={{ borderColor: COLORS.borderColor }}>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setAdjustBoth(!adjustBoth)}
              className={cn(
                'w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
                'border-2 cursor-pointer',
                adjustBoth
                  ? 'bg-transparent border-[#FF6B35]'
                  : 'bg-transparent border-[#5E6673] group-hover:border-[#848E9C]'
              )}
            >
              {adjustBoth && (
                <svg className="w-2.5 h-2.5" fill={COLORS.orange} viewBox="0 0 20 20">
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
        <div className="px-5 py-4 space-y-5">
          {/* Long Leverage Section */}
          <LeverageSection
            label="Leverage (Open Long)"
            value={longLeverage}
            onChange={handleLongChange}
            color={COLORS.longGreen}
            quickButtons={quickButtons}
            sliderTicks={sliderTicks}
          />

          {/* Short Leverage Section */}
          <LeverageSection
            label="Leverage (Open Short)"
            value={shortLeverage}
            onChange={handleShortChange}
            color={COLORS.shortRed}
            quickButtons={quickButtons}
            sliderTicks={sliderTicks}
          />
        </div>

        {/* ================================================================ */}
        {/* WARNING MESSAGE                                                 */}
        {/* ================================================================ */}
        <div className="mx-5 mb-4 p-3 rounded-lg" style={{ backgroundColor: COLORS.warningBg }}>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.warning }}>
            Reminder: Maximum openings are limited by leverage, available funds, and open position quantity.
          </p>
        </div>

        {/* ================================================================ */}
        {/* ACTION BUTTONS                                                  */}
        {/* ================================================================ */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 h-11 rounded-lg text-sm font-semibold transition-all duration-200
                       hover:brightness-110 active:brightness-90 active:scale-[0.98]"
            style={{ backgroundColor: COLORS.bgTertiary, color: COLORS.textPrimary }}
          >
            Cancel
          </button>
          <button
            onClick={handleClose}
            className="flex-1 h-11 rounded-lg text-sm font-bold text-white transition-all duration-200
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

// ============================================================================
// LEVERAGE SECTION COMPONENT
// ============================================================================
interface LeverageSectionProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  quickButtons: number[];
  sliderTicks: number[];
}

function LeverageSection({ label, value, onChange, color, quickButtons, sliderTicks }: LeverageSectionProps) {
  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Value Display with +/- Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: COLORS.textSecondary }}>Leverage</span>
        <div className="flex-1 flex items-center justify-center gap-3 py-2 px-4 rounded-lg"
             style={{ backgroundColor: COLORS.bgSecondary }}>
          <button
            onClick={() => onChange(value - 1)}
            className="p-1 rounded hover:bg-[#2B3139] transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            <Plus size={16} className="rotate-45" />
          </button>
          
          <span className="text-xl font-bold min-w-[60px] text-center" style={{ color }}>
            {value}X
          </span>

          <button
            onClick={() => onChange(value + 1)}
            className="p-1 rounded hover:bg-[#2B3139] transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            <Plus size={16} />
          </button>
        </div>
        
        {/* +/- Buttons on Right */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onChange(value + 1)}
            className="p-1.5 rounded hover:bg-[#2B3139] transition-colors"
            style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textSecondary }}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => onChange(value - 1)}
            className="p-1.5 rounded hover:bg-[#2B3139] transition-colors"
            style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textSecondary }}
          >
            <Minus size={12} />
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-2 pb-4">
        <input
          type="range"
          min={MIN_LEVERAGE}
          max={MAX_LEVERAGE}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1 rounded-full cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - MIN_LEVERAGE) / (MAX_LEVERAGE - MIN_LEVERAGE)) * 100}%, ${COLORS.bgTertiary} ${((value - MIN_LEVERAGE) / (MAX_LEVERAGE - MIN_LEVERAGE)) * 100}%, ${COLORS.bgTertiary} 100%)`,
            accentColor: color,
          }}
        />
        
        {/* Tick Marks */}
        <div className="flex justify-between mt-1 text-[10px]" style={{ color: COLORS.textMuted }}>
          {sliderTicks.map((tick) => (
            <span key={tick}>{tick}X</span>
          ))}
        </div>
      </div>

      {/* Quick Selection Buttons */}
      <div className="grid grid-cols-6 gap-1.5">
        {quickButtons.map((btn) => (
          <button
            key={btn}
            onClick={() => onChange(btn)}
            className={cn(
              'py-2 rounded text-xs font-semibold transition-all duration-200',
              'hover:brightness-110 active:scale-95'
            )}
            style={{
              backgroundColor: value === btn ? color : COLORS.bgSecondary,
              color: value === btn ? 'white' : COLORS.textSecondary,
            }}
          >
            {btn}x
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          className="p-2.5 rounded-lg transition-colors hover:brightness-110"
          style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textSecondary }}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || MIN_LEVERAGE)}
          className="flex-1 h-10 px-4 text-center text-base font-bold rounded-lg
                     outline-none transition-all duration-200"
          style={{
            backgroundColor: COLORS.bgSecondary,
            color: COLORS.textPrimary,
            border: `1px solid ${COLORS.borderColor}`,
          }}
        />
        <button
          onClick={() => onChange(value + 1)}
          className="p-2.5 rounded-lg transition-colors hover:brightness-110"
          style={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textSecondary }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
