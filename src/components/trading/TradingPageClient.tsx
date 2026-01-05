'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { cn } from '@/lib/utils';
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

interface TradingPageClientProps {
  locale: string;
}

export function TradingPageClient({ locale }: TradingPageClientProps) {
  useTranslations('nav');
  const isRTL = locale === 'fa';
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

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
        <div className="bg-[#121214] border-b border-[#2a2a2d] shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5">
            <TickerSwitcher className="shrink-0" />
          </div>
          <MarketInfo className="bg-transparent border-0 px-3 py-2 mobile-market-info" />
        </div>

        {/* Main Content Area - Single scrollable page */}
        <div className="flex-1 overflow-y-auto bg-[#0d0d0f]">
          {/* Chart Section */}
          <div className="w-full h-[280px] shrink-0 border-b border-[#2a2a2d]">
            <TradingChart className="w-full h-full bg-[#0d0d0f] border-0 rounded-none" />
          </div>

          {/* Two-column layout for Orderbook and Order Form on mobile */}
          <div className="flex gap-px bg-[#2a2a2d]">
            {/* Left Column: Orderbook */}
            <div className="flex-1 min-w-0 bg-[#0d0d0f] max-h-[350px] overflow-hidden">
              <div className="px-2 py-2 border-b border-[#2a2a2d]">
                <h3 className="text-xs font-semibold text-[#a1a1a1]">Order Book</h3>
              </div>
              <Orderbook className="w-full h-full bg-[#0d0d0f] border-0 rounded-none" maxRows={12} />
            </div>

            {/* Right Column: Order Form */}
            <div className="flex-1 min-w-0 bg-[#0d0d0f] border-l border-[#2a2a2d] overflow-y-auto">
              <div className="px-2 py-2 border-b border-[#2a2a2d]">
                <h3 className="text-xs font-semibold text-[#a1a1a1]">Trading</h3>
              </div>
              <OrderForm className="bg-transparent border-0 rounded-none" />
            </div>
          </div>

          {/* Account Assets Section */}
          <div className="border-t border-[#2a2a2d] bg-[#121214]">
            <div className="px-3 py-2 border-b border-[#2a2a2d]">
              <h3 className="text-xs font-semibold text-[#a1a1a1]">Account</h3>
            </div>
            <AccountAssets symbol="BTC/USDT" />
          </div>

          {/* Orders/Positions Section */}
          <div className="border-t border-[#2a2a2d] bg-[#121214]">
            <div className="px-3 py-2 border-b border-[#2a2a2d]">
              <h3 className="text-xs font-semibold text-[#a1a1a1]">Positions & Orders</h3>
            </div>
            <OrdersPanel className="w-full bg-[#0d0d0f] border-0 rounded-none" />
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
          <MarketInfo className="flex-1 bg-transparent border-0 py-0 px-0 overflow-hidden" />
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
              <div className="border-t border-[#2a2a2d] bg-[#121214]">
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
      <div className="bg-[#121214] border-b border-[#2a2a2d] px-3 py-1.5 flex items-center gap-3">
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
          <div className="h-[160px] flex-shrink-0 bg-[#0B0E11] border-t border-[#2a2a2d] overflow-hidden">
            <OrdersPanel className="w-full h-full overflow-auto" />
          </div>
        </div>

        {/* RIGHT COLUMN: Order Form + Account Assets - Fixed width, scrolls with page */}
        <aside className={cn(
          'w-[280px] flex flex-col flex-shrink-0 border-l border-[#2a2a2d] bg-[#0B0E11] overflow-y-auto',
          isRTL && 'border-l-0 border-r'
        )}>
          {/* Order Form Section */}
          <div className="bg-[#0B0E11] shrink-0">
            <OrderForm className="bg-transparent border-0" />
          </div>

          {/* Account Assets Section - Expands naturally */}
          <div className="border-t border-[#2a2a2d] bg-[#0B0E11]">
            <AccountAssets symbol="BTC/USDT" />
          </div>
        </aside>
      </div>
    </div>
  );
}
