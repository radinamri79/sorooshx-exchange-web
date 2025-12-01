'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronRight } from 'lucide-react';
import { cn, formatPrice, formatNumber, formatCurrency } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent, Button } from '@/components/ui';
import { useTradeStore } from '@/stores/useTradeStore';
import { useMarketStore } from '@/stores/useMarketStore';
import type { Position, OrderStatus } from '@/types';

interface OrdersPanelProps {
  className?: string;
}

type TabValue = 'positions' | 'openOrders' | 'orderHistory';

export function OrdersPanel({ className }: OrdersPanelProps) {
  const t = useTranslations('trading');
  const { currentSymbol, tickers } = useMarketStore();
  const { orders, positions, cancelOrder, closePosition } = useTradeStore();
  const [activeTab, setActiveTab] = useState<TabValue>('positions');
  const [showAllSymbols, setShowAllSymbols] = useState(false);

  // Filter orders/positions
  const filteredPositions = useMemo(() => {
    const openPositions = positions.filter((p) => p.isOpen);
    if (showAllSymbols) return openPositions;
    return openPositions.filter((p) => p.symbol === currentSymbol);
  }, [positions, currentSymbol, showAllSymbols]);

  const openOrders = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'open' || o.status === 'pending');
    if (showAllSymbols) return pending;
    return pending.filter((o) => o.symbol === currentSymbol);
  }, [orders, currentSymbol, showAllSymbols]);

  const orderHistory = useMemo(() => {
    const history = orders.filter(
      (o) => o.status === 'filled' || o.status === 'cancelled' || o.status === 'rejected'
    );
    if (showAllSymbols) return history;
    return history.filter((o) => o.symbol === currentSymbol);
  }, [orders, currentSymbol, showAllSymbols]);

  // Calculate unrealized PnL for positions
  const getUnrealizedPnl = useCallback((position: Position) => {
    const ticker = tickers[position.symbol];
    if (!ticker) return { pnl: 0, roe: 0 };
    
    const currentPrice = parseFloat(ticker.c);
    const entryPrice = parseFloat(position.entryPrice);
    const quantity = parseFloat(position.quantity);
    const margin = parseFloat(position.margin);
    
    let pnl = 0;
    if (position.side === 'long') {
      pnl = (currentPrice - entryPrice) * quantity;
    } else {
      pnl = (entryPrice - currentPrice) * quantity;
    }
    
    const roe = margin > 0 ? (pnl / margin) * 100 : 0;
    
    return { pnl, roe };
  }, [tickers]);

  // Handle cancel order
  const handleCancelOrder = useCallback((orderId: string) => {
    cancelOrder(orderId);
  }, [cancelOrder]);

  // Handle close position
  const handleClosePosition = useCallback((positionId: string) => {
    closePosition(positionId);
  }, [closePosition]);

  // Get status color
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'filled':
        return 'text-trading-long';
      case 'cancelled':
      case 'rejected':
        return 'text-text-muted';
      case 'open':
      case 'pending':
        return 'text-brand-400';
      case 'partially_filled':
        return 'text-yellow-400';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className={cn('flex flex-col bg-background-secondary rounded-lg border border-border overflow-hidden', className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <div className="flex items-center justify-between px-3 border-b border-border">
          <TabsList className="border-0">
            <TabsTrigger value="positions" className="text-xs">
              {t('ordersPanel.positions')} ({filteredPositions.length})
            </TabsTrigger>
            <TabsTrigger value="openOrders" className="text-xs">
              {t('ordersPanel.openOrders')} ({openOrders.length})
            </TabsTrigger>
            <TabsTrigger value="orderHistory" className="text-xs">
              {t('ordersPanel.orderHistory')}
            </TabsTrigger>
          </TabsList>

          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showAllSymbols}
              onChange={(e) => setShowAllSymbols(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border bg-background-tertiary text-brand-500 focus:ring-brand-500"
            />
            {t('ordersPanel.showAll')}
          </label>
        </div>

        {/* Positions Tab */}
        <TabsContent value="positions" className="mt-0">
          {filteredPositions.length === 0 ? (
            <EmptyState message={t('ordersPanel.noPositions')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.symbol')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.size')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.entryPrice')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.markPrice')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.liqPrice')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.margin')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.pnl')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('ordersPanel.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPositions.map((position) => {
                    const ticker = tickers[position.symbol];
                    const markPrice = ticker ? ticker.c : '--';
                    const { pnl, roe } = getUnrealizedPnl(position);
                    const isProfitable = pnl >= 0;

                    return (
                      <tr key={position.id} className="border-b border-border/50 hover:bg-background-tertiary/50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-text-primary">
                              {position.symbol.replace('USDT', '')}
                            </span>
                            <span className={cn(
                              'px-1 py-0.5 rounded text-[10px] font-medium',
                              position.side === 'long' ? 'bg-trading-long/10 text-trading-long' : 'bg-trading-short/10 text-trading-short'
                            )}>
                              {position.side === 'long' ? 'Long' : 'Short'}
                            </span>
                            <span className="text-text-muted text-[10px]">{position.leverage}x</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-text-primary tabular-nums">
                          {formatNumber(position.quantity, { decimals: 4 })}
                        </td>
                        <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                          {formatPrice(position.entryPrice)}
                        </td>
                        <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                          {formatPrice(markPrice)}
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                          {position.liquidationPrice ? formatPrice(position.liquidationPrice) : '--'}
                        </td>
                        <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                          {formatCurrency(position.margin)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn('tabular-nums font-medium', isProfitable ? 'text-trading-long' : 'text-trading-short')}>
                              {isProfitable ? '+' : ''}{formatCurrency(pnl.toString())}
                            </span>
                            <span className={cn('text-[10px] tabular-nums', isProfitable ? 'text-trading-long' : 'text-trading-short')}>
                              ({isProfitable ? '+' : ''}{formatNumber(roe, { decimals: 2 })}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClosePosition(position.id)}
                            className="text-xs text-trading-short hover:text-trading-short hover:bg-trading-short/10"
                          >
                            {t('ordersPanel.close')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Open Orders Tab */}
        <TabsContent value="openOrders" className="mt-0">
          {openOrders.length === 0 ? (
            <EmptyState message={t('ordersPanel.noOpenOrders')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.time')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.symbol')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.type')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.side')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.price')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.amount')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.filled')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('ordersPanel.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-background-tertiary/50">
                      <td className="px-3 py-2 text-text-muted">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {order.symbol.replace('USDT', '')}/USDT
                      </td>
                      <td className="px-3 py-2 text-text-secondary capitalize">
                        {order.orderType.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'font-medium',
                          order.side === 'buy' ? 'text-trading-long' : 'text-trading-short'
                        )}>
                          {order.side === 'buy' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                        {order.price ? formatPrice(order.price) : 'Market'}
                      </td>
                      <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                        {formatNumber(order.quantity, { decimals: 4 })}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                        {formatNumber(order.filledQuantity, { decimals: 4 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="p-1 text-text-muted hover:text-trading-short transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orderHistory" className="mt-0">
          {orderHistory.length === 0 ? (
            <EmptyState message={t('ordersPanel.noOrderHistory')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.time')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.symbol')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.type')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('ordersPanel.side')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.avgPrice')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('ordersPanel.filled')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('ordersPanel.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.slice(0, 50).map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-background-tertiary/50">
                      <td className="px-3 py-2 text-text-muted">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {order.symbol.replace('USDT', '')}/USDT
                      </td>
                      <td className="px-3 py-2 text-text-secondary capitalize">
                        {order.orderType.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'font-medium',
                          order.side === 'buy' ? 'text-trading-long' : 'text-trading-short'
                        )}>
                          {order.side === 'buy' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                        {order.averagePrice ? formatPrice(order.averagePrice) : '--'}
                      </td>
                      <td className="px-3 py-2 text-right text-text-primary tabular-nums">
                        {formatNumber(order.filledQuantity, { decimals: 4 })} / {formatNumber(order.quantity, { decimals: 4 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn('capitalize', getStatusColor(order.status))}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
      <ChevronRight className="w-8 h-8 mb-2 opacity-50 rotate-90" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
