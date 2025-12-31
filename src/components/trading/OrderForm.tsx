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
  errorMessage: '',
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
    <form onSubmit={handleSubmit} className={cn("flex flex-col bg-black border border-gray-800 rounded-lg overflow-hidden", className)}>
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

      {/* Header: Margin Mode and Leverage */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Margin Mode Toggle */}
          <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
            {(['ISOLATED', 'CROSS'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, marginMode: mode }))
                }
                className={`rounded px-3 py-1 text-xs font-semibold transition ${
                  formData.marginMode === mode
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {mode === 'ISOLATED' ? 'ISO' : 'CRS'}
              </button>
            ))}
          </div>

          {/* Leverage Display - Shows Long/Short with colors */}
          <button
            type="button"
            onClick={() =>
              setUiState((prev) => ({ ...prev, showLeverageModal: true }))
            }
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 bg-gray-900 hover:bg-gray-800 transition border border-gray-700 cursor-pointer"
          >
            <span className="text-sm font-bold text-emerald-500">{longLeverage}X</span>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-sm font-bold text-red-500">{shortLeverage}X</span>
          </button>
        </div>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() =>
            setUiState((prev) => ({ ...prev, showUnitSettingsModal: true }))
          }
          className="text-gray-500 hover:text-gray-300 transition p-1"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Position & Order Type Tabs */}
      <div className="px-4 py-2.5 border-b border-gray-800 space-y-2">
        {/* Action Tabs (Open/Close) */}
        <div className="flex gap-2">
          {(['OPEN', 'CLOSE'] as const).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, action }))}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                formData.action === action
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {action}
            </button>
          ))}
        </div>

        {/* Order Type Tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(['LIMIT', 'MARKET', 'TRIGGER'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleOrderTypeChange(type)}
              className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Available Balance */}
        <div className="flex items-center justify-between text-sm bg-gray-900 rounded-lg px-3 py-2">
          <span className="text-gray-400">Available:</span>
          <span className="text-white font-semibold">{availableBalance} USDT</span>
        </div>

        {/* Price Input (LIMIT) */}
        {formData.orderType === 'LIMIT' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Order Price</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className={`w-full rounded-lg px-3 py-2 text-sm bg-gray-900 text-white outline-none border transition ${
                errors.price
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-800 focus:border-orange-500'
              }`}
            />
          </div>
        )}

        {/* Market Price (MARKET) */}
        {formData.orderType === 'MARKET' && (
          <div className="bg-gray-900 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Market Price</span>
              <span className="text-white font-semibold">{currentPrice}</span>
            </div>
          </div>
        )}

        {/* Trigger Price (TRIGGER) */}
        {formData.orderType === 'TRIGGER' && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Trigger Price</label>
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
              className="w-full rounded-lg px-3 py-2 text-sm bg-gray-900 text-white outline-none border border-gray-800 focus:border-orange-500 transition"
            />
          </div>
        )}

        {/* Quantity Input with Leverage Indicator */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">Quantity {currentLeverage ? `(${currentLeverage}x)` : ''}</label>
            <span className="text-xs text-gray-500">Max: {costEstimate.maxQuantity}</span>
          </div>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="0"
            step="0.00000001"
            className={`w-full rounded-lg px-3 py-2.5 text-sm bg-gray-900 text-white outline-none border transition ${
              errors.quantity ? 'border-red-500 focus:border-red-600' : 'border-gray-800 focus:border-orange-500'
            }`}
          />
        </div>

        {/* Quantity Percentage Selector */}
        <div className="grid grid-cols-5 gap-1">
          {[0, 25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handleQuantityPercentChange(percent)}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                formData.quantityPercent === percent
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-500 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* TP/SL Section */}
        <div className="border-t border-gray-800 pt-2">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={formData.tpsl.enabled}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  tpsl: { ...prev.tpsl, enabled: e.target.checked },
                }))
              }
              className="w-4 h-4 accent-orange-500 rounded cursor-pointer bg-black border-gray-700 border"
            />
            <span className="text-sm font-semibold text-white">TP / SL</span>
          </label>

          {formData.tpsl.enabled && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Take Profit</label>
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
                  className="w-full rounded px-3 py-1.5 text-sm bg-gray-900 text-white outline-none border border-gray-800 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">SL Price</label>
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
                  className="w-full rounded px-3 py-1.5 text-sm bg-gray-900 text-white outline-none border border-gray-800 focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Post-Only Option */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.postOnly}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, postOnly: e.target.checked }))
            }
            className="w-4 h-4 accent-orange-500 rounded cursor-pointer bg-black border-gray-700 border"
          />
          <span className="text-sm text-gray-400">Post only</span>
        </label>

        {/* Cost Summary */}
        <div className="border-t border-gray-800 pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Cost:</span>
            <span className="text-white font-semibold">{costEstimate.cost} USDT</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">MMR:</span>
            <span className="text-white font-semibold">{costEstimate.maintenanceMargin} USDT</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">VIP 0 Fee:</span>
            <span className="text-white font-semibold">0.02% / 0.06%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed Bottom */}
      <div className="border-t border-gray-800 grid grid-cols-2 gap-2 p-4">
        <button
          type="submit"
          disabled={uiState.isSubmitting}
          onClick={() => setFormData((prev) => ({ ...prev, side: 'LONG' }))}
          className="rounded-lg py-3 text-sm font-bold bg-green-600 hover:bg-green-700 active:bg-green-800 text-white transition disabled:opacity-50"
        >
          {formData.action === 'OPEN' ? 'Open Long' : 'Close Short'}
        </button>
        <button
          type="submit"
          disabled={uiState.isSubmitting}
          onClick={() => setFormData((prev) => ({ ...prev, side: 'SHORT' }))}
          className="rounded-lg py-3 text-sm font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition disabled:opacity-50"
        >
          {formData.action === 'OPEN' ? 'Open Short' : 'Close Long'}
        </button>
      </div>

      {/* Error Message */}
      {uiState.errorMessage && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30 text-red-400 text-xs">
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
