'use client';

import { useState, useMemo } from 'react';
import Decimal from 'decimal.js';
import { cn } from '@/lib/utils';
import { useLeverageStore } from '@/stores/useLeverageStore';
import { FuturesUnitSettingsModal } from './modals/FuturesUnitSettingsModal';
import { AdjustLeverageModal } from './modals/AdjustLeverageModal';
import {
  OrderFormState,
  OrderFormType,
  OrderSide,
  OrderFormErrors,
  OrderCostEstimate,
  OrderFormUIState,
} from '@/types/orderForm';
import { Settings, ChevronDown } from 'lucide-react';

// ============================================================================
// SOROOSHX BRAND COLORS - Professional Trading Theme
// ============================================================================
const COLORS = {
  // Primary Brand - Orange Accent (SOROOSHX Official)
  orange: '#FF7A00',
  orangeHover: '#FF8A20',
  orangeActive: '#E66A00',
  
  // Candlestick Colors (Professional Trading - Dark Tones)
  longGreen: '#0D9D5F',       // Dark Green - Bullish
  longGreenHover: '#0FAD6F',
  longGreenDark: '#0B7A4A',
  shortRed: '#C8102E',        // Dark Red - Bearish
  shortRedHover: '#D8203E',
  shortRedDark: '#A80A24',
  
  // Backgrounds
  bgPrimary: '#0B0E11',       // Main background
  bgSecondary: '#1E2329',     // Card/input background
  bgTertiary: '#2B3139',      // Hover states
  bgHover: '#363C45',
  
  // Text
  textPrimary: '#EAECEF',
  textSecondary: '#848E9C',
  textMuted: '#5E6673',
  
  // Borders
  borderColor: '#2B3139',
  borderHover: '#3D4450',
};

interface OrderFormProps {
  className?: string;
  currentPrice?: string;
  availableBalance?: string;
  onSubmit?: (formData: OrderFormState) => Promise<void>;
}

const INITIAL_STATE: OrderFormState = {
  action: 'OPEN',
  side: 'LONG',
  marginMode: 'CROSS',
  orderType: 'LIMIT',
  price: '',
  quantity: '',
  quantityPercent: 0,
  tpsl: {
    enabled: false,
    advancedMode: false,
  },
  postOnly: false,
  reduceOnly: false,
};

const INITIAL_UI_STATE: OrderFormUIState = {
  showAdvancedTP: false,
  showLeverageModal: false,
  showUnitSettingsModal: false,
  isSubmitting: false,
  errorMessage: '',
};

export function OrderForm({
  className,
  currentPrice = '87,859.3',
  availableBalance = '0.0000',
  onSubmit,
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormState>(INITIAL_STATE);
  const [uiState, setUiState] = useState<OrderFormUIState>(INITIAL_UI_STATE);
  const [errors, setErrors] = useState<OrderFormErrors>({});

  const { longLeverage, shortLeverage } = useLeverageStore();

  const currentLeverage = formData.side === 'LONG' ? longLeverage : shortLeverage;

  // Calculate order cost and estimates
  const costEstimate = useMemo((): OrderCostEstimate => {
    if (!formData.price || !formData.quantity) {
      return { cost: '0.0', maxQuantity: '0', maintenanceMargin: '0.0' };
    }

    try {
      const price = new Decimal(formData.price.replace(/,/g, ''));
      const quantity = new Decimal(formData.quantity);
      const leverage = new Decimal(currentLeverage);

      const totalValue = price.times(quantity);
      const cost = totalValue.dividedBy(leverage);
      const maintenanceMargin = totalValue.times(new Decimal('0.005'));

      const availableForOrder = new Decimal(availableBalance.replace(/,/g, '')).times(leverage);
      const maxQty = price.gt(0) ? availableForOrder.dividedBy(price) : new Decimal(0);

      return {
        cost: cost.toFixed(1),
        maxQuantity: maxQty.toFixed(8),
        maintenanceMargin: maintenanceMargin.toFixed(1),
        estimatedPnL: '0',
        liquidationPrice: calculateLiquidationPrice(price, formData.side, leverage),
      };
    } catch {
      return { cost: '0.0', maxQuantity: '0', maintenanceMargin: '0.0' };
    }
  }, [formData.price, formData.quantity, currentLeverage, availableBalance, formData.side]);

  const handleOrderTypeChange = (type: OrderFormType) => {
    setFormData((prev) => ({
      ...prev,
      orderType: type,
      price: type === 'MARKET' ? '' : prev.price,
      triggerPrice: '',
    }));
    setErrors({});
  };

  const handlePriceChange = (price: string) => {
    setFormData((prev) => ({ ...prev, price }));
    if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
  };

  const handleQuantityChange = (quantity: string) => {
    setFormData((prev) => ({ ...prev, quantity, quantityPercent: 0 }));
    if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: undefined }));
  };

  const handleQuantityPercentChange = (percent: number) => {
    try {
      const maxQty = new Decimal(costEstimate.maxQuantity);
      const newQty = maxQty.times(new Decimal(percent)).dividedBy(100);
      setFormData((prev) => ({
        ...prev,
        quantity: newQty.toFixed(8),
        quantityPercent: percent,
      }));
    } catch {
      // Silent fail
    }
  };

  const setLastPrice = () => {
    setFormData((prev) => ({ ...prev, price: currentPrice.replace(/,/g, '') }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.price && formData.orderType !== 'MARKET') {
      setErrors({ price: 'Price is required' });
      return;
    }
    if (!formData.quantity) {
      setErrors({ quantity: 'Quantity is required' });
      return;
    }

    setUiState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await onSubmit?.(formData);
      setUiState((prev) => ({ ...prev, successMessage: 'Order placed successfully!' }));
      setTimeout(() => {
        setFormData(INITIAL_STATE);
        setUiState(INITIAL_UI_STATE);
      }, 2000);
    } catch (error) {
      setUiState((prev) => ({
        ...prev,
        errorMessage: error instanceof Error ? error.message : 'Order failed',
      }));
    } finally {
      setUiState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col',
        'bg-[#0B0E11] border-l border-[#2B3139]',
        'font-sans antialiased select-none',
        className
      )}
      style={{ height: '100%' }}
    >
      {/* ================================================================ */}
      {/* MODALS with Smooth Animation                                     */}
      {/* ================================================================ */}
      <FuturesUnitSettingsModal
        isOpen={uiState.showUnitSettingsModal}
        onClose={() => setUiState((prev) => ({ ...prev, showUnitSettingsModal: false }))}
      />
      <AdjustLeverageModal
        isOpen={uiState.showLeverageModal}
        onClose={() => setUiState((prev) => ({ ...prev, showLeverageModal: false }))}
      />

      {/* ================================================================ */}
      {/* HEADER - Margin Mode & Leverage Button                          */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2B3139]">
        <div className="flex items-center gap-2">
          {/* Margin Mode Selector */}
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded
                       bg-[#1E2329] text-[#EAECEF] hover:bg-[#2B3139] 
                       transition-all duration-200 border border-[#2B3139]"
          >
            {formData.marginMode === 'CROSS' ? 'Cross' : 'Isolated'}
            <ChevronDown size={12} className="text-[#848E9C]" />
          </button>

          {/* Leverage Display Button - Bitunix Style */}
          <button
            type="button"
            onClick={() => setUiState((prev) => ({ ...prev, showLeverageModal: true }))}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold
                       bg-[#1E2329] hover:bg-[#2B3139] 
                       transition-all duration-200 border border-[#2B3139]"
          >
            <span style={{ color: COLORS.longGreen }}>{longLeverage}X</span>
            <span className="text-[#5E6673]">|</span>
            <span style={{ color: COLORS.shortRed }}>{shortLeverage}X</span>
          </button>
        </div>

        {/* Settings Icon */}
        <button
          type="button"
          onClick={() => setUiState((prev) => ({ ...prev, showUnitSettingsModal: true }))}
          className="p-1.5 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#1E2329] 
                     rounded transition-all duration-200"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* ================================================================ */}
      {/* ACTION TABS - Open / Close                                       */}
      {/* ================================================================ */}
      <div className="flex px-3 py-2 gap-2">
        {(['OPEN', 'CLOSE'] as const).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, action }))}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold transition-all duration-200 rounded-lg',
              formData.action === action
                ? 'text-white bg-[#FF7A00]'
                : 'text-[#848E9C] bg-[#1E2329] hover:text-[#EAECEF] hover:bg-[#2B3139]'
            )}
          >
            {action === 'OPEN' ? 'Open' : 'Close'}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* ORDER TYPE TABS - Limit / Market / Trigger                       */}
      {/* ================================================================ */}
      <div className="flex items-center px-3 py-2 gap-2 border-b border-[#2B3139]">
        {(['LIMIT', 'MARKET', 'TRIGGER'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleOrderTypeChange(type)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded transition-all duration-200',
              formData.orderType === type
                ? 'text-white bg-[#FF7A00]'
                : 'text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#1E2329]'
            )}
          >
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* FORM CONTENT - Optimized to fit without scroll                   */}
      {/* ================================================================ */}
      <div className="flex-1 px-3 py-2 space-y-2.5 overflow-y-auto">
        {/* Available Balance */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#848E9C]">Available</span>
          <span className="text-[11px] font-medium text-[#EAECEF]">{availableBalance} USDT</span>
        </div>

        {/* Order Price Input - LIMIT */}
        {formData.orderType === 'LIMIT' && (
          <div>
            <label className="text-[11px] text-[#848E9C] mb-1 block">Order Price</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder={currentPrice}
                className={cn(
                  'w-full h-9 px-3 pr-20 text-sm font-medium rounded',
                  'bg-[#1E2329] text-[#EAECEF] placeholder-[#5E6673]',
                  'border outline-none transition-all duration-200',
                  errors.price 
                    ? 'border-[#F6465D] focus:border-[#F6465D]' 
                    : 'border-[#2B3139] hover:border-[#FF7A00] focus:border-[#FF7A00]'
                )}
              />
              <button
                type="button"
                onClick={setLastPrice}
                className="absolute right-12 text-[10px] font-bold text-[#FF7A00] hover:text-[#FF8A20]
                           transition-colors px-1"
              >
                Last
              </button>
              <span className="absolute right-3 text-[11px] text-[#848E9C]">USDT</span>
            </div>
          </div>
        )}

        {/* Market Price Display - MARKET */}
        {formData.orderType === 'MARKET' && (
          <div className="flex items-center justify-between h-9 px-3 bg-[#1E2329] rounded border border-[#2B3139]">
            <span className="text-[11px] text-[#848E9C]">Market Price</span>
            <span className="text-sm font-semibold text-[#EAECEF]">{currentPrice}</span>
          </div>
        )}

        {/* Trigger Price - TRIGGER */}
        {formData.orderType === 'TRIGGER' && (
          <div>
            <label className="text-[11px] text-[#848E9C] mb-1 block">Trigger Price</label>
            <input
              type="text"
              value={formData.triggerPrice || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, triggerPrice: e.target.value }))}
              placeholder="0.00"
              className="w-full h-9 px-3 text-sm font-medium rounded
                         bg-[#1E2329] text-[#EAECEF] placeholder-[#5E6673]
                         border border-[#2B3139] hover:border-[#3D4450] focus:border-[#FF7A00]
                         outline-none transition-all duration-200"
            />
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <label className="text-[11px] text-[#848E9C] mb-1 block">Quantity</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0"
              className={cn(
                'w-full h-9 px-3 pr-16 text-sm font-medium rounded',
                'bg-[#1E2329] text-[#EAECEF] placeholder-[#5E6673]',
                'border outline-none transition-all duration-200',
                errors.quantity 
                  ? 'border-[#F6465D]' 
                  : 'border-[#2B3139] hover:border-[#3D4450] focus:border-[#FF7A00]'
              )}
            />
            <div className="absolute right-3 flex items-center gap-1 text-[11px] text-[#848E9C] cursor-pointer hover:text-[#EAECEF]"
                 onClick={() => setUiState((prev) => ({ ...prev, showUnitSettingsModal: true }))}
            >
              BTC
              <ChevronDown size={12} />
            </div>
          </div>
        </div>

        {/* Quantity Percentage Slider - Bitunix Style */}
        <div className="pt-1">
          <div className="relative h-1.5 bg-[#2B3139] rounded-full">
            {/* Progress Bar */}
            <div
              className="absolute h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${formData.quantityPercent}%`,
                backgroundColor: COLORS.orange,
              }}
            />
            {/* Dots */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => handleQuantityPercentChange(percent)}
                className={cn(
                  'absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all duration-200',
                  'hover:scale-125',
                  formData.quantityPercent >= percent
                    ? 'bg-[#FF7A00] border-[#FF7A00]'
                    : 'bg-[#0B0E11] border-[#5E6673] hover:border-[#848E9C]'
                )}
                style={{ left: `${percent}%`, transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </div>
          {/* Labels */}
          <div className="flex justify-between mt-1.5 text-[10px] text-[#5E6673]">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* TP/SL Toggle - Compact */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  tpsl: { ...prev.tpsl, enabled: !prev.tpsl.enabled },
                }))
              }
              className={cn(
                'w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
                'border-2 cursor-pointer',
                formData.tpsl.enabled
                  ? 'bg-[#FF7A00] border-[#FF7A00]'
                  : 'bg-transparent border-[#5E6673] group-hover:border-[#848E9C]'
              )}
            >
              {formData.tpsl.enabled && (
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </div>
            <span className="text-[11px] font-medium text-[#EAECEF]">TP / SL</span>
          </label>
        </div>

        {/* TP/SL Inputs - Inline */}
        {formData.tpsl.enabled && (
          <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-[10px] text-[#848E9C] mb-0.5 block">TP</label>
              <input
                type="text"
                value={formData.tpsl.takeProfitPrice || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tpsl: { ...prev.tpsl, takeProfitPrice: e.target.value },
                  }))
                }
                placeholder="Price (USDT)"
                className="w-full h-8 px-2.5 text-[11px] rounded
                           bg-[#1E2329] text-[#EAECEF] placeholder-[#5E6673]
                           border border-[#2B3139] hover:border-[#0D9D5F] focus:border-[#0D9D5F]
                           outline-none transition-all duration-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#848E9C] mb-0.5 block">SL</label>
              <input
                type="text"
                value={formData.tpsl.stopLossPrice || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tpsl: { ...prev.tpsl, stopLossPrice: e.target.value },
                  }))
                }
                placeholder="Price (USDT)"
                className="w-full h-8 px-2.5 text-[11px] rounded
                           bg-[#1E2329] text-[#EAECEF] placeholder-[#5E6673]
                           border border-[#2B3139] hover:border-[#C8102E] focus:border-[#C8102E]
                           outline-none transition-all duration-200"
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* ACTION BUTTONS - Open Long / Open Short                         */}
        {/* ================================================================ */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="submit"
            disabled={uiState.isSubmitting}
            onClick={() => setFormData((prev) => ({ ...prev, side: 'LONG' }))}
            className="h-10 rounded text-sm font-bold text-white
                       transition-all duration-200 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:brightness-110 active:brightness-90 active:scale-[0.98]"
            style={{ backgroundColor: COLORS.longGreen }}
          >
            {formData.action === 'OPEN' ? 'Open long' : 'Close short'}
          </button>
          <button
            type="submit"
            disabled={uiState.isSubmitting}
            onClick={() => setFormData((prev) => ({ ...prev, side: 'SHORT' }))}
            className="h-10 rounded text-sm font-bold text-white
                       transition-all duration-200 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:brightness-110 active:brightness-90 active:scale-[0.98]"
            style={{ backgroundColor: COLORS.shortRed }}
          >
            {formData.action === 'OPEN' ? 'Open short' : 'Close long'}
          </button>
        </div>

        {/* Cost Summary - Compact Two-Column */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-[#5E6673]">Cost</span>
            <span className="text-[#EAECEF]">{costEstimate.cost} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5E6673]">Cost</span>
            <span className="text-[#EAECEF]">{costEstimate.cost} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5E6673]">Max</span>
            <span className="text-[#EAECEF]">0.0 BTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5E6673]">Max</span>
            <span className="text-[#EAECEF]">0.0 BTC</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {uiState.errorMessage && (
        <div className="px-3 py-2 bg-[#F6465D]/10 border-t border-[#F6465D]/30 text-[#F6465D] text-[11px]">
          {uiState.errorMessage}
        </div>
      )}
    </form>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function calculateLiquidationPrice(
  entryPrice: Decimal,
  side: OrderSide,
  leverage: Decimal
): string {
  try {
    const maintenanceMarginRatio = new Decimal('0.005');
    if (side === 'LONG') {
      const denominator = new Decimal(1).minus(maintenanceMarginRatio.dividedBy(leverage));
      return entryPrice.times(denominator).toFixed(2);
    } else {
      const numerator = new Decimal(1).plus(maintenanceMarginRatio.dividedBy(leverage));
      return entryPrice.times(numerator).toFixed(2);
    }
  } catch {
    return '0';
  }
}
