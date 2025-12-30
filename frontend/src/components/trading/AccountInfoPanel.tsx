'use client';

import { useTradeStore } from '@/stores/useTradeStore';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { Wallet, ArrowDownToLine, ArrowLeftRight, ShoppingCart } from 'lucide-react';

interface AccountInfoPanelProps {
  className?: string;
}

export function AccountInfoPanel({ className }: AccountInfoPanelProps) {
  const { wallet, positions, getTotalMarginUsed } = useTradeStore();

  // Calculate total position value and margin using store selector
  const totalMarginUsedDecimal = getTotalMarginUsed();
  const totalMarginUsed = parseFloat(totalMarginUsedDecimal.toString());
  
  // Calculate unrealized PnL
  const unrealizedPnL = positions.reduce((total, position) => {
    return total + parseFloat(position.unrealizedPnl || '0');
  }, 0);

  const availableBalance = parseFloat(wallet.availableBalance);
  const totalBalance = parseFloat(wallet.balance);
  const walletRisk = totalBalance > 0 ? (totalMarginUsed / totalBalance) * 100 : 0;

  return (
    <div className={cn('flex flex-col bg-transparent', className)}>
      {/* Account Section Header */}
      <div className="px-2 py-1.5 border-b border-[#2a2a2d] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-[#ed7620]" />
          <h3 className="text-xs font-semibold text-[#f5f5f5]">Assets</h3>
        </div>
        <span className="text-[9px] text-[#6b6b6b]">USDT-M</span>
      </div>

      {/* Account Info Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-2 space-y-1.5 text-[10px]">
          {/* Total Equity Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#6b6b6b]">Total Equity</span>
            <span className="text-[#f5f5f5] font-semibold tabular-nums text-xs">
              {formatCurrency(totalBalance)}
            </span>
          </div>

          {/* Available Balance Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#6b6b6b]">Available</span>
            <span className="text-[#f5f5f5] tabular-nums">
              {formatCurrency(availableBalance)}
            </span>
          </div>

          {/* Margin Used Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#6b6b6b]">Margin</span>
            <span className={cn(
              'tabular-nums',
              totalMarginUsed > 0 ? 'text-[#ed7620]' : 'text-[#f5f5f5]'
            )}>
              {formatCurrency(totalMarginUsed)}
            </span>
          </div>

          <div className="h-px bg-[#2a2a2d]" />

          {/* Unrealized PnL Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#6b6b6b]">Unrealized PNL</span>
            <span className={cn(
              'font-semibold tabular-nums',
              unrealizedPnL >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}>
              {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
            </span>
          </div>

          {/* Margin Ratio Row - with progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#6b6b6b]">Margin Ratio</span>
              <span className={cn(
                'font-semibold tabular-nums',
                walletRisk > 80 ? 'text-[#ef5350]' : walletRisk > 60 ? 'text-[#f0b90b]' : 'text-[#26a69a]'
              )}>
                {formatNumber(walletRisk, { decimals: 2 })}%
              </span>
            </div>
            <div className="h-0.5 bg-[#17181b] rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  walletRisk > 80 ? 'bg-[#ef5350]' : walletRisk > 60 ? 'bg-[#f0b90b]' : 'bg-[#26a69a]'
                )}
                style={{ width: `${Math.min(walletRisk, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-[#2a2a2d] p-2 space-y-1.5">
        <button className="w-full py-1.5 px-2 text-[10px] font-semibold rounded bg-[#ed7620] text-white hover:bg-[#ff8c3a] transition-colors flex items-center justify-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          Buy Crypto
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button className="py-1 px-1.5 text-[9px] font-medium rounded bg-[#17181b] text-[#a1a1a1] hover:text-[#f5f5f5] border border-[#2a2a2d] transition-colors flex items-center justify-center gap-1">
            <ArrowDownToLine className="w-3 h-3" />
            Deposit
          </button>
          <button className="py-1 px-1.5 text-[9px] font-medium rounded bg-[#17181b] text-[#a1a1a1] hover:text-[#f5f5f5] border border-[#2a2a2d] transition-colors flex items-center justify-center gap-1">
            <ArrowLeftRight className="w-3 h-3" />
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
