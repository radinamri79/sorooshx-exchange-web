'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';

interface CalculatorProps {
  className?: string;
}

export function Calculator({ className }: CalculatorProps) {
  const { currentSymbol } = useMarketStore();
  const [tab, setTab] = useState<'pnl' | 'target' | 'liquidation'>('pnl');
  const [quantity, setQuantity] = useState('0');
  const [openPrice, setOpenPrice] = useState('0');
  const [leverage, setLeverage] = useState('20');
  const [closePrice, setClosePrice] = useState('0');
  const [roi, setRoi] = useState('0');
  const [positionType, setPositionType] = useState<'cross' | 'isolated'>('cross');
  const [availableMargin, setAvailableMargin] = useState('0');
  const [isLong, setIsLong] = useState(true);

  // Calculate PnL results
  const pnlResults = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const open = parseFloat(openPrice) || 0;
    const close = parseFloat(closePrice) || 0;
    const lev = parseFloat(leverage) || 1;

    if (qty === 0 || open === 0) {
      return { margin: '0.0000', profit: '0.0000' };
    }

    const margin = (qty * open) / lev;
    const priceDiff = close - open;
    const profit = qty * priceDiff;

    return {
      margin: margin.toFixed(4),
      profit: profit.toFixed(4),
    };
  }, [quantity, openPrice, closePrice, leverage]);

  // Calculate Target Price results
  const targetResults = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const open = parseFloat(openPrice) || 0;
    const roiValue = parseFloat(roi) || 0;
    const lev = parseFloat(leverage) || 1;

    if (qty === 0 || open === 0) {
      return { targetPrice: '0.0', margin: '0.0000', profit: '0.0000' };
    }

    const margin = (qty * open) / lev;
    const targetPrice = isLong ? open * (1 + roiValue / 100) : open * (1 - roiValue / 100);
    const profit = qty * (targetPrice - open);

    return {
      targetPrice: targetPrice.toFixed(1),
      margin: margin.toFixed(4),
      profit: profit.toFixed(4),
    };
  }, [quantity, openPrice, roi, leverage, isLong]);

  // Calculate Liquidation Price
  const liquidationResults = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const open = parseFloat(openPrice) || 0;
    const lev = parseFloat(leverage) || 1;
    const margin = parseFloat(availableMargin) || 0;

    if (qty === 0 || open === 0 || lev === 0) {
      return { liquidationPrice: '--' };
    }

    // Liquidation Price = Entry Price - (Margin / Quantity)
    const liquidationPrice = isLong
      ? open - (margin / qty)
      : open + (margin / qty);

    return {
      liquidationPrice: liquidationPrice > 0 ? liquidationPrice.toFixed(2) : '--',
    };
  }, [quantity, openPrice, availableMargin, leverage, isLong]);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#121214] border border-[#2a2a2d] rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header with Tabs */}
      <div className="border-b border-[#2a2a2d] bg-[#0d0d0f]">
        <div className="flex items-center gap-6 px-6 py-4">
          <button
            onClick={() => setTab('pnl')}
            className={cn(
              'text-sm font-medium pb-2 border-b-2 transition-colors',
              tab === 'pnl'
                ? 'text-[#EAECEF] border-[#FF7A00]'
                : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
            )}
          >
            PnL Calculation
          </button>
          <button
            onClick={() => setTab('target')}
            className={cn(
              'text-sm font-medium pb-2 border-b-2 transition-colors',
              tab === 'target'
                ? 'text-[#EAECEF] border-[#FF7A00]'
                : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
            )}
          >
            Target Price
          </button>
          <button
            onClick={() => setTab('liquidation')}
            className={cn(
              'text-sm font-medium pb-2 border-b-2 transition-colors',
              tab === 'liquidation'
                ? 'text-[#EAECEF] border-[#FF7A00]'
                : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
            )}
          >
            Liquidation Price
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Symbol Selector */}
        <div>
          <label className="text-xs text-[#848E9C] block mb-2">Symbol</label>
          <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2 border border-[#2a2a2d]">
            <span className="text-sm font-medium text-[#EAECEF]">{currentSymbol}</span>
            <svg className="w-4 h-4 text-[#848E9C] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Long/Short Selector */}
        <div>
          <label className="text-xs text-[#848E9C] block mb-2">Position Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsLong(true)}
              className={cn(
                'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                isLong
                  ? 'bg-[#0D9D5F] text-white'
                  : 'bg-[#1E2329] text-[#848E9C] hover:bg-[#2a3035]'
              )}
            >
              Long
            </button>
            <button
              onClick={() => setIsLong(false)}
              className={cn(
                'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                !isLong
                  ? 'bg-[#C8102E] text-white'
                  : 'bg-[#1E2329] text-[#848E9C] hover:bg-[#2a3035]'
              )}
            >
              Short
            </button>
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label className="text-xs text-[#848E9C] block mb-2">Leverage</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="125"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="flex-1 h-1 bg-[#1E2329] rounded-full appearance-none cursor-pointer accent-[#FF7A00]"
            />
            <span className="text-sm font-medium text-[#EAECEF] min-w-[50px]">{leverage}X</span>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs text-[#848E9C] block mb-2">Quantity</label>
          <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2 border border-[#2a2a2d]">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none"
            />
            <span className="text-xs text-[#848E9C]">BTC</span>
          </div>
        </div>

        {/* Open Price */}
        <div>
          <label className="text-xs text-[#848E9C] block mb-2">Open Price</label>
          <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2 border border-[#2a2a2d]">
            <input
              type="number"
              value={openPrice}
              onChange={(e) => setOpenPrice(e.target.value)}
              placeholder="0"
              className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none"
            />
            <span className="text-xs text-[#848E9C]">USDT</span>
          </div>
        </div>

        {/* Tab-specific inputs */}
        {tab === 'pnl' && (
          <div>
            <label className="text-xs text-[#848E9C] block mb-2">Close Price</label>
            <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2 border border-[#2a2a2d]">
              <input
                type="number"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
                placeholder="0"
                className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none"
              />
              <span className="text-xs text-[#848E9C]">USDT</span>
            </div>
          </div>
        )}

        {tab === 'target' && (
          <div>
            <label className="text-xs text-[#848E9C] block mb-2">ROI</label>
            <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2 border border-[#2a2a2d]">
              <input
                type="number"
                value={roi}
                onChange={(e) => setRoi(e.target.value)}
                placeholder="0"
                className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none"
              />
              <span className="text-xs text-[#848E9C]">%</span>
            </div>
          </div>
        )}

        {tab === 'liquidation' && (
          <>
            <div>
              <label className="text-xs text-[#848E9C] block mb-2">Position Type</label>
              <select
                value={positionType}
                onChange={(e) => setPositionType(e.target.value as 'cross' | 'isolated')}
                className="w-full bg-[#1E2329] text-[#EAECEF] text-sm rounded px-3 py-2 border border-[#2a2a2d] outline-none"
              >
                <option value="cross">Cross</option>
                <option value="isolated">Isolated</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#848E9C] block mb-2">Available Margin</label>
              <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2 border border-[#2a2a2d]">
                <input
                  type="number"
                  value={availableMargin}
                  onChange={(e) => setAvailableMargin(e.target.value)}
                  placeholder="0"
                  className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none"
                />
                <span className="text-xs text-[#848E9C]">USDT</span>
              </div>
            </div>
          </>
        )}

        {/* Results Section */}
        <div className="bg-[#1E2329] rounded p-4 border border-[#2a2a2d] mt-4">
          <div className="text-xs font-medium text-[#EAECEF] mb-3">Results</div>

          {tab === 'pnl' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#848E9C]">Margin</span>
                <span className="text-sm font-medium text-[#EAECEF]">{pnlResults.margin} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#848E9C]">Profit</span>
                <span className={cn(
                  'text-sm font-medium',
                  parseFloat(pnlResults.profit) >= 0 ? 'text-[#0D9D5F]' : 'text-[#C8102E]'
                )}>
                  {parseFloat(pnlResults.profit) >= 0 ? '+' : ''}{pnlResults.profit} USDT
                </span>
              </div>
            </div>
          )}

          {tab === 'target' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#848E9C]">Target Price</span>
                <span className="text-sm font-medium text-[#EAECEF]">{targetResults.targetPrice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#848E9C]">Margin</span>
                <span className="text-sm font-medium text-[#EAECEF]">{targetResults.margin} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#848E9C]">Profit</span>
                <span className={cn(
                  'text-sm font-medium',
                  parseFloat(targetResults.profit) >= 0 ? 'text-[#0D9D5F]' : 'text-[#C8102E]'
                )}>
                  {parseFloat(targetResults.profit) >= 0 ? '+' : ''}{targetResults.profit} USDT
                </span>
              </div>
            </div>
          )}

          {tab === 'liquidation' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#848E9C]">Liquidation Price</span>
                <span className="text-sm font-medium text-[#EAECEF]">{liquidationResults.liquidationPrice}</span>
              </div>
            </div>
          )}
        </div>

        {/* Warning Message */}
        <p className="text-xs text-[#C8102E] mt-4">
          {tab === 'pnl' && 'Results are for reference only. Deviations may occur in actual operations due to fees and funding rates.'}
          {tab === 'target' && 'Results are for reference only. Deviations may occur in actual operations due to fees and funding rates.'}
          {tab === 'liquidation' && 'Results are for reference only. Deviations may occur in actual operations due to fees and funding rates.'}
        </p>
      </div>

      {/* Calculate Button */}
      <div className="border-t border-[#2a2a2d] p-6 bg-[#0d0d0f]">
        <button className="w-full py-3 px-4 bg-[#FF7A00] text-black rounded-lg font-semibold hover:bg-[#ff8c3a] transition-colors">
          Calculate
        </button>
      </div>
    </div>
  );
}
