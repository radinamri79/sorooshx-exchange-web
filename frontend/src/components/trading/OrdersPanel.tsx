'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronDown, FileText } from 'lucide-react';
import { cn, formatPrice, formatNumber, formatCurrency } from '@/lib/utils';
import { useTradeStore } from '@/stores/useTradeStore';
import { useMarketStore } from '@/stores/useMarketStore';
import { TradingService } from '@/services/trading/TradingService';
import type { Position, OrderStatus } from '@/types';
import Decimal from 'decimal.js';

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

  // Calculate unrealized PnL for positions using TradingService
  const getUnrealizedPnl = useCallback((position: Position) => {
    const ticker = tickers[position.symbol];
    if (!ticker) return { pnl: 0, roe: 0 };
    
    try {
      const currentPrice = new Decimal(ticker.c);
      
      // Use TradingService for accurate PnL calculation
      const pnl = TradingService.calculateUnrealizedPnL(position, currentPrice);
      const roe = TradingService.calculateROE(position, currentPrice);
      
      return { 
        pnl: parseFloat(pnl.toString()), 
        roe: parseFloat(roe.toString()) 
      };
    } catch {
      return { pnl: 0, roe: 0 };
    }
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
        return 'text-[#6b6b6b]';
      case 'open':
      case 'pending':
        return 'text-[#ed7620]';
      case 'partially_filled':
        return 'text-[#f0b90b]';
      default:
        return 'text-[#a1a1a1]';
    }
  };

  return (
    <div className={cn('flex flex-col bg-transparent overflow-hidden', className)}>
      {/* Header Tabs - Compact */}
      <div className="flex items-center justify-between px-3 border-b border-[#2a2a2d] bg-[#121214]">
        <div className="flex items-center gap-0.5">
          {/* Positions Tab */}
          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              'px-2 py-2 text-xs font-medium transition-colors relative',
              activeTab === 'positions' 
                ? 'text-[#f5f5f5]' 
                : 'text-[#6b6b6b] hover:text-[#a1a1a1]'
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
              'flex items-center gap-0.5 px-2 py-2 text-xs font-medium transition-colors relative',
              activeTab === 'openOrders' 
                ? 'text-[#f5f5f5]' 
                : 'text-[#6b6b6b] hover:text-[#a1a1a1]'
            )}
          >
            Orders({openOrders.length})
            <ChevronDown className="w-2.5 h-2.5" />
            {activeTab === 'openOrders' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ed7620]" />
            )}
          </button>

          {/* Assets Tab */}
          <button
            className="px-2 py-2 text-xs font-medium text-[#6b6b6b] hover:text-[#a1a1a1] transition-colors"
          >
            Assets
          </button>

          {/* History Tab */}
          <button
            onClick={() => setActiveTab('orderHistory')}
            className={cn(
              'px-2 py-2 text-xs font-medium transition-colors relative',
              activeTab === 'orderHistory' 
                ? 'text-[#f5f5f5]' 
                : 'text-[#6b6b6b] hover:text-[#a1a1a1]'
            )}
          >
            History
            {activeTab === 'orderHistory' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ed7620]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Hide other pairs checkbox */}
          <label className="flex items-center gap-1.5 text-[10px] text-[#6b6b6b] cursor-pointer hover:text-[#a1a1a1]">
            <input
              type="checkbox"
              checked={!showAllSymbols}
              onChange={(e) => setShowAllSymbols(!e.target.checked)}
              className="w-3 h-3 rounded border-[#2a2a2d] bg-[#17181b] text-[#ed7620] focus:ring-[#ed7620]"
            />
            Hide others
          </label>

          {/* Close all button */}
          <button className="px-2 py-1 text-[10px] font-medium text-[#6b6b6b] hover:text-[#a1a1a1] border border-[#2a2a2d] rounded transition-colors bg-[#17181b]">
            Close All
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
              <thead className="sticky top-0 bg-[#121214]">
                <tr className="text-[#6b6b6b] border-b border-[#2a2a2d]">
                  <th className="px-4 py-2.5 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2.5 text-left font-medium">Size</th>
                  <th className="px-3 py-2.5 text-right font-medium">Entry Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Mark Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Liq. Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Margin</th>
                  <th className="px-3 py-2.5 text-right font-medium">PNL (ROE%)</th>
                  <th className="px-3 py-2.5 text-center font-medium">TP/SL</th>
                  <th className="px-3 py-2.5 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((position) => {
                  const ticker = tickers[position.symbol];
                  const markPrice = ticker ? ticker.c : '--';
                  const { pnl, roe } = getUnrealizedPnl(position);
                  const isProfitable = pnl >= 0;

                  return (
                    <tr key={position.id} className="border-b border-[#2a2a2d]/50 hover:bg-[#17181b]">
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#f5f5f5] text-[10px]">
                            {position.symbol.replace('USDT', '')}/USDT
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              'px-1 py-0.5 rounded text-[9px] font-semibold',
                              position.side === 'long' ? 'bg-[#26a69a]/15 text-[#26a69a]' : 'bg-[#ef5350]/15 text-[#ef5350]'
                            )}>
                              {position.side === 'long' ? 'Long' : 'Short'}
                            </span>
                            <span className="text-[#ed7620] text-[9px] font-semibold">{position.leverage}X</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-[#f5f5f5] tabular-nums text-[10px]">
                        {formatNumber(position.quantity, { decimals: 4 })}
                      </td>
                      <td className="px-2 py-2 text-right text-[#f5f5f5] tabular-nums text-[10px]">
                        {formatPrice(position.entryPrice)}
                      </td>
                      <td className="px-2 py-2 text-right text-[#f5f5f5] tabular-nums text-[10px]">
                        {formatPrice(markPrice)}
                      </td>
                      <td className="px-2 py-2 text-right text-[#ef5350] tabular-nums text-[10px]">
                        {formatPrice(position.liquidationPrice || '0')}
                      </td>
                      <td className="px-2 py-2 text-right text-[#f5f5f5] tabular-nums text-[10px]">
                        {formatNumber(position.margin, { decimals: 2 })}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn('tabular-nums font-semibold text-[10px]', isProfitable ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                            {isProfitable ? '+' : ''}{formatCurrency(pnl.toString())}
                          </span>
                          <span className={cn('text-[9px] tabular-nums', isProfitable ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                            ({isProfitable ? '+' : ''}{formatNumber(roe, { decimals: 2 })}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px]">
                          <span className="text-[#26a69a]">{position.takeProfit || '--'}</span>
                          <span className="text-[#6b6b6b]"> / </span>
                          <span className="text-[#ef5350]">{position.stopLoss || '--'}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button className="px-1.5 py-0.5 text-[9px] font-medium text-[#6b6b6b] hover:text-[#a1a1a1] bg-[#17181b] border border-[#2a2a2d] rounded transition-colors">
                            TP/SL
                          </button>
                          <button
                            onClick={() => handleClosePosition(position.id)}
                            className="px-1.5 py-0.5 text-[9px] font-medium text-[#ef5350] hover:bg-[#ef5350]/10 bg-[#17181b] border border-[#2a2a2d] rounded transition-colors"
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
              <thead className="sticky top-0 bg-[#121214]">
                <tr className="text-[#6b6b6b] border-b border-[#2a2a2d]">
                  <th className="px-4 py-2.5 text-left font-medium">Time</th>
                  <th className="px-3 py-2.5 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2.5 text-left font-medium">Type</th>
                  <th className="px-3 py-2.5 text-left font-medium">Side</th>
                  <th className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 text-right font-medium">Filled</th>
                  <th className="px-3 py-2.5 text-center font-medium">Cancel</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#2a2a2d]/50 hover:bg-[#17181b]">
                    <td className="px-4 py-3 text-[#6b6b6b]">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#f5f5f5]">
                      {order.symbol.replace('USDT', '')}/USDT
                    </td>
                    <td className="px-3 py-3 text-[#a1a1a1] capitalize">
                      {order.orderType.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'font-semibold',
                        order.side === 'buy' ? 'text-[#00b070]' : 'text-[#f6465d]'
                      )}>
                        {order.side === 'buy' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[#f5f5f5] tabular-nums font-medium">
                      {order.price ? formatPrice(order.price) : 'Market'}
                    </td>
                    <td className="px-3 py-3 text-right text-[#f5f5f5] tabular-nums font-medium">
                      {formatNumber(order.quantity, { decimals: 4 })}
                    </td>
                    <td className="px-3 py-3 text-right text-[#6b6b6b] tabular-nums">
                      {formatNumber(order.filledQuantity, { decimals: 4 })}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="p-1.5 text-[#6b6b6b] hover:text-[#f6465d] transition-colors rounded hover:bg-[#f6465d]/10"
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
              <thead className="sticky top-0 bg-[#121214]">
                <tr className="text-[#6b6b6b] border-b border-[#2a2a2d]">
                  <th className="px-4 py-2.5 text-left font-medium">Time</th>
                  <th className="px-3 py-2.5 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2.5 text-left font-medium">Type</th>
                  <th className="px-3 py-2.5 text-left font-medium">Side</th>
                  <th className="px-3 py-2.5 text-right font-medium">Avg. Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Filled</th>
                  <th className="px-3 py-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.slice(0, 50).map((order) => (
                  <tr key={order.id} className="border-b border-[#2a2a2d]/50 hover:bg-[#17181b]">
                    <td className="px-4 py-3 text-[#6b6b6b]">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#f5f5f5]">
                      {order.symbol.replace('USDT', '')}/USDT
                    </td>
                    <td className="px-3 py-3 text-[#a1a1a1] capitalize">
                      {order.orderType.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'font-semibold',
                        order.side === 'buy' ? 'text-[#00b070]' : 'text-[#f6465d]'
                      )}>
                        {order.side === 'buy' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[#f5f5f5] tabular-nums font-medium">
                      {order.averagePrice ? formatPrice(order.averagePrice) : '--'}
                    </td>
                    <td className="px-3 py-3 text-right text-[#f5f5f5] tabular-nums font-medium">
                      {formatNumber(order.filledQuantity, { decimals: 4 })} / {formatNumber(order.quantity, { decimals: 4 })}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn('capitalize font-medium', getStatusColor(order.status))}>
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

// Empty state component - Bitget Style
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#6b6b6b]">
      <FileText className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
