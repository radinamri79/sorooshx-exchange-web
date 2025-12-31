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
import { Settings } from 'lucide-react';

interface OrderFormProps {
  className?: string;
  currentPrice?: string;
  availableBalance?: string;
  onSubmit?: (formData: OrderFormState) => Promise<void>;
}

const INITIAL_STATE: OrderFormState = {
  action: 'OPEN',
  side: 'LONG',
  marginMode: 'ISOLATED',
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
};

export function OrderForm({
  className,
  currentPrice = '88750.00',
  availableBalance = '10000.00',
  onSubmit,
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormState>(INITIAL_STATE);
  const [uiState, setUiState] = useState<OrderFormUIState>(INITIAL_UI_STATE);
  const [errors, setErrors] = useState<OrderFormErrors>({});

  const { longLeverage, shortLeverage } = useLeverageStore();

  const currentLeverage =
    formData.side === 'LONG' ? longLeverage : shortLeverage;

  // Calculate order cost and estimates
  const costEstimate = useMemo((): OrderCostEstimate => {
    if (!formData.price || !formData.quantity) {
      return {
        cost: '0',
        maxQuantity: '0',
        maintenanceMargin: '0',
      };
    }

    try {
      const price = new Decimal(formData.price);
      const quantity = new Decimal(formData.quantity);
      const leverage = new Decimal(currentLeverage);

      const totalValue = price.times(quantity);
      const cost = totalValue.dividedBy(leverage);
      const maintenanceMargin = totalValue.times(new Decimal('0.005')); // 0.5% MMR

      // Max quantity based on available balance and leverage
      const availableForOrder = new Decimal(availableBalance).times(leverage);
      const maxQty = availableForOrder.dividedBy(price);

      return {
        cost: cost.toFixed(2),
        maxQuantity: maxQty.toFixed(8),
        maintenanceMargin: maintenanceMargin.toFixed(2),
        estimatedPnL: '0',
        liquidationPrice: calculateLiquidationPrice(
          price,
          formData.side,
          leverage
        ),
      };
    } catch {
      return {
        cost: '0',
        maxQuantity: '0',
        maintenanceMargin: '0',
      };
    }
  }, [formData.price, formData.quantity, currentLeverage, availableBalance]);

  // Handle form field changes
  const handleOrderTypeChange = (type: OrderFormType) => {
    setFormData((prev) => ({
      ...prev,
      orderType: type,
      price: '',
      triggerPrice: '',
      trailingAmount: '',
    }));
    setErrors({});
  };

  const handlePriceChange = (price: string) => {
    setFormData((prev) => ({ ...prev, price }));
    if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
  };

  const handleQuantityChange = (quantity: string) => {
    setFormData((prev) => ({
      ...prev,
      quantity,
      quantityPercent: 0,
    }));
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
      // Handle calculation error silently
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
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
      setUiState((prev) => ({
        ...prev,
        successMessage: 'Order placed successfully!',
      }));
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
    <form onSubmit={handleSubmit} className={cn("flex flex-col bg-[#0d0d0f] border border-gray-800 rounded-lg overflow-hidden", className)}>
      {/* Modals */}
      <FuturesUnitSettingsModal
        isOpen={uiState.showUnitSettingsModal}
        onClose={() =>
          setUiState((prev) => ({ ...prev, showUnitSettingsModal: false }))
        }
      />
      <AdjustLeverageModal
        isOpen={uiState.showLeverageModal}
        onClose={() =>
          setUiState((prev) => ({ ...prev, showLeverageModal: false }))
        }
      />

      {/* Compact Header: Margin Mode and Leverage */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {/* Margin Mode Toggle - Compact */}
          <div className="flex gap-0.5 rounded bg-gray-900 p-0.5">
            {(['ISOLATED', 'CROSS'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, marginMode: mode }))
                }
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  formData.marginMode === mode
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {mode === 'ISOLATED' ? 'ISO' : 'CRS'}
              </button>
            ))}
          </div>

          {/* Leverage Display - Compact */}
          <button
            type="button"
            onClick={() =>
              setUiState((prev) => ({ ...prev, showLeverageModal: true }))
            }
            className="rounded px-2 py-0.5 text-[11px] font-bold bg-gray-900 text-orange-500 hover:bg-gray-800 transition"
          >
            {currentLeverage}x
          </button>
        </div>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() =>
            setUiState((prev) => ({ ...prev, showUnitSettingsModal: true }))
          }
          className="text-gray-500 hover:text-gray-300 transition"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Position & Order Type Tabs - Two rows for better fit */}
      <div className="px-2 py-1.5 border-b border-gray-800 space-y-1.5">
        {/* Action Tabs (Open/Close) */}
        <div className="flex gap-1">
          {(['OPEN', 'CLOSE'] as const).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, action }))}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-semibold transition ${
                formData.action === action
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-500 hover:bg-gray-800'
              }`}
            >
              {action}
            </button>
          ))}
        </div>

        {/* Order Type Tabs */}
        <div className="flex gap-0.5 bg-gray-900 rounded p-0.5">
          {(['LIMIT', 'MARKET', 'TRIGGER'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleOrderTypeChange(type)}
              className={`flex-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                formData.orderType === type
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {/* Available Balance */}
        <div className="flex items-center justify-between text-[11px] bg-gray-900 rounded px-2 py-1.5">
          <span className="text-gray-500">Available:</span>
          <span className="text-white font-semibold">{availableBalance} USDT</span>
        </div>

        {/* Price Input (LIMIT) */}
        {formData.orderType === 'LIMIT' && (
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Price</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className={`w-full rounded px-2 py-1 text-[12px] bg-gray-900 text-white outline-none border transition ${
                errors.price
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-800 focus:border-orange-500'
              }`}
            />
          </div>
        )}

        {/* Market Price (MARKET) */}
        {formData.orderType === 'MARKET' && (
          <div className="bg-gray-900 rounded px-2 py-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Market Price</span>
              <span className="text-white font-semibold">{currentPrice}</span>
            </div>
          </div>
        )}

        {/* Trigger Price (TRIGGER) */}
        {formData.orderType === 'TRIGGER' && (
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Trigger Price</label>
            <input
              type="number"
              value={formData.triggerPrice || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  triggerPrice: e.target.value,
                }))
              }
              placeholder="0.00"
              className="w-full rounded px-2 py-1 text-[12px] bg-gray-900 text-white outline-none border border-gray-800 focus:border-orange-500 transition"
            />
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[10px] text-gray-500">Quantity</label>
            <span className="text-[10px] text-gray-500">Max: {costEstimate.maxQuantity}</span>
          </div>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="0"
            step="0.00000001"
            className={`w-full rounded px-2 py-1 text-[12px] bg-gray-900 text-white outline-none border transition ${
              errors.quantity ? 'border-red-500 focus:border-red-600' : 'border-gray-800 focus:border-orange-500'
            }`}
          />
        </div>

        {/* Quantity Percentage Selector - Compact */}
        <div className="grid grid-cols-5 gap-0.5">
          {[0, 25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handleQuantityPercentChange(percent)}
              className={`rounded px-1 py-1 text-[10px] font-semibold transition ${
                formData.quantityPercent === percent
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-500 hover:bg-gray-800'
              }`}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* TP/SL - Compact Version */}
        <div className="border-t border-gray-800 pt-2">
          <label className="flex items-center gap-2 cursor-pointer mb-1.5">
            <input
              type="checkbox"
              checked={formData.tpsl.enabled}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  tpsl: { ...prev.tpsl, enabled: e.target.checked },
                }))
              }
              className="w-3.5 h-3.5 accent-orange-500"
            />
            <span className="text-[11px] font-semibold text-white">TP / SL</span>
          </label>

          {formData.tpsl.enabled && (
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">TP Price</label>
                <input
                  type="number"
                  value={formData.tpsl.takeProfitPrice || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tpsl: { ...prev.tpsl, takeProfitPrice: e.target.value },
                    }))
                  }
                  placeholder="TP"
                  className="w-full rounded px-2 py-1 text-[11px] bg-gray-900 text-white outline-none border border-gray-800 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">SL Price</label>
                <input
                  type="number"
                  value={formData.tpsl.stopLossPrice || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tpsl: { ...prev.tpsl, stopLossPrice: e.target.value },
                    }))
                  }
                  placeholder="SL"
                  className="w-full rounded px-2 py-1 text-[11px] bg-gray-900 text-white outline-none border border-gray-800 focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Post-Only Option - Compact */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.postOnly}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, postOnly: e.target.checked }))
            }
            className="w-3.5 h-3.5 accent-orange-500"
          />
          <span className="text-[11px] text-gray-400">Post only</span>
        </label>

        {/* Cost Summary - Compact */}
        <div className="border-t border-gray-800 pt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Cost:</span>
            <span className="text-white font-semibold">{costEstimate.cost} USDT</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">MMR:</span>
            <span className="text-white font-semibold">{costEstimate.maintenanceMargin} USDT</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">VIP 0 Fee:</span>
            <span className="text-white font-semibold">0.02% / 0.06%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed Bottom */}
      <div className="border-t border-gray-800 grid grid-cols-2 gap-1.5 p-2.5">
        <button
          type="submit"
          disabled={uiState.isSubmitting}
          onClick={() => setFormData((prev) => ({ ...prev, side: 'LONG' }))}
          className="rounded py-2 text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition disabled:opacity-50"
        >
          {formData.action === 'OPEN' ? 'Open Long' : 'Close Short'}
        </button>
        <button
          type="submit"
          disabled={uiState.isSubmitting}
          onClick={() => setFormData((prev) => ({ ...prev, side: 'SHORT' }))}
          className="rounded py-2 text-[12px] font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition disabled:opacity-50"
        >
          {formData.action === 'OPEN' ? 'Open Short' : 'Close Long'}
        </button>
      </div>

      {/* Error Message */}
      {uiState.errorMessage && (
        <div className="px-2.5 py-1.5 bg-red-500/10 border-t border-red-500/30 text-red-400 text-[11px]">
          {uiState.errorMessage}
        </div>
      )}
    </form>
  );
}

/**
 * Calculate liquidation price based on entry price, side, and leverage
 */
function calculateLiquidationPrice(
  entryPrice: Decimal,
  side: OrderSide,
  leverage: Decimal
): string {
  try {
    const maintenanceMarginRatio = new Decimal('0.005'); // 0.5%
    
    if (side === 'LONG') {
      // For long: liquidation = entry * (1 - MMR / leverage)
      const denominator = new Decimal(1).minus(
        maintenanceMarginRatio.dividedBy(leverage)
      );
      return entryPrice.times(denominator).toFixed(2);
    } else {
      // For short: liquidation = entry * (1 + MMR / leverage)
      const numerator = new Decimal(1).plus(
        maintenanceMarginRatio.dividedBy(leverage)
      );
      return entryPrice.times(numerator).toFixed(2);
    }
  } catch {
    return '0';
  }
}
