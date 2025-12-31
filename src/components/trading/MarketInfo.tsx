'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPrice, formatNumber, formatPercentage } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { binanceWS } from '@/services/websocket';
import type { BinanceTicker } from '@/types';
import { TrendingUp, TrendingDown, Info, X } from 'lucide-react';

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
  const [tab, setTab] = useState<'pnl' | 'target' | 'liquidation'>('pnl');
  const [quantity, setQuantity] = useState('0');
  const [openPrice, setOpenPrice] = useState('0');
  const [leverage, setLeverage] = useState('20');
  const [closePrice, setClosePrice] = useState('0');

  return isOpen ? (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#121214] rounded-lg max-w-md w-full border border-[#2a2a2d]">
        {/* Header with Tabs */}
        <div className="border-b border-[#2a2a2d]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex gap-4">
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
            <button onClick={onClose} className="text-[#848E9C] hover:text-[#EAECEF]">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Currency Selector */}
          <div>
            <label className="text-xs text-[#848E9C] block mb-2">BTCUSDT</label>
            <div className="flex gap-2">
              <button className="flex-1 py-2 px-3 bg-[#0D9D5F] text-white rounded text-sm font-medium hover:bg-[#0a7a48]">
                Long
              </button>
              <button className="flex-1 py-2 px-3 bg-[#1E2329] text-[#848E9C] rounded text-sm font-medium hover:bg-[#2a3035]">
                Short
              </button>
            </div>
          </div>

          {/* Input Fields based on Tab */}
          {tab === 'pnl' && (
            <>
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
                  <span className="text-sm font-medium text-[#EAECEF] min-w-[50px]">{leverage} X</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Quantity</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
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

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Open price</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
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

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Close Price</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
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

              {/* Results */}
              <div className="bg-[#1E2329] rounded p-4 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">Margin</span>
                  <span className="text-sm font-medium text-[#EAECEF]">0.0000 USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">Profit</span>
                  <span className="text-sm font-medium text-[#EAECEF]">0.0000 USDT</span>
                </div>
              </div>
            </>
          )}

          {tab === 'target' && (
            <>
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
                  <span className="text-sm font-medium text-[#EAECEF] min-w-[50px]">{leverage} X</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Quantity</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
                  <input type="number" placeholder="0" className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none" />
                  <span className="text-xs text-[#848E9C]">BTC</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Open price</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
                  <input type="number" placeholder="0" className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none" />
                  <span className="text-xs text-[#848E9C]">USDT</span>
                </div>
              </div>

              {/* Results */}
              <div className="bg-[#1E2329] rounded p-4 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">Target Price</span>
                  <span className="text-sm font-medium text-[#EAECEF]">0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">Margin</span>
                  <span className="text-sm font-medium text-[#EAECEF]">0.0000 USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">Profit</span>
                  <span className="text-sm font-medium text-[#EAECEF]">0.0000 USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">ROI</span>
                  <span className="text-sm font-medium text-[#EAECEF]">0.00 %</span>
                </div>
              </div>
            </>
          )}

          {tab === 'liquidation' && (
            <>
              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Position type</label>
                <div className="bg-[#1E2329] rounded px-3 py-2">
                  <select className="bg-transparent text-[#EAECEF] text-sm w-full outline-none">
                    <option>Cross</option>
                  </select>
                </div>
              </div>

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
                  <span className="text-sm font-medium text-[#EAECEF] min-w-[50px]">{leverage} X</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Quantity</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
                  <input type="number" placeholder="0" className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none" />
                  <span className="text-xs text-[#848E9C]">BTC</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Open price</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
                  <input type="number" placeholder="0" className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none" />
                  <span className="text-xs text-[#848E9C]">USDT</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#848E9C] block mb-2">Available Margin</label>
                <div className="flex items-center gap-2 bg-[#1E2329] rounded px-3 py-2">
                  <input type="number" placeholder="0" className="bg-transparent text-[#EAECEF] text-sm flex-1 outline-none" />
                  <span className="text-xs text-[#848E9C]">USDT</span>
                </div>
              </div>

              {/* Results */}
              <div className="bg-[#1E2329] rounded p-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848E9C]">Liquidation Price</span>
                  <span className="text-sm font-medium text-[#EAECEF]">--</span>
                </div>
              </div>

              <p className="text-xs text-[#ef5350] mt-4">
                Results are for reference only. Deviations may occur in actual operations due to fees and funding rates.
              </p>
            </>
          )}

          {/* Calculate Button */}
          <button className="w-full py-3 px-4 bg-[#FF7A00] text-black rounded-lg font-semibold hover:bg-[#ff8c3a] transition-colors mt-6">
            Calculate
          </button>
        </div>
      </div>
    </div>
  ) : null;
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
