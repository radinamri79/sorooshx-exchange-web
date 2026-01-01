'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPrice, formatNumber, formatPercentage } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { binanceWS } from '@/services/websocket';
import type { BinanceTicker } from '@/types';
import { TrendingUp, TrendingDown, Info, X, Calculator as CalculatorIcon } from 'lucide-react';

interface MarketInfoProps {
  className?: string;
}

// Market Info Modal
function MarketInfoModal({ symbol, isOpen, onClose }: { symbol: string; isOpen: boolean; onClose: () => void }) {
  return isOpen ? (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#121214] rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto border border-[#2a2a2d]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2d]">
          <h2 className="text-lg font-bold text-[#EAECEF]">Information</h2>
          <button onClick={onClose} className="text-[#848E9C] hover:text-[#EAECEF]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Symbol */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Symbol</span>
            <span className="text-sm font-medium text-[#EAECEF]">{symbol}</span>
          </div>

          {/* Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Type</span>
            <span className="text-sm font-medium text-[#EAECEF]">USDT-M</span>
          </div>

          {/* Settlement Currency */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Settlement currency</span>
            <span className="text-sm font-medium text-[#EAECEF]">USDT</span>
          </div>

          {/* Min Qty */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Min. Qty(BTC)</span>
            <span className="text-sm font-medium text-[#EAECEF]">0.0001</span>
          </div>

          {/* Max Leverage */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Max leverage</span>
            <span className="text-sm font-medium text-[#EAECEF]">200</span>
          </div>

          {/* Open Interest */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Open Interest(BTC)</span>
            <span className="text-sm font-medium text-[#EAECEF]">6,238.0916</span>
          </div>

          {/* Settlement Time */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Settlement time</span>
            <span className="text-sm font-medium text-[#EAECEF]">00:00:00 08:00:00 16:00:00 (UTC+0)</span>
          </div>

          {/* Index Source */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#848E9C]">Index Source</span>
            <span className="text-sm font-medium text-[#EAECEF]">bitget, binance, bybit</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a2d] flex justify-center">
          <button className="text-[#FF7A00] text-sm hover:text-[#ff8c3a] font-medium">
            View more token information
          </button>
        </div>
      </div>
    </div>
  ) : null;
}

// Calculator Modal
function CalculatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);

  // Animation handling
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  };

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
    const priceDiff = isLong ? (close - open) : (open - close);
    const profit = qty * priceDiff;

    return {
      margin: margin.toFixed(4),
      profit: profit.toFixed(4),
    };
  }, [quantity, openPrice, closePrice, leverage, isLong]);

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
    const priceDiff = isLong ? (targetPrice - open) : (open - targetPrice);
    const profit = qty * priceDiff;

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

    const liquidationPrice = isLong
      ? open - (margin / qty)
      : open + (margin / qty);

    return {
      liquidationPrice: liquidationPrice > 0 ? liquidationPrice.toFixed(2) : '--',
    };
  }, [quantity, openPrice, availableMargin, leverage, isLong]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center px-4',
        'transition-all duration-200 ease-out',
        isAnimating ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
      )}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-md rounded-xl shadow-2xl',
          'transition-all duration-200 ease-out',
          isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        )}
        style={{ backgroundColor: '#0B0E11', border: '1px solid #2B3139' }}
      >
        {/* Header with Tabs */}
        <div className="border-b border-[#2B3139]">
          <div className="flex items-center justify-between px-5 py-4 gap-2">
            <div className="flex gap-1 flex-wrap lg:flex-nowrap lg:gap-4">
              <button
                onClick={() => setTab('pnl')}
                className={cn(
                  'text-xs lg:text-sm font-medium pb-2 border-b-2 transition-colors whitespace-nowrap',
                  tab === 'pnl'
                    ? 'text-[#EAECEF] border-[#FF7A00]'
                    : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
                )}
              >
                PnL
              </button>
              <button
                onClick={() => setTab('target')}
                className={cn(
                  'text-xs lg:text-sm font-medium pb-2 border-b-2 transition-colors whitespace-nowrap',
                  tab === 'target'
                    ? 'text-[#EAECEF] border-[#FF7A00]'
                    : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
                )}
              >
                Target
              </button>
              <button
                onClick={() => setTab('liquidation')}
                className={cn(
                  'text-xs lg:text-sm font-medium pb-2 border-b-2 transition-colors whitespace-nowrap',
                  tab === 'liquidation'
                    ? 'text-[#EAECEF] border-[#FF7A00]'
                    : 'text-[#848E9C] border-transparent hover:text-[#EAECEF]'
                )}
              >
                Liquidation
              </button>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-[#2B3139] transition-colors flex-shrink-0"
              style={{ color: '#848E9C' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Symbol */}
          <div>
            <label className="text-xs font-medium" style={{ color: '#848E9C' }}>
              Symbol
            </label>
            <div className="mt-1 px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#1E2329', color: '#EAECEF' }}>
              {currentSymbol}
            </div>
          </div>

          {/* Long/Short Selector */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
              Position Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsLong(true)}
                className={cn(
                  'flex-1 h-9 px-3 rounded-lg text-sm font-semibold transition-all duration-200',
                  isLong
                    ? 'bg-[#0D9D5F] text-white shadow-lg'
                    : 'bg-[#1E2329] text-[#848E9C] hover:bg-[#2a3035]'
                )}
              >
                Long
              </button>
              <button
                onClick={() => setIsLong(false)}
                className={cn(
                  'flex-1 h-9 px-3 rounded-lg text-sm font-semibold transition-all duration-200',
                  !isLong
                    ? 'bg-[#C8102E] text-white shadow-lg'
                    : 'bg-[#1E2329] text-[#848E9C] hover:bg-[#2a3035]'
                )}
              >
                Short
              </button>
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
              Leverage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="125"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="flex-1 h-1 bg-[#1E2329] rounded-full appearance-none cursor-pointer accent-[#FF7A00]"
              />
              <span className="text-sm font-semibold text-[#EAECEF] min-w-[45px] text-right">{leverage}X</span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
              Quantity
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}>
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
            <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
              Open Price
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}>
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
              <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
                Close Price
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}>
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
              <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
                ROI
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}>
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
              <div className="relative">
                <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
                  Position Type
                </label>
                <button
                  onClick={() => setShowPositionDropdown(!showPositionDropdown)}
                  className={cn(
                    'w-full h-9 px-3 rounded-lg text-sm font-medium text-left transition-all duration-200 flex items-center justify-between',
                    showPositionDropdown ? 'border border-[#FF7A00]' : 'border border-[#2B3139] hover:border-[#FF7A00]'
                  )}
                  style={{ backgroundColor: '#1E2329' }}
                >
                  <span style={{ color: '#EAECEF' }} className="capitalize">
                    {positionType}
                  </span>
                  <svg
                    className={cn('w-4 h-4 transition-transform duration-200', showPositionDropdown && 'rotate-180')}
                    style={{ color: '#848E9C' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showPositionDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 overflow-hidden"
                    style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}
                  >
                    <button
                      onClick={() => {
                        setPositionType('cross');
                        setShowPositionDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[#2B3139]"
                      style={{ color: positionType === 'cross' ? '#FF7A00' : '#EAECEF' }}
                    >
                      Cross
                    </button>
                    <div style={{ borderColor: '#2B3139' }} className="border-t" />
                    <button
                      onClick={() => {
                        setPositionType('isolated');
                        setShowPositionDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[#2B3139]"
                      style={{ color: positionType === 'isolated' ? '#FF7A00' : '#EAECEF' }}
                    >
                      Isolated
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: '#848E9C' }}>
                  Available Margin
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}>
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
          <div className="rounded-lg p-3 mt-4" style={{ backgroundColor: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#EAECEF' }}>
              Results
            </div>

            {tab === 'pnl' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#848E9C' }}>
                    Margin
                  </span>
                  <span className="text-xs font-medium text-[#EAECEF]">{pnlResults.margin} USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#848E9C' }}>
                    Profit
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: parseFloat(pnlResults.profit) >= 0 ? '#0D9D5F' : '#C8102E' }}
                  >
                    {parseFloat(pnlResults.profit) >= 0 ? '+' : ''}{pnlResults.profit} USDT
                  </span>
                </div>
              </div>
            )}

            {tab === 'target' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#848E9C' }}>
                    Target Price
                  </span>
                  <span className="text-xs font-medium text-[#EAECEF]">{targetResults.targetPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#848E9C' }}>
                    Margin
                  </span>
                  <span className="text-xs font-medium text-[#EAECEF]">{targetResults.margin} USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#848E9C' }}>
                    Profit
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: parseFloat(targetResults.profit) >= 0 ? '#0D9D5F' : '#C8102E' }}
                  >
                    {parseFloat(targetResults.profit) >= 0 ? '+' : ''}{targetResults.profit} USDT
                  </span>
                </div>
              </div>
            )}

            {tab === 'liquidation' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#848E9C' }}>
                    Liquidation Price
                  </span>
                  <span className="text-xs font-medium text-[#EAECEF]">{liquidationResults.liquidationPrice}</span>
                </div>
              </div>
            )}
          </div>

          {/* Warning Message */}
          <p className="text-xs leading-relaxed px-3 py-2 rounded-lg" style={{ color: '#F0B90B', backgroundColor: 'rgba(240, 185, 11, 0.1)' }}>
            Results are for reference only. Deviations may occur in actual operations due to fees and funding rates.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 flex gap-3 border-t border-[#2B3139]">
          <button
            onClick={handleClose}
            className="flex-1 h-10 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110 active:brightness-90"
            style={{ backgroundColor: '#2B3139', color: '#EAECEF' }}
          >
            Cancel
          </button>
          <button
            onClick={handleClose}
            className="flex-1 h-10 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:brightness-90"
            style={{ backgroundColor: '#FF7A00' }}
          >
            Calculate
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarketInfo({ className }: MarketInfoProps) {
  useTranslations('trading');
  const { currentSymbol, tickers, setTicker } = useMarketStore();
  const tickerRef = useRef<BinanceTicker | null>(null);
  const [showMarketInfoModal, setShowMarketInfoModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);

  const ticker = tickers[currentSymbol] || null;
  tickerRef.current = ticker as BinanceTicker | null;

  useEffect(() => {
    const streamName = `${currentSymbol.toLowerCase()}@ticker`;

    const handleTickerMessage = (data: unknown) => {
      const tickerData = data as BinanceTicker;
      setTicker(tickerData.s, tickerData);
    };

    binanceWS.subscribe(streamName, handleTickerMessage);

    return () => {
      binanceWS.unsubscribe(streamName, handleTickerMessage);
    };
  }, [currentSymbol, setTicker]);

  const priceChangePercent = useMemo(() => {
    if (!ticker) return 0;
    return parseFloat(ticker.P);
  }, [ticker]);

  const isPositive = priceChangePercent >= 0;

  const stats = useMemo(() => {
    if (!ticker) {
      return {
        lastPrice: '--',
        priceChange: '--',
        priceChangePercent: '--',
        high24h: '--',
        low24h: '--',
        volume24h: '--',
        quoteVolume24h: '--',
        markPrice: '--',
        indexPrice: '--',
      };
    }

    return {
      lastPrice: formatPrice(ticker.c),
      priceChange: formatPrice(ticker.p),
      priceChangePercent: formatPercentage(ticker.P),
      high24h: formatPrice(ticker.h),
      low24h: formatPrice(ticker.l),
      volume24h: formatNumber(ticker.v, { decimals: 2 }),
      quoteVolume24h: formatNumber(ticker.q, { decimals: 2 }),
      markPrice: formatPrice(ticker.c),
      indexPrice: formatPrice(ticker.c),
    };
  }, [ticker]);

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 md:gap-4 px-0 py-0 bg-transparent border-0',
          className
        )}
      >
        {/* Info Icon Button - Left of Price */}
        <button
          onClick={() => setShowMarketInfoModal(true)}
          className="p-1.5 rounded hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#FF7A00] shrink-0"
          title="Market Info"
        >
          <Info size={16} />
        </button>

        {/* Calculator Icon Button */}
        <button
          onClick={() => setShowCalculatorModal(true)}
          className="p-1.5 rounded hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#FF7A00] shrink-0"
          title="Calculator"
        >
          <CalculatorIcon size={16} />
        </button>

        {/* Main Price with Change */}
        <div className="flex items-center gap-2 min-w-fit shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-sm md:text-base font-bold tabular-nums',
                  isPositive ? 'text-[#0D9D5F]' : 'text-[#C8102E]'
                )}
              >
                {stats.lastPrice}
              </span>
              <div className={cn(
                'flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] md:text-[9px] font-medium',
                isPositive ? 'bg-[#0D9D5F]/10 text-[#0D9D5F]' : 'bg-[#C8102E]/10 text-[#C8102E]'
              )}>
                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {isPositive ? '+' : ''}{stats.priceChangePercent}
              </div>
            </div>
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b] tabular-nums">
              ≈ ${stats.lastPrice}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden xs:block w-px h-6 md:h-7 bg-[#2a2a2d] shrink-0" />

        {/* Compact Stats - Bitunix Style */}
        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto scrollbar-hide flex-1">
          <div className="flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">Market Price</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">{stats.markPrice}</span>
          </div>

          <div className="flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">Index Price</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">{stats.indexPrice}</span>
          </div>

          <div className="flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">24H High</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">{stats.high24h}</span>
          </div>

          <div className="flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">24H Low</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">{stats.low24h}</span>
          </div>

          <div className="flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">24H Vol(BTC)</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">{stats.volume24h}</span>
          </div>

          <div className="hidden sm:flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">Vol(USDT)</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">{stats.quoteVolume24h}</span>
          </div>

          <div className="hidden md:flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">Funding</span>
            <span className="text-[9px] md:text-[10px] text-[#0D9D5F] tabular-nums">0.0100%</span>
          </div>

          <div className="hidden md:flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">Next</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">02:15:32</span>
          </div>

          <div className="hidden lg:flex flex-col gap-0 min-w-fit shrink-0">
            <span className="text-[8px] md:text-[9px] text-[#6b6b6b]">OI</span>
            <span className="text-[9px] md:text-[10px] text-[#f5f5f5] tabular-nums">4.52B</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <MarketInfoModal 
        symbol={currentSymbol}
        isOpen={showMarketInfoModal}
        onClose={() => setShowMarketInfoModal(false)}
      />
      <CalculatorModal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
    </>
  );
}
