'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronDown } from 'lucide-react';
import { cn, formatPrice, formatNumber, formatCurrency } from '@/lib/utils';
import { useTradeStore } from '@/stores/useTradeStore';
import { useMarketStore } from '@/stores/useMarketStore';
import type { Position, OrderStatus } from '@/types';

interface OrdersPanelProps {
  className?: string;
}

type TabValue = 'positions' | 'openOrders' | 'orderHistory';

export function OrdersPanel({ className }: OrdersPanelProps) {
  // Translation hook ready for future localization
  useTranslations('trading');
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
        return 'text-[#26a69a]';
      case 'cancelled':
      case 'rejected':
        return 'text-[#5e6673]';
      case 'open':
      case 'pending':
        return 'text-[#ed7620]';
      case 'partially_filled':
        return 'text-yellow-400';
      default:
        return 'text-[#848e9c]';
    }
  };

  return (
    <div className={cn('flex flex-col bg-black overflow-hidden', className)}>
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-[#1e2329]">
        <div className="flex items-center gap-1">
          {/* Positions Tab */}
          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              'px-3 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'positions' 
                ? 'text-white' 
                : 'text-[#848e9c] hover:text-white'
            )}
          >
            Positions({filteredPositions.length})
            {activeTab === 'positions' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ed7620]" />
            )}
          </button>
          
          {/* Orders Tab with dropdown */}
          <button
            onClick={() => setActiveTab('openOrders')}
            className={cn(
              'flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'openOrders' 
                ? 'text-white' 
                : 'text-[#848e9c] hover:text-white'
            )}
          >
            Orders({openOrders.length})
            <ChevronDown className="w-3 h-3" />
            {activeTab === 'openOrders' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ed7620]" />
            )}
          </button>

          {/* Balances Tab */}
          <button
            className="px-3 py-2.5 text-sm font-medium text-[#848e9c] hover:text-white transition-colors"
          >
            Balances
          </button>

          {/* History Tab */}
          <button
            onClick={() => setActiveTab('orderHistory')}
            className={cn(
              'px-3 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'orderHistory' 
                ? 'text-white' 
                : 'text-[#848e9c] hover:text-white'
            )}
          >
            History
            {activeTab === 'orderHistory' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ed7620]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Hide other pairs checkbox */}
          <label className="flex items-center gap-2 text-xs text-[#848e9c] cursor-pointer">
            <input
              type="checkbox"
              checked={!showAllSymbols}
              onChange={(e) => setShowAllSymbols(!e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#1e2329] bg-[#1a1a1a] text-[#ed7620] focus:ring-[#ed7620]"
            />
            Hide other pairs
          </label>

          {/* Cancel all button */}
          <button className="px-3 py-1 text-xs font-medium text-[#848e9c] hover:text-white border border-[#1e2329] rounded transition-colors">
            Cancel all
          </button>
        </div>
      </div>

      {/* Positions Content */}
      {activeTab === 'positions' && (
        <div className="flex-1 overflow-auto">
          {filteredPositions.length === 0 ? (
            <EmptyState message="No open positions" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-black">
                <tr className="text-[#5e6673] border-b border-[#1e2329]">
                  <th className="px-4 py-2 text-left font-medium">Pair</th>
                  <th className="px-3 py-2 text-left font-medium">Positions(BTC)</th>
                  <th className="px-3 py-2 text-right font-medium">Margin(USDT)</th>
                  <th className="px-3 py-2 text-right font-medium">Entry Price(USDT)</th>
                  <th className="px-3 py-2 text-right font-medium">Mark Price</th>
                  <th className="px-3 py-2 text-right font-medium">MMR</th>
                  <th className="px-3 py-2 text-right font-medium">Unrealized PNL</th>
                  <th className="px-3 py-2 text-center font-medium">TP/SL</th>
                  <th className="px-3 py-2 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((position) => {
                  const ticker = tickers[position.symbol];
                  const markPrice = ticker ? ticker.c : '--';
                  const { pnl, roe } = getUnrealizedPnl(position);
                  const isProfitable = pnl >= 0;

                  return (
                    <tr key={position.id} className="border-b border-[#1e2329]/50 hover:bg-[#0a0a0a]">
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white">
                            {position.symbol.replace('USDT', '')}/USDT
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              'px-1 py-0.5 rounded text-[10px] font-medium',
                              position.side === 'long' ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
                            )}>
                              {position.side === 'long' ? 'Long' : 'Short'}
                            </span>
                            <span className="text-[#ed7620] text-[10px]">{position.leverage}X</span>
                            <span className="text-[#848e9c] text-[10px]">Cross</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-white tabular-nums">
                        {formatNumber(position.quantity, { decimals: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right text-white tabular-nums">
                        {formatNumber(position.margin, { decimals: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right text-white tabular-nums">
                        {formatPrice(position.entryPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-white tabular-nums">
                        {formatPrice(markPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-white tabular-nums">
                        3.83%
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn('tabular-nums font-medium', isProfitable ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                            {isProfitable ? '+' : ''}{formatCurrency(pnl.toString())}
                          </span>
                          <span className={cn('text-[10px] tabular-nums', isProfitable ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                            ({isProfitable ? '+' : ''}{formatNumber(roe, { decimals: 0 })}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[#ed7620] text-[10px]">
                          {position.takeProfit || '--'} / <span className="text-[#ef5350]">{position.stopLoss || '--'}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <button className="px-2 py-1 text-[10px] font-medium text-[#848e9c] hover:text-white border border-[#1e2329] rounded transition-colors">
                            TP/SL
                          </button>
                          <button className="px-2 py-1 text-[10px] font-medium text-[#848e9c] hover:text-white border border-[#1e2329] rounded transition-colors">
                            Reverse
                          </button>
                          <button
                            onClick={() => handleClosePosition(position.id)}
                            className="px-2 py-1 text-[10px] font-medium text-[#ef5350] hover:bg-[#ef5350]/10 border border-[#1e2329] rounded transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Open Orders Content */}
      {activeTab === 'openOrders' && (
        <div className="flex-1 overflow-auto">
          {openOrders.length === 0 ? (
            <EmptyState message="No open orders" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-black">
                <tr className="text-[#5e6673] border-b border-[#1e2329]">
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-right font-medium">Filled</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#1e2329]/50 hover:bg-[#0a0a0a]">
                    <td className="px-4 py-2.5 text-[#848e9c]">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-white">
                      {order.symbol.replace('USDT', '')}/USDT
                    </td>
                    <td className="px-3 py-2.5 text-[#848e9c] capitalize">
                      {order.orderType.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'font-medium',
                        order.side === 'buy' ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      )}>
                        {order.side === 'buy' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-white tabular-nums">
                      {order.price ? formatPrice(order.price) : 'Market'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white tabular-nums">
                      {formatNumber(order.quantity, { decimals: 4 })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#848e9c] tabular-nums">
                      {formatNumber(order.filledQuantity, { decimals: 4 })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="p-1 text-[#5e6673] hover:text-[#ef5350] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Order History Content */}
      {activeTab === 'orderHistory' && (
        <div className="flex-1 overflow-auto">
          {orderHistory.length === 0 ? (
            <EmptyState message="No order history" />
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-black">
                <tr className="text-[#5e6673] border-b border-[#1e2329]">
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Avg. Price</th>
                  <th className="px-3 py-2 text-right font-medium">Filled</th>
                  <th className="px-3 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.slice(0, 50).map((order) => (
                  <tr key={order.id} className="border-b border-[#1e2329]/50 hover:bg-[#0a0a0a]">
                    <td className="px-4 py-2.5 text-[#848e9c]">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-white">
                      {order.symbol.replace('USDT', '')}/USDT
                    </td>
                    <td className="px-3 py-2.5 text-[#848e9c] capitalize">
                      {order.orderType.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'font-medium',
                        order.side === 'buy' ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      )}>
                        {order.side === 'buy' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-white tabular-nums">
                      {order.averagePrice ? formatPrice(order.averagePrice) : '--'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white tabular-nums">
                      {formatNumber(order.filledQuantity, { decimals: 4 })} / {formatNumber(order.quantity, { decimals: 4 })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('capitalize', getStatusColor(order.status))}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#5e6673]">
      <ChevronDown className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
