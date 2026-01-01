'use client';

import { useMemo } from 'react';
import { useTradeStore } from '@/stores/useTradeStore';
import Decimal from 'decimal.js';
import { ShoppingCart, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface AccountAssetsProps {
  symbol?: string;
  className?: string;
}

const COLORS = {
  orange: '#FF7A00',
  longGreen: '#0D9D5F',
  shortRed: '#C8102E',
  textPrimary: '#EAECEF',
  textSecondary: '#848E9C',
  textMuted: '#5E6673',
  bgSecondary: '#1E2329',
  borderColor: '#2B3139',
};

export function AccountAssets({ symbol = 'BTC/USDT', className = '' }: AccountAssetsProps) {
  const { wallet, positions } = useTradeStore();

  // Calculate margin statistics
  const marginStats = useMemo(() => {
    try {
      const totalEquity = new Decimal(wallet.balance || '0');
      const availableBalance = new Decimal(wallet.availableBalance || '0');

      // Get position for current symbol
      const position = positions.find((p) => p.symbol === symbol && p.isOpen);

      // Position margin used
      let positionMargin = new Decimal('0');
      let unrealizedPnL = new Decimal('0');

      if (position) {
        positionMargin = new Decimal(position.margin || '0');
        unrealizedPnL = new Decimal(position.unrealizedPnl || '0');
      }

      // Calculate maintenance margin (0.5% of position value)
      const maintenanceMargin = positionMargin.times(new Decimal('0.005'));

      // Calculate margin ratio
      const marginRatio = maintenanceMargin.gt(0)
        ? maintenanceMargin.dividedBy(totalEquity).times(100)
        : new Decimal('0');

      return {
        totalEquity: totalEquity.toFixed(4),
        availableMargin: availableBalance.toFixed(4),
        usedMargin: positionMargin.toFixed(4),
        maintenanceMargin: maintenanceMargin.toFixed(4),
        marginRatio: marginRatio.toFixed(2),
        unrealizedPnl: unrealizedPnL.toFixed(4),
        unrealizedPnLSign: unrealizedPnL.gte(0) ? '+' : '',
        positionExists: !!position,
      };
    } catch (error) {
      return {
        totalEquity: '0.0000',
        availableMargin: '0.0000',
        usedMargin: '0.0000',
        maintenanceMargin: '0.0000',
        marginRatio: '0.00',
        unrealizedPnl: '0.0000',
        unrealizedPnLSign: '',
        positionExists: false,
      };
    }
  }, [wallet, positions, symbol]);

  // Format large numbers with commas
  const formatNumber = (num: string) => {
    const [whole, decimal] = num.split('.');
    const formattedWhole = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal ? `${formattedWhole}.${decimal}` : formattedWhole;
  };

  const getPnLColor = () => {
    const pnl = new Decimal(marginStats.unrealizedPnl);
    if (pnl.gt(0)) return COLORS.longGreen;
    if (pnl.lt(0)) return COLORS.shortRed;
    return COLORS.textSecondary;
  };

  return (
    <div className={`flex flex-col gap-3 px-3 py-3 ${className}`}>
      {/* ================================================================ */}
      {/* MARGIN SECTION                                                  */}
      {/* ================================================================ */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-white uppercase tracking-wide">Account</h3>

        {/* Margin Info Row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#848E9C]">Margin</span>
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center justify-center w-4 h-4 rounded-full"
                style={{ backgroundColor: COLORS.longGreen + '20', borderColor: COLORS.longGreen, border: `1px solid ${COLORS.longGreen}` }}
              >
                <span
                  className="text-[8px] font-bold"
                  style={{ color: COLORS.longGreen }}
                >
                  ●
                </span>
              </div>
              <span className="text-[#EAECEF] font-medium">{marginStats.marginRatio}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#848E9C]">Maintenance Margin</span>
            <span className="text-[#EAECEF]">{formatNumber(marginStats.maintenanceMargin)} USDT</span>
          </div>

          {/* Separator */}
          <div className="h-px bg-[#2B3139] my-1.5" />
        </div>
      </div>

      {/* ================================================================ */}
      {/* ASSETS SECTION                                                  */}
      {/* ================================================================ */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-white uppercase tracking-wide">Assets USDT</h3>

        <div className="space-y-1.5 text-[11px]">
          {/* Currency Equity */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Currency Equity</span>
            <span className="text-[#EAECEF]">{formatNumber(marginStats.totalEquity)}</span>
          </div>

          {/* Available Margin */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Available Margin</span>
            <span className="text-[#EAECEF]">{formatNumber(marginStats.availableMargin)}</span>
          </div>

          {/* Position Margin */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Position Margin</span>
            <span className="text-[#EAECEF]">{formatNumber(marginStats.usedMargin)}</span>
          </div>

          {/* Unrealized PnL */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Unrealized PnL</span>
            <div className="flex items-center gap-1">
              {new Decimal(marginStats.unrealizedPnl).gt(0) ? (
                <ArrowUpRight size={10} style={{ color: COLORS.longGreen }} />
              ) : new Decimal(marginStats.unrealizedPnl).lt(0) ? (
                <ArrowDownLeft size={10} style={{ color: COLORS.shortRed }} />
              ) : null}
              <span style={{ color: getPnLColor() }}>
                {marginStats.unrealizedPnLSign}
                {formatNumber(marginStats.unrealizedPnl)}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-[#2B3139] my-1.5" />
        </div>

        {/* Action Buttons - Compact */}
        <div className="grid grid-cols-3 gap-2">
          <button
            className="h-8 px-2.5 py-1.5 text-[10px] font-semibold rounded transition-all duration-200
                       bg-[#1E2329] text-[#EAECEF] hover:bg-[#2B3139]
                       border border-[#2B3139] hover:border-[#3D4450]
                       active:scale-[0.95]"
          >
            <div className="flex items-center justify-center gap-1">
              <ShoppingCart size={10} />
              <span>Buy</span>
            </div>
          </button>
          <button
            className="h-8 px-2.5 py-1.5 text-[10px] font-semibold rounded transition-all duration-200
                       bg-[#1E2329] text-[#EAECEF] hover:bg-[#2B3139]
                       border border-[#2B3139] hover:border-[#3D4450]
                       active:scale-[0.95]"
          >
            Deposit
          </button>
          <button
            className="h-8 px-2.5 py-1.5 text-[10px] font-semibold rounded transition-all duration-200
                       bg-[#1E2329] text-[#EAECEF] hover:bg-[#2B3139]
                       border border-[#2B3139] hover:border-[#3D4450]
                       active:scale-[0.95]"
          >
            Transfer
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* FUTURES INFORMATION SECTION                                     */}
      {/* ================================================================ */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-white uppercase tracking-wide flex items-center gap-1">
          Futures Details
          <span className="text-[9px] text-[#848E9C]">▲</span>
        </h3>

        <div className="space-y-1.5 text-[11px]">
          {/* Maturity */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Maturity date</span>
            <span className="text-[#EAECEF]">Perpetual</span>
          </div>

          {/* Max Leverage */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Maximum leverage</span>
            <span className="text-[#EAECEF]">150x</span>
          </div>

          {/* Min Order Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Min. order quantity</span>
            <span className="text-[#EAECEF]">0.0001 {symbol.split('/')[0]}</span>
          </div>

          {/* Min Order Value */}
          <div className="flex items-center justify-between">
            <span className="text-[#848E9C]">Minimum order value</span>
            <span className="text-[#EAECEF]">5 USDT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
