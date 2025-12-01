'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatNumber, formatPrice, formatCurrency } from '@/lib/utils';
import { Button, Input, Slider, Tabs, TabsList, TabsTrigger } from '@/components/ui';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    
    // Available balance * leverage / price = max quantity
    return (availableBalance * leverage) / effectivePrice;
  }, [availableBalance, leverage, lastPrice, orderType, price]);

  // Calculate margin required for current order
  const marginRequired = useMemo(() => {
    const qty = parseFloat(quantity || '0');
    if (!qty || qty === 0) return 0;
    const effectivePrice = orderType === 'market' ? lastPrice : parseFloat(price || '0') || lastPrice;
    
    // Margin = (quantity * price) / leverage
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
    // Get base asset precision (assume 3 decimals for most assets)
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
      
      // Reset form after successful order
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
    <div className={cn('flex flex-col bg-background-secondary rounded-lg border border-border', className)}>
      {/* Header with Margin Mode and Leverage */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Margin Mode Toggle */}
          <div className="flex items-center bg-background-tertiary rounded-md p-0.5">
            <button
              onClick={() => setMarginMode('cross')}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded transition-colors',
                marginMode === 'cross'
                  ? 'bg-background-primary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {t('cross')}
            </button>
            <button
              onClick={() => setMarginMode('isolated')}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded transition-colors',
                marginMode === 'isolated'
                  ? 'bg-background-primary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {t('isolated')}
            </button>
          </div>

          {/* Leverage Selector */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-background-tertiary rounded-md text-brand-400 hover:bg-background-primary transition-colors"
          >
            {leverage}x
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <button className="p-1 text-text-muted hover:text-text-primary transition-colors">
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Leverage Slider (Collapsible) */}
      {showAdvanced && (
        <div className="px-3 py-3 border-b border-border bg-background-tertiary/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">{t('leverage')}</span>
            <span className="text-sm font-medium text-brand-400">{leverage}x</span>
          </div>
          <Slider
            value={[leverage]}
            min={1}
            max={125}
            step={1}
            onValueChange={handleLeverageChange}
            className="mb-2"
          />
          <div className="flex items-center gap-1 flex-wrap">
            {LEVERAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setLeverage(preset)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded transition-colors',
                  leverage === preset
                    ? 'bg-brand-500 text-white'
                    : 'bg-background-tertiary text-text-secondary hover:text-text-primary'
                )}
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order Type Tabs */}
      <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)} className="px-3 pt-3">
        <TabsList className="w-full grid grid-cols-4 gap-1 bg-transparent border-0 p-0">
          <TabsTrigger
            value="limit"
            className="text-xs data-[state=active]:bg-background-tertiary data-[state=active]:border-0"
          >
            {t('limit')}
          </TabsTrigger>
          <TabsTrigger
            value="market"
            className="text-xs data-[state=active]:bg-background-tertiary data-[state=active]:border-0"
          >
            {t('market')}
          </TabsTrigger>
          <TabsTrigger
            value="stop_limit"
            className="text-xs data-[state=active]:bg-background-tertiary data-[state=active]:border-0"
          >
            {t('stopLimit')}
          </TabsTrigger>
          <TabsTrigger
            value="stop_market"
            className="text-xs data-[state=active]:bg-background-tertiary data-[state=active]:border-0"
          >
            {t('stopMarket')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Order Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-3">
        {/* Stop Price (for stop orders) */}
        {(orderType === 'stop_limit' || orderType === 'stop_market') && (
          <div>
            <label className="text-xs text-text-muted mb-1 block">
              {t('stopPrice')}
            </label>
            <Input
              {...register('stopPrice')}
              type="number"
              step="any"
              placeholder="0.00"
              suffix="USDT"
              error={!!errors.stopPrice}
            />
          </div>
        )}

        {/* Price Input (for limit orders) */}
        {(orderType === 'limit' || orderType === 'stop_limit') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-text-muted">
                {t('price')}
              </label>
              <button
                type="button"
                onClick={handleSetLastPrice}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                {t('lastPrice')}
              </button>
            </div>
            <Input
              {...register('price')}
              type="number"
              step="any"
              placeholder="0.00"
              suffix="USDT"
              error={!!errors.price}
            />
          </div>
        )}

        {/* Market Price Display (for market orders) */}
        {orderType === 'market' && (
          <div className="p-2 bg-background-tertiary rounded-md">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{t('marketPrice')}</span>
              <span className="text-text-primary tabular-nums">
                {lastPrice ? formatPrice(lastPrice) : '--'} USDT
              </span>
            </div>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-text-muted">
              {t('amount')}
            </label>
            <span className="text-xs text-text-muted">
              {t('max')}: {formatNumber(maxQuantity, { decimals: 3 })} {baseAsset}
            </span>
          </div>
          <Input
            {...register('quantity')}
            type="number"
            step="any"
            placeholder="0.000"
            suffix={baseAsset}
            error={!!errors.quantity}
          />
          {errors.quantity && (
            <p className="text-xs text-trading-short mt-1">{errors.quantity.message}</p>
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
                'flex-1 py-1 text-xs font-medium rounded transition-colors',
                quantityPercent === percent
                  ? 'bg-brand-500 text-white'
                  : 'bg-background-tertiary text-text-secondary hover:text-text-primary'
              )}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-1.5 py-2 border-y border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{t('orderValue')}</span>
            <span className="text-text-primary tabular-nums">
              {formatCurrency(orderValue)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1">
              {t('margin')}
              <Info className="w-3 h-3" />
            </span>
            <span className="text-text-primary tabular-nums">
              {formatCurrency(marginRequired)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{t('available')}</span>
            <span className="text-text-primary tabular-nums">
              {formatCurrency(wallet.availableBalance)}
            </span>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="submit"
            variant="long"
            size="lg"
            disabled={isSubmitting || marginRequired > availableBalance}
            onClick={() => setSide('buy')}
            className="font-semibold"
          >
            {t('buy')} / {t('long')}
          </Button>
          <Button
            type="submit"
            variant="short"
            size="lg"
            disabled={isSubmitting || marginRequired > availableBalance}
            onClick={() => setSide('sell')}
            className="font-semibold"
          >
            {t('sell')} / {t('short')}
          </Button>
        </div>
      </form>
    </div>
  );
}
