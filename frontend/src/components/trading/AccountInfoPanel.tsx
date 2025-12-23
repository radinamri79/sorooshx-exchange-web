'use client';

import { useTradeStore } from '@/stores/useTradeStore';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface AccountInfoPanelProps {
  className?: string;
}

export function AccountInfoPanel({ className }: AccountInfoPanelProps) {
  const { wallet, positions } = useTradeStore();

  // Calculate total position value and margin
  const { totalPositionValue, totalMarginUsed, unrealizedPnL } = (() => {
    let totalValue = 0;
    let totalMargin = 0;
    let pnl = 0;

    positions.forEach((position) => {
      const posValue = parseFloat(position.quantity) * parseFloat(position.entryPrice);
      totalValue += posValue;
      totalMargin += parseFloat(position.margin);
      pnl += parseFloat(position.unrealizedPnl || '0');
    });

    return {
      totalPositionValue: totalValue,
      totalMarginUsed: totalMargin,
      unrealizedPnL: pnl,
    };
  })();

  const availableBalance = parseFloat(wallet.availableBalance);
  const totalBalance = parseFloat(wallet.balance);
  const walletRisk = totalBalance > 0 ? (totalMarginUsed / totalBalance) * 100 : 0;

  return (
    <div className={cn('flex flex-col bg-black border-t border-[#1e2329]', className)}>
      {/* Account Section Header */}
      <div className="px-3 py-2 border-b border-[#1e2329] bg-[#0a0e27]">
        <h3 className="text-xs font-semibold text-white">Account</h3>
      </div>

      {/* Account Info Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-3 text-xs">
          {/* Balance Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Wallet Balance</span>
            <span className="text-white font-medium tabular-nums">
              {formatCurrency(totalBalance)}
            </span>
          </div>

          {/* Available Balance Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Available</span>
            <span className="text-white font-medium tabular-nums">
              {formatCurrency(availableBalance)}
            </span>
          </div>

          {/* Margin Used Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Margin Used</span>
            <span className={cn(
              'font-medium tabular-nums',
              totalMarginUsed > 0 ? 'text-[#ed7620]' : 'text-white'
            )}>
              {formatCurrency(totalMarginUsed)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#1e2329]" />

          {/* Position Value Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Position Value</span>
            <span className="text-white font-medium tabular-nums">
              {formatCurrency(totalPositionValue)}
            </span>
          </div>

          {/* Unrealized PnL Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Unrealized P&L</span>
            <span className={cn(
              'font-medium tabular-nums',
              unrealizedPnL >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}>
              {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#1e2329]" />

          {/* Margin Ratio Row */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Maintenance Margin</span>
            <span className={cn(
              'font-medium tabular-nums',
              walletRisk > 80 ? 'text-[#ef5350]' : walletRisk > 60 ? 'text-[#ed7620]' : 'text-white'
            )}>
              {formatNumber(walletRisk, { decimals: 2 })}%
            </span>
          </div>

          {/* Max Leverage Info */}
          <div className="flex items-center justify-between">
            <span className="text-[#848e9c]">Max Leverage</span>
            <span className="text-white font-medium tabular-nums">125x</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-[#1e2329] p-3 space-y-2">
        <button className="w-full py-2 px-3 text-xs font-medium rounded bg-[#1a3a3a] text-[#26a69a] hover:bg-[#1f4a4a] transition-colors">
          Buy Crypto
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="py-1.5 px-2 text-xs font-medium rounded bg-[#1a1a1a] text-[#848e9c] hover:text-white border border-[#1e2329] transition-colors">
            Deposit
          </button>
          <button className="py-1.5 px-2 text-xs font-medium rounded bg-[#1a1a1a] text-[#848e9c] hover:text-white border border-[#1e2329] transition-colors">
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
