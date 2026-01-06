'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Info, Calculator as CalculatorIcon, TrendingUp } from 'lucide-react';
import { cn, calculateBuySellRatio } from '@/lib/utils';
import {
  MarketInfo,
  TickerSwitcher,
  OrderForm,
  Orderbook,
  TradingChart,
  OrdersPanel,
  AccountAssets,
} from '@/components/trading';
import { binanceWS } from '@/services/websocket';
import { useOrderbookStore } from '@/stores/useOrderbookStore';

interface TradingPageClientProps {
  locale: string;
}

export function TradingPageClient({ locale }: TradingPageClientProps) {
  useTranslations('nav');
  const isRTL = locale === 'fa';
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isTpSlEnabled, setIsTpSlEnabled] = useState(false);
  
  const marketInfoRef = useRef<{ triggerInfoModal: () => void; triggerCalculatorModal: () => void } | null>(null);
  const { bids, asks } = useOrderbookStore();

  const handleCloseChartModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowChartModal(false);
      setIsClosingModal(false);
    }, 300);
  };

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    binanceWS.connect();
    return () => binanceWS.disconnect();
  }, []);

  // Mobile Layout - Single page responsive design without bottom navigation
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Symbol & Market Info Bar - Mobile */}
        <div className="bg-[#0d0d0f] border-b border-[#2a2a2d] shrink-0 flex flex-col">
          {/* Row 1: TickerSwitcher (left) + Icons (right, larger) */}
          <div className="flex items-center justify-between px-3 py-1 gap-1.5">
            <TickerSwitcher className="shrink-0" isMobile={true} />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => marketInfoRef.current?.triggerInfoModal()}
                className="p-2 rounded hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#ffb496]"
                title="Market Info"
              >
                <Info size={20} />
              </button>
              <button
                onClick={() => marketInfoRef.current?.triggerCalculatorModal()}
                className="p-2 rounded hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#ffb496]"
                title="Calculator"
              >
                <CalculatorIcon size={20} />
              </button>
              <button
                onClick={() => setShowChartModal(true)}
                className="p-2 rounded hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#ffb496]"
                title="Candlestick Chart"
              >
                <TrendingUp size={20} />
              </button>
            </div>
          </div>
          {/* Row 2-3: Price centered and Market Stats */}
          <div className="px-3 pb-0.5">
            <MarketInfo ref={marketInfoRef} className="bg-transparent border-0" isMobile={true} />
          </div>
        </div>

        {/* Main Content Area - Single scrollable page */}
        <div className="flex-1 overflow-y-auto bg-[#0d0d0f]">
          {/* Chart Modal - Full screen */}
          {showChartModal && (
            <div className={cn(
              'fixed inset-0 bg-[#0d0d0f] z-50 flex flex-col',
              isClosingModal ? 'animate-slide-out-right' : 'animate-slide-in-right'
            )}>
              {/* Header with Back Button and TickerSwitcher */}
              <div className="bg-[#0d0d0f] border-b border-[#2a2a2d] shrink-0 px-3 py-2 flex items-center justify-between">
                <button
                  onClick={handleCloseChartModal}
                  className="p-2 rounded hover:bg-[#1E2329] transition-colors text-[#848E9C] hover:text-[#ffb496]"
                  title="Back"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 flex justify-center">
                  <TickerSwitcher className="shrink-0" isMobile={true} />
                </div>
                <div className="w-10" />
              </div>
              
              {/* Chart Content */}
              <div className="flex-1 overflow-y-auto flex flex-col bg-[#0d0d0f]">
                {/* Trading Chart */}
                <div className="shrink-0 h-auto border-b border-[#2a2a2d]">
                  <TradingChart className="w-full h-full bg-[#0d0d0f] border-0 rounded-none" />
                </div>

                {/* Buy-Sell Ratio Bar - Desktop Style with Real Data */}
                {(() => {
                  // Use same 10-item limit as Orderbook component for consistency
                  const { buyPercentage, sellPercentage } = calculateBuySellRatio(bids, asks, 10);

                  return (
                    <div className="shrink-0 flex items-center justify-between gap-1 border-b border-[#2a2a2d] bg-[#0d0d0f] px-1.5 py-1">
                      {/* Buy Percentage with Square Indicator */}
                      <div className="flex items-center gap-0.5">
                        <div className="rounded-sm w-2 h-2" style={{ backgroundColor: '#0D9D5F' }} />
                        <span className="text-[10px] font-semibold text-[#0D9D5F]" style={{ minWidth: '30px' }}>{buyPercentage}%</span>
                      </div>

                      {/* Ratio Bar */}
                      <div className="flex-1 h-2 bg-[#1E2329] rounded-full overflow-hidden flex shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        <div 
                          className="transition-all duration-300"
                          style={{ 
                            width: `${buyPercentage}%`,
                            height: '100%',
                            backgroundColor: '#0D9D5F',
                            boxShadow: '0 0 10px rgba(13, 157, 95, 0.6)'
                          }} 
                        />
                        <div 
                          className="transition-all duration-300"
                          style={{ 
                            width: `${sellPercentage}%`,
                            height: '100%',
                            backgroundColor: '#C8102E',
                            boxShadow: '0 0 10px rgba(200, 16, 46, 0.6)'
                          }} 
                        />
                      </div>
                      
                      {/* Sell Percentage with Square Indicator */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] font-semibold text-[#C8102E]" style={{ minWidth: '30px', textAlign: 'right' }}>{sellPercentage}%</span>
                        <div className="rounded-sm w-2 h-2" style={{ backgroundColor: '#C8102E' }} />
                      </div>
                    </div>
                  );
                })()}

                {/* OrderBook - Single Column Layout (Buy Left, Sell Right) */}
                <div className="h-auto flex flex-col bg-[#0d0d0f]">
                  {/* OrderBook Header */}
                  <div className="shrink-0 flex gap-px border-b border-[#2a2a2d] bg-[#0d0d0f]">
                    <div className="flex-1 px-3 py-2 text-center border-r border-[#2a2a2d]">
                      <p className="text-xs font-semibold text-[#848E9C] uppercase">Buy Orders</p>
                    </div>
                    <div className="flex-1 px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-[#848E9C] uppercase">Sell Orders</p>
                    </div>
                  </div>

                  {/* OrderBook Rows - Single Item Per Row */}
                  <div className="flex gap-px">
                    {/* Buy Side (Left) */}
                    <div className="flex-1 bg-[#0d0d0f]">
                      <div className="space-y-0.5 px-2 py-1.5">
                        {/* Buy Orders - Dynamic from store, max 10 items */}
                        {bids.slice(0, 10).map(([price, qty], idx) => (
                          <div key={`bid-${idx}`} className="flex justify-between text-[10px] py-1 px-1.5 rounded bg-[#0D9D5F]/5 border border-[#0D9D5F]/10">
                            <span className="text-[#0D9D5F] font-semibold">{price}</span>
                            <span className="text-[#EAECEF]">{qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sell Side (Right) */}
                    <div className="flex-1 bg-[#0d0d0f]">
                      <div className="space-y-0.5 px-2 py-1.5">
                        {/* Sell Orders - Dynamic from store, max 10 items */}
                        {asks.slice(0, 10).map(([price, qty], idx) => (
                          <div key={`ask-${idx}`} className="flex justify-between text-[10px] py-1 px-1.5 rounded bg-[#C8102E]/5 border border-[#C8102E]/10">
                            <span className="text-[#C8102E] font-semibold">{price}</span>
                            <span className="text-[#EAECEF]">{qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 bg-[#0d0d0f] border-t border-[#2a2a2d] px-3 py-3 flex gap-2">
                  <button
                    onClick={() => {
                      setShowChartModal(false);
                    }}
                    className="flex-1 h-10 rounded font-semibold text-white transition-all active:scale-95 hover:brightness-110 bg-[#0D9D5F] text-sm"
                  >
                    Open Long
                  </button>
                  <button
                    onClick={() => {
                      setShowChartModal(false);
                    }}
                    className="flex-1 h-10 rounded font-semibold text-white transition-all active:scale-95 hover:brightness-110 bg-[#C8102E] text-sm"
                  >
                    Open Short
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Two-column layout for Orderbook and Order Form on mobile */}
          <div className="flex gap-px bg-[#2a2a2d]">
            {/* Left Column: Orderbook */}
            <div className="flex-1 min-w-0 bg-[#0d0d0f] overflow-hidden">
              <Orderbook 
                className="w-full h-full bg-[#0d0d0f] border-0 rounded-none" 
                maxRows={isTpSlEnabled ? 16 : 12} 
                isMobile={true} 
              />
            </div>

            {/* Right Column: Order Form */}
            <div className="flex-1 min-w-0 bg-[#0d0d0f] border-l border-[#2a2a2d] overflow-y-auto">
              <OrderForm 
                className="bg-transparent border-0 rounded-none" 
                isMobile={true} 
                onTpSlChange={setIsTpSlEnabled}
              />
            </div>
          </div>

          {/* Account Assets Section */}
          <div className="border-t border-[#2a2a2d] bg-[#0d0d0f]">
            {!isMobile && (
              <div className="px-3 py-2 border-b border-[#2a2a2d]">
                <h3 className="text-xs font-semibold text-[#a1a1a1]">Account</h3>
              </div>
            )}
            <AccountAssets symbol="BTC/USDT" isMobile={isMobile} />
          </div>

          {/* Orders/Positions Section */}
          <div className="border-t border-[#2a2a2d] bg-[#0d0d0f]">
            {!isMobile && (
              <div className="px-3 py-2 border-b border-[#2a2a2d]">
                <h3 className="text-xs font-semibold text-[#a1a1a1]">Positions & Orders</h3>
              </div>
            )}
            <OrdersPanel className="w-full bg-[#0d0d0f] border-0 rounded-none" isMobile={isMobile} />
          </div>
        </div>
      </div>
    );
  }

  // Tablet Layout (768px - 1024px)
  if (isTablet) {
    return (
      <div className="flex flex-col h-screen bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="bg-[#0d0d0f] border-b border-[#2a2a2d] px-3 h-14 flex items-center gap-3">
          <Image src="/sorooshx-logo.png" alt="SorooshX" width={120} height={32} className="object-contain" />
          <TickerSwitcher />
          <MarketInfo className="flex-1 bg-[#0d0d0f] border-0 py-0 px-0 overflow-hidden" />
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden">
            <TradingChart className="flex-1 min-h-[280px] bg-[#0d0d0f] border-0 rounded-none" />
            <OrdersPanel className="h-[140px] bg-[#0d0d0f] border-0 rounded-none border-t border-[#2a2a2d]" />
          </main>

          <aside className="w-[280px] flex flex-col border-l border-[#2a2a2d]">
            <Orderbook className="flex-[1.2] bg-[#0d0d0f] border-0 rounded-none border-b border-[#2a2a2d]" maxRows={10} />
            <div className="flex-1 overflow-y-auto">
              {/* Order Form Section */}
              <div className="bg-[#0d0d0f]">
                <OrderForm className="bg-transparent border-0 rounded-none" />
              </div>

              {/* Account Assets Section */}
              <div className="border-t border-[#2a2a2d] bg-[#0d0d0f]">
                <AccountAssets symbol="BTC/USDT" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // Desktop Layout (1024px+) - Compact Bitget Style with visible OrderBook
  return (
    <div className="flex flex-col h-screen bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* TOP NAV BAR - Matches main website design */}
      <header className="bg-[#0d0d0f] border-b border-[#2a2a2d] px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center shrink-0">
          <Image src="/sorooshx-logo.png" alt="SorooshX" width={160} height={40} className="object-contain" />
        </div>

        {/* Right side: Login / Sign up (optional, can be hidden or removed) */}
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 text-sm font-medium text-white hover:text-[#ffb496] transition-colors">
            Login
          </button>
          <button className="px-4 py-1.5 text-sm font-medium text-white border border-white rounded hover:bg-white/10 transition-colors">
            Sign up
          </button>
        </div>
      </header>

      {/* SUB-HEADER: Symbol Info Bar - Compact */}
      <div className="bg-[#0d0d0f] border-b border-[#2a2a2d] px-3 py-1.5 flex items-center gap-3">
        <div className="shrink-0">
          <TickerSwitcher />
        </div>
        <div className="w-px h-6 bg-[#2a2a2d]" />
        <MarketInfo className="flex-1 bg-transparent border-0 py-0 px-0" />
      </div>

      {/* MAIN TRADING AREA: Flex container for all content - fills remaining height */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0d0d0f]">
        
        {/* LEFT SECTION: Chart (top) + Orders Panel (bottom) - Flex column with flex-1 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0d0d0f]">
          {/* TOP: Chart + Orderbook */}
          <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0d0d0f]">
            {/* Chart */}
            <main className={cn('flex-1 flex flex-col overflow-hidden min-w-0', isRTL && 'order-2')}>
              <div className="flex-1 overflow-hidden bg-[#0d0d0f]">
                <TradingChart className="w-full h-full bg-[#0d0d0f] border-0" />
              </div>
            </main>

            {/* Order Book */}
            <aside className={cn(
              'w-[260px] xl:w-[280px] flex flex-col border-l border-[#2a2a2d] overflow-hidden',
              isRTL && 'order-1 border-l-0 border-r'
            )}>
              <div className="flex-1 flex overflow-hidden">
                <Orderbook 
                  className="w-full h-full bg-[#0d0d0f] border-0" 
                  maxRows={10}
                />
              </div>
            </aside>
          </div>

          {/* BOTTOM: Orders Panel - Minimal height to maximize orderbook space */}
          <div className="h-[160px] flex-shrink-0 bg-[#0d0d0f] border-t border-[#2a2a2d] overflow-hidden">
            <OrdersPanel className="w-full h-full overflow-auto" />
          </div>
        </div>

        {/* RIGHT COLUMN: Order Form + Account Assets - Fixed width, scrolls with page */}
        <aside className={cn(
          'w-[280px] flex flex-col flex-shrink-0 border-l border-[#2a2a2d] bg-[#0d0d0f] overflow-y-auto',
          isRTL && 'border-l-0 border-r'
        )}>
          {/* Order Form Section */}
          <div className="bg-[#0d0d0f] shrink-0">
            <OrderForm className="bg-transparent border-0" />
          </div>

          {/* Account Assets Section - Expands naturally */}
          <div className="border-t border-[#2a2a2d] bg-[#0d0d0f]">
            <AccountAssets symbol="BTC/USDT" />
          </div>
        </aside>
      </div>
    </div>
  );
}
