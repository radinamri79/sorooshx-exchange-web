'use client';

import { useState, useMemo } from 'react';
import Decimal from 'decimal.js';
import { cn } from '@/lib/utils';
import { useLeverageStore } from '@/stores/useLeverageStore';
import { FuturesUnitSettingsModal } from './modals/FuturesUnitSettingsModal';
import { AdjustLeverageModal } from './modals/AdjustLeverageModal';
import { TPSLSection } from './sections/TPSLSection';
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
    <form onSubmit={handleSubmit} className={cn("space-y-4 rounded-lg bg-gray-900 p-6", className)}>
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
        maxNominalValue={costEstimate.maxQuantity}
      />

      {/* Header: Margin Mode and Leverage */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-4">
        <div className="flex items-center gap-4">
          {/* Margin Mode Toggle */}
          <div className="flex gap-2 rounded-lg bg-gray-800 p-1">
            {(['ISOLATED', 'CROSS'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, marginMode: mode }))
                }
                className={`rounded px-3 py-1 text-sm font-semibold transition ${
                  formData.marginMode === mode
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Leverage Display */}
          <button
            type="button"
            onClick={() =>
              setUiState((prev) => ({ ...prev, showLeverageModal: true }))
            }
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1 text-sm font-semibold text-orange-400 transition hover:bg-gray-700"
          >
            <span>{currentLeverage}x</span>
            <span className="text-xs text-gray-400">{currentLeverage}x</span>
          </button>
        </div>

        {/* Futures Unit Settings Button */}
        <button
          type="button"
          onClick={() =>
            setUiState((prev) => ({ ...prev, showUnitSettingsModal: true }))
          }
          className="rounded-lg bg-gray-800 p-2 transition hover:bg-gray-700"
          title="Futures Unit Settings"
        >
          <Settings size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Position Action Tabs */}
      <div className="flex gap-3">
        {(['OPEN', 'CLOSE'] as const).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, action }))}
            className={`flex-1 rounded-lg py-2 font-semibold transition ${
              formData.action === action
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {(['LIMIT', 'MARKET', 'TRIGGER', 'TRAILING_STOP'] as const).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleOrderTypeChange(type)}
              className={`px-3 py-2 text-sm font-semibold transition ${
                formData.orderType === type
                  ? 'border-b-2 border-orange-500 text-orange-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          )
        )}
      </div>

      {/* Available Balance */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Available</span>
        <span className="text-white">{availableBalance}</span>
      </div>

      {/* Order Type Specific Inputs */}
      <div className="space-y-3">
        {/* Price Input (LIMIT) */}
        {formData.orderType === 'LIMIT' && (
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Order Price
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className={`flex-1 rounded-lg bg-gray-800 px-3 py-2 text-white outline-none transition focus:ring-2 ${
                  errors.price
                    ? 'ring-2 ring-red-500'
                    : 'focus:ring-orange-500'
                }`}
              />
              <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-gray-400 transition hover:text-white"
                >
                  +
                </button>
                <span className="text-sm text-gray-300">USDT</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-gray-400 transition hover:text-white"
                >
                  −
                </button>
              </div>
            </div>
            {errors.price && (
              <p className="mt-1 text-xs text-red-400">{errors.price}</p>
            )}
          </div>
        )}

        {/* Trigger Price (TRIGGER) */}
        {formData.orderType === 'TRIGGER' && (
          <>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Trigger Price
              </label>
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
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-white outline-none transition focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Price
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="Best market"
                  disabled
                  className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-gray-400"
                />
                <span className="flex items-center rounded-lg bg-gray-800 px-3 text-sm text-gray-300">
                  Market
                </span>
              </div>
            </div>
          </>
        )}

        {/* Trailing Stop Inputs (TRAILING_STOP) */}
        {formData.orderType === 'TRAILING_STOP' && (
          <>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Trailing Amount
              </label>
              <input
                type="number"
                value={formData.trailingAmount || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trailingAmount: e.target.value,
                  }))
                }
                placeholder="0.00"
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-white outline-none transition focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Base Price
              </label>
              <input
                type="text"
                value={currentPrice}
                disabled
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-gray-400"
              />
            </div>
          </>
        )}

        {/* Quantity Input */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Quantity</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="0"
            step="0.00000001"
            className={`w-full rounded-lg bg-gray-800 px-3 py-2 text-white outline-none transition focus:ring-2 ${
              errors.quantity ? 'ring-2 ring-red-500' : 'focus:ring-orange-500'
            }`}
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>
          )}
        </div>

        {/* Quantity Percentage Selector */}
        <div className="grid grid-cols-5 gap-2">
          {[0, 25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handleQuantityPercentChange(percent)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                formData.quantityPercent === percent
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* TP/SL Section */}
        <TPSLSection
          tpsl={formData.tpsl}
          onToggle={(enabled) =>
            setFormData((prev) => ({
              ...prev,
              tpsl: { ...prev.tpsl, enabled },
            }))
          }
          onTPChange={(price) =>
            setFormData((prev) => ({
              ...prev,
              tpsl: { ...prev.tpsl, takeProfitPrice: price },
            }))
          }
          onSLChange={(price) =>
            setFormData((prev) => ({
              ...prev,
              tpsl: { ...prev.tpsl, stopLossPrice: price },
            }))
          }
          onAdvancedToggle={(advanced) =>
            setFormData((prev) => ({
              ...prev,
              tpsl: { ...prev.tpsl, advancedMode: advanced },
            }))
          }
          errors={errors}
        />

        {/* Post-Only Option */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800/30 px-3 py-2">
          <input
            type="checkbox"
            checked={formData.postOnly}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, postOnly: e.target.checked }))
            }
            className="h-4 w-4 accent-orange-500"
          />
          <span className="text-sm text-gray-300">Post only</span>
        </label>
      </div>

      {/* Cost & Fee Information */}
      <div className="space-y-2 rounded-lg bg-gray-800/30 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Cost</span>
          <span className="text-white">{costEstimate.cost} USDT</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Max</span>
          <span className="text-white">
            {costEstimate.maxQuantity} BTC
          </span>
        </div>
        <div className="border-t border-gray-700 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Maintenance Margin</span>
            <span className="text-white">
              {costEstimate.maintenanceMargin} USDT
            </span>
          </div>
        </div>
      </div>

      {/* VIP & Fee Info */}
      <div className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">VIP 0</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-400">Maker 0.0200%</span>
          <span className="text-gray-400">Taker 0.0600%</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {uiState.errorMessage && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {uiState.errorMessage}
        </div>
      )}
      {uiState.successMessage && (
        <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {uiState.successMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button
          type="submit"
          disabled={uiState.isSubmitting}
          className={`rounded-lg py-3 font-semibold transition ${
            formData.side === 'LONG'
              ? 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-500/50'
              : 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-500/50'
          }`}
          onClick={() =>
            setFormData((prev) => ({ ...prev, side: 'LONG' }))
          }
        >
          {formData.action === 'OPEN' ? 'Open long' : 'Close short'}
        </button>
        <button
          type="submit"
          disabled={uiState.isSubmitting}
          className={`rounded-lg py-3 font-semibold transition ${
            formData.side === 'SHORT'
              ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-500/50'
              : 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-500/50'
          }`}
          onClick={() =>
            setFormData((prev) => ({ ...prev, side: 'SHORT' }))
          }
        >
          {formData.action === 'OPEN' ? 'Open short' : 'Close long'}
        </button>
      </div>
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
