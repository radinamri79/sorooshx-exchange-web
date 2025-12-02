'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatNumber, formatPrice, formatCurrency } from '@/lib/utils';
import { Slider } from '@/components/ui';
import { useMarketStore } from '@/stores/useMarketStore';
import { useTradeStore } from '@/stores/useTradeStore';
import type { OrderSide, OrderType, MarginMode } from '@/types';

// Form validation schema
const orderSchema = z.object({
  price: z.string().optional(),
  quantity: z.string().min(1, 'Required'),
  stopPrice: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  className?: string;
}

// Leverage presets
const LEVERAGE_PRESETS = [1, 5, 10, 25, 50, 75, 100, 125];

// Quantity presets as percentages
const QUANTITY_PRESETS = [25, 50, 75, 100];

export function OrderForm({ className }: OrderFormProps) {
  const t = useTranslations('trading.orderForm');
  const { currentSymbol, tickers } = useMarketStore();
  const { wallet, createOrder } = useTradeStore();
  
  // Form state
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [side, setSide] = useState<OrderSide>('buy');
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');
  const [leverage, setLeverage] = useState(10);
  const [showLeverageSlider, setShowLeverageSlider] = useState(false);
  const [quantityPercent, setQuantityPercent] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTicker = tickers[currentSymbol];
  const lastPrice = currentTicker ? parseFloat(currentTicker.c) : 0;
  const availableBalance = parseFloat(wallet.availableBalance);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      price: '',
      quantity: '',
      stopPrice: '',
    },
  });

  const price = watch('price');
  const quantity = watch('quantity');

  // Calculate maximum quantity user can buy/sell with their balance
  const maxQuantity = useMemo(() => {
    if (!lastPrice || lastPrice === 0) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    if (effectivePrice === 0) return 0;
    return (availableBalance * leverage) / effectivePrice;
  }, [availableBalance, leverage, lastPrice, orderType, price]);

  // Calculate margin required for current order
  const marginRequired = useMemo(() => {
    const qty = parseFloat(quantity || '0');
    if (!qty || qty === 0) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    return (qty * effectivePrice) / leverage;
  }, [quantity, leverage, lastPrice, orderType, price]);

  // Calculate order value
  const orderValue = useMemo(() => {
    const qty = parseFloat(quantity || '0');
    if (!qty) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    return qty * effectivePrice;
  }, [quantity, orderType, price, lastPrice]);

  // Handle quantity percentage selection
  const handleQuantityPercent = useCallback((percent: number) => {
    setQuantityPercent(percent);
    const qty = (maxQuantity * percent) / 100;
    const formattedQty = qty.toFixed(3);
    setValue('quantity', formattedQty);
  }, [maxQuantity, setValue]);

  // Handle leverage change
  const handleLeverageChange = useCallback((values: number[]) => {
    if (values[0] !== undefined) {
      setLeverage(values[0]);
    }
    setQuantityPercent(null);
  }, []);

  // Handle form submission
  const onSubmit = useCallback(async (data: OrderFormData) => {
    setIsSubmitting(true);
    
    try {
      createOrder({
        symbol: currentSymbol,
        side,
        orderType,
        price: orderType === 'limit' || orderType === 'stop_limit' ? data.price : undefined,
        stopPrice: orderType === 'stop_limit' || orderType === 'stop_market' ? data.stopPrice : undefined,
        quantity: data.quantity,
        leverage,
        marginMode,
      });
      
      reset();
      setQuantityPercent(null);
    } catch (error) {
      console.error('Order failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentSymbol, side, orderType, leverage, marginMode, createOrder, reset]);

  // Set price to last price
  const handleSetLastPrice = useCallback(() => {
    if (lastPrice) {
      setValue('price', formatPrice(lastPrice, 2));
    }
  }, [lastPrice, setValue]);

  // Base asset name (e.g., "BTC" from "BTCUSDT")
  const baseAsset = currentSymbol.replace('USDT', '');

  return (
    <div className={cn('flex flex-col bg-black', className)}>
      {/* Header with Margin Mode and Leverage */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2329]">
        <div className="flex items-center gap-2">
          {/* Margin Mode Toggle */}
          <div className="flex items-center bg-[#1a1a1a] rounded p-0.5">
            <button
              onClick={() => setMarginMode('cross')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                marginMode === 'cross'
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-[#848e9c] hover:text-white'
              )}
            >
              {t('cross')}
            </button>
            <button
              onClick={() => setMarginMode('isolated')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                marginMode === 'isolated'
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-[#848e9c] hover:text-white'
              )}
            >
              {t('isolated')}
            </button>
          </div>

          {/* Leverage Selector */}
          <button
            onClick={() => setShowLeverageSlider(!showLeverageSlider)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#1a1a1a] rounded text-[#ed7620] hover:bg-[#2a2a2a] transition-colors"
          >
            {leverage}x
            {showLeverageSlider ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* S Icon - Settings placeholder */}
        <span className="text-xs font-bold text-[#848e9c]">S</span>
      </div>

      {/* Leverage Slider (Collapsible) */}
      {showLeverageSlider && (
        <div className="px-3 py-3 border-b border-[#1e2329] bg-[#0a0a0a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#848e9c]">{t('leverage')}</span>
            <span className="text-sm font-medium text-[#ed7620]">{leverage}x</span>
          </div>
          <Slider
            value={[leverage]}
            min={1}
            max={125}
            step={1}
            onValueChange={handleLeverageChange}
            className="mb-3"
          />
          <div className="flex items-center gap-1 flex-wrap">
            {LEVERAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setLeverage(preset)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded transition-colors',
                  leverage === preset
                    ? 'bg-[#ed7620] text-white'
                    : 'bg-[#1a1a1a] text-[#848e9c] hover:text-white'
                )}
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order Type Tabs */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded p-0.5">
          {(['limit', 'market', 'stop_limit', 'stop_market'] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded transition-colors capitalize',
                orderType === type
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-[#848e9c] hover:text-white'
              )}
            >
              {type === 'stop_limit' ? 'Stop Limit' : type === 'stop_market' ? 'Stop Market' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-3">
        {/* Stop Price (for stop orders) */}
        {(orderType === 'stop_limit' || orderType === 'stop_market') && (
          <div>
            <label className="text-xs text-[#848e9c] mb-1 block">
              {t('stopPrice')}
            </label>
            <div className="relative">
              <input
                {...register('stopPrice')}
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#1e2329] rounded px-3 py-2 pr-14 text-white placeholder:text-[#5e6673] focus:outline-none focus:border-[#ed7620] text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">USDT</span>
            </div>
          </div>
        )}

        {/* Price Input (for limit orders) */}
        {(orderType === 'limit' || orderType === 'stop_limit') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[#848e9c]">
                {t('price')}
              </label>
              <button
                type="button"
                onClick={handleSetLastPrice}
                className="text-xs text-[#ed7620] hover:text-[#f19342]"
              >
                {t('lastPrice')}
              </button>
            </div>
            <div className="relative">
              <input
                {...register('price')}
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#1e2329] rounded px-3 py-2 pr-14 text-white placeholder:text-[#5e6673] focus:outline-none focus:border-[#ed7620] text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">USDT</span>
            </div>
          </div>
        )}

        {/* Market Price Display (for market orders) */}
        {orderType === 'market' && (
          <div className="p-2 bg-[#1a1a1a] rounded border border-[#1e2329]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#848e9c]">{t('marketPrice')}</span>
              <span className="text-white tabular-nums">
                {lastPrice ? formatPrice(lastPrice) : '--'} USDT
              </span>
            </div>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[#848e9c]">
              {t('amount')}
            </label>
            <span className="text-xs text-[#848e9c]">
              Max: {formatNumber(maxQuantity, { decimals: 3 })} {baseAsset}
            </span>
          </div>
          <div className="relative">
            <input
              {...register('quantity')}
              type="number"
              step="any"
              placeholder="0.000"
              className="w-full bg-[#1a1a1a] border border-[#1e2329] rounded px-3 py-2 pr-14 text-white placeholder:text-[#5e6673] focus:outline-none focus:border-[#ed7620] text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">{baseAsset}</span>
          </div>
          {errors.quantity && (
            <p className="text-xs text-[#ef5350] mt-1">{errors.quantity.message}</p>
          )}
        </div>

        {/* Quantity Percentage Buttons */}
        <div className="flex items-center gap-1">
          {QUANTITY_PRESETS.map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handleQuantityPercent(percent)}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
                quantityPercent === percent
                  ? 'bg-[#ed7620] text-white'
                  : 'bg-[#1a1a1a] text-[#848e9c] hover:text-white border border-[#1e2329]'
              )}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-2 py-2 border-t border-[#1e2329]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#848e9c]">Order Value</span>
            <span className="text-white tabular-nums">
              {formatCurrency(orderValue)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#848e9c] flex items-center gap-1">
              Margin <Info className="w-3 h-3" />
            </span>
            <span className="text-white tabular-nums">
              {formatCurrency(marginRequired)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#848e9c]">Available</span>
            <span className="text-white tabular-nums">
              {formatCurrency(wallet.availableBalance)} USDT
            </span>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || marginRequired > availableBalance}
            onClick={() => setSide('buy')}
            className="py-2.5 rounded font-semibold text-sm bg-[#26a69a] hover:bg-[#26a69a]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Buy/long
          </button>
          <button
            type="submit"
            disabled={isSubmitting || marginRequired > availableBalance}
            onClick={() => setSide('sell')}
            className="py-2.5 rounded font-semibold text-sm bg-[#ef5350] hover:bg-[#ef5350]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sell/short
          </button>
        </div>

        {/* Available Funds Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e2329]">
          <span className="text-xs text-[#848e9c]">Available Funds</span>
          <span className="text-sm text-white">{formatCurrency(wallet.availableBalance)} USDT</span>
        </div>

        {/* Deposit / Transfer Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 py-1.5 text-xs font-medium rounded border border-[#1e2329] text-[#848e9c] hover:text-white hover:border-[#2b3139] transition-colors"
          >
            Deposite
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 text-xs font-medium rounded border border-[#1e2329] text-[#848e9c] hover:text-white hover:border-[#2b3139] transition-colors"
          >
            Transfer
          </button>
        </div>
      </form>
    </div>
  );
}
