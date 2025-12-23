'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { cn, formatNumber, formatPrice, formatCurrency } from '@/lib/utils';
import { Slider } from '@/components/ui';
import { useMarketStore } from '@/stores/useMarketStore';
import { useTradeStore } from '@/stores/useTradeStore';
import type { OrderSide, OrderType, MarginMode } from '@/types';

const orderSchema = z.object({
  price: z.string().optional(),
  quantity: z.string().min(1, 'Required'),
  stopPrice: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  className?: string;
}

const LEVERAGE_PRESETS = [1, 5, 10, 25, 50, 75, 100, 125];
const QUANTITY_PRESETS = [25, 50, 75, 100];

export function OrderForm({ className }: OrderFormProps) {
  const t = useTranslations('trading.orderForm');
  const { currentSymbol, tickers } = useMarketStore();
  const { wallet, createOrder } = useTradeStore();
  
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

  const maxQuantity = useMemo(() => {
    if (!lastPrice || lastPrice === 0) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    if (effectivePrice === 0) return 0;
    return (availableBalance * leverage) / effectivePrice;
  }, [availableBalance, leverage, lastPrice, orderType, price]);

  const marginRequired = useMemo(() => {
    const qty = parseFloat(quantity || '0');
    if (!qty || qty === 0) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    return (qty * effectivePrice) / leverage;
  }, [quantity, leverage, lastPrice, orderType, price]);

  const orderValue = useMemo(() => {
    const qty = parseFloat(quantity || '0');
    if (!qty) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    return qty * effectivePrice;
  }, [quantity, orderType, price, lastPrice]);

  const handleQuantityPercent = useCallback((percent: number) => {
    setQuantityPercent(percent);
    const qty = (maxQuantity * percent) / 100;
    const formattedQty = qty.toFixed(3);
    setValue('quantity', formattedQty);
  }, [maxQuantity, setValue]);

  const handleLeverageChange = useCallback((values: number[]) => {
    if (values[0] !== undefined) {
      setLeverage(values[0]);
    }
    setQuantityPercent(null);
  }, []);

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

  const handleSetLastPrice = useCallback(() => {
    if (lastPrice) {
      setValue('price', formatPrice(lastPrice, 2));
    }
  }, [lastPrice, setValue]);

  const baseAsset = currentSymbol.replace('USDT', '');

  return (
    <div className={cn('flex flex-col bg-transparent', className)}>
      {/* Header with Margin Mode and Leverage - Compact */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2a2a2d]">
        <div className="flex items-center gap-1.5">
          {/* Margin Mode Toggle */}
          <div className="flex items-center bg-[#17181b] rounded p-0.5">
            <button
              onClick={() => setMarginMode('cross')}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                marginMode === 'cross'
                  ? 'bg-[#2a2a2d] text-[#f5f5f5]'
                  : 'text-[#6b6b6b] hover:text-[#a1a1a1]'
              )}
            >
              {t('cross')}
            </button>
            <button
              onClick={() => setMarginMode('isolated')}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                marginMode === 'isolated'
                  ? 'bg-[#2a2a2d] text-[#f5f5f5]'
                  : 'text-[#6b6b6b] hover:text-[#a1a1a1]'
              )}
            >
              {t('isolated')}
            </button>
          </div>

          {/* Leverage Selector */}
          <button
            onClick={() => setShowLeverageSlider(!showLeverageSlider)}
            className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold bg-[#17181b] rounded text-[#ed7620] hover:bg-[#1e1f23] transition-colors"
          >
            {leverage}x
            {showLeverageSlider ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {/* Leverage Slider (Collapsible) */}
      {showLeverageSlider && (
        <div className="px-2 py-2 border-b border-[#2a2a2d] bg-[#121214]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-[#6b6b6b]">{t('leverage')}</span>
            <span className="text-xs font-bold text-[#ed7620]">{leverage}x</span>
          </div>
          <Slider
            value={[leverage]}
            min={1}
            max={125}
            step={1}
            onValueChange={handleLeverageChange}
            className="mb-2"
          />
          <div className="flex items-center gap-0.5 flex-wrap">
            {LEVERAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setLeverage(preset)}
                className={cn(
                  'px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors',
                  leverage === preset
                    ? 'bg-[#ed7620] text-white'
                    : 'bg-[#17181b] text-[#6b6b6b] hover:text-[#a1a1a1] border border-[#2a2a2d]'
                )}
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order Type Tabs - Compact */}
      <div className="px-2 pt-2">
        <div className="flex items-center gap-0.5 bg-[#17181b] rounded p-0.5">
          {(['limit', 'market', 'stop_limit', 'stop_market'] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={cn(
                'flex-1 py-1 text-[10px] font-medium rounded transition-colors capitalize',
                orderType === type
                  ? 'bg-[#2a2a2d] text-[#f5f5f5]'
                  : 'text-[#6b6b6b] hover:text-[#a1a1a1]'
              )}
            >
              {type === 'stop_limit' ? 'Stop' : type === 'stop_market' ? 'StopMkt' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-2 space-y-2">
        {/* Stop Price (for stop orders) */}
        {(orderType === 'stop_limit' || orderType === 'stop_market') && (
          <div>
            <label className="text-[9px] text-[#6b6b6b] mb-1 block">{t('stopPrice')}</label>
            <div className="relative">
              <input
                {...register('stopPrice')}
                type="number"
                step="any"
                placeholder="0.00"
                className="w-full bg-[#17181b] border border-[#2a2a2d] rounded px-2 py-1.5 pr-12 text-[#f5f5f5] placeholder:text-[#4a4a4a] focus:outline-none focus:border-[#ed7620] text-xs"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#6b6b6b]">USDT</span>
            </div>
          </div>
        )}

        {/* Price Input (for limit orders) */}
        {(orderType === 'limit' || orderType === 'stop_limit') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] text-[#6b6b6b]">{t('price')}</label>
              <button
                type="button"
                onClick={handleSetLastPrice}
                className="text-[9px] text-[#ed7620] hover:text-[#ff8c3a]"
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
                className="w-full bg-[#17181b] border border-[#2a2a2d] rounded px-2 py-1.5 pr-12 text-[#f5f5f5] placeholder:text-[#4a4a4a] focus:outline-none focus:border-[#ed7620] text-xs"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#6b6b6b]">USDT</span>
            </div>
          </div>
        )}

        {/* Market Price Display (for market orders) */}
        {orderType === 'market' && (
          <div className="p-2 bg-[#17181b] rounded border border-[#2a2a2d]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b6b6b] text-[9px]">{t('marketPrice')}</span>
              <span className="text-[#f5f5f5] tabular-nums text-xs font-medium">
                {lastPrice ? formatPrice(lastPrice) : '--'}
              </span>
            </div>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9px] text-[#6b6b6b]">{t('amount')}</label>
            <span className="text-[9px] text-[#6b6b6b]">
              Max: <span className="text-[#a1a1a1]">{formatNumber(maxQuantity, { decimals: 3 })}</span>
            </span>
          </div>
          <div className="relative">
            <input
              {...register('quantity')}
              type="number"
              step="any"
              placeholder="0.000"
              className="w-full bg-[#17181b] border border-[#2a2a2d] rounded px-2 py-1.5 pr-12 text-[#f5f5f5] placeholder:text-[#4a4a4a] focus:outline-none focus:border-[#ed7620] text-xs"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#6b6b6b]">{baseAsset}</span>
          </div>
          {errors.quantity && (
            <p className="text-[9px] text-[#ef5350] mt-0.5">{errors.quantity.message}</p>
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
                'flex-1 py-1 text-[9px] font-medium rounded transition-colors',
                quantityPercent === percent
                  ? 'bg-[#ed7620] text-white'
                  : 'bg-[#17181b] text-[#6b6b6b] hover:text-[#a1a1a1] border border-[#2a2a2d]'
              )}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Order Summary - Compact */}
        <div className="space-y-1 py-1.5 border-t border-[#2a2a2d]">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-[#6b6b6b]">Order Value</span>
            <span className="text-[#f5f5f5] tabular-nums">{formatCurrency(orderValue)}</span>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-[#6b6b6b] flex items-center gap-0.5">
              Margin <Info className="w-2.5 h-2.5" />
            </span>
            <span className="text-[#f5f5f5] tabular-nums">{formatCurrency(marginRequired)}</span>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="submit"
            disabled={isSubmitting || marginRequired > availableBalance}
            onClick={() => setSide('buy')}
            className="py-2 rounded font-semibold text-xs bg-[#26a69a] hover:bg-[#2db8ab] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Buy/Long
          </button>
          <button
            type="submit"
            disabled={isSubmitting || marginRequired > availableBalance}
            onClick={() => setSide('sell')}
            className="py-2 rounded font-semibold text-xs bg-[#ef5350] hover:bg-[#ff6361] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sell/Short
          </button>
        </div>

        {/* Available Funds Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#2a2a2d]">
          <span className="text-[9px] text-[#6b6b6b] flex items-center gap-0.5">
            <Wallet className="w-3 h-3" />
            Available
          </span>
          <span className="text-xs text-[#f5f5f5] font-medium">{formatCurrency(wallet.availableBalance)}</span>
        </div>

        {/* Deposit / Transfer Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex-1 py-1.5 text-[9px] font-medium rounded border border-[#2a2a2d] text-[#6b6b6b] hover:text-[#a1a1a1] hover:border-[#363639] transition-colors bg-[#17181b]"
          >
            Deposit
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 text-[9px] font-medium rounded border border-[#2a2a2d] text-[#6b6b6b] hover:text-[#a1a1a1] hover:border-[#363639] transition-colors bg-[#17181b]"
          >
            Transfer
          </button>
        </div>
      </form>
    </div>
  );
}
