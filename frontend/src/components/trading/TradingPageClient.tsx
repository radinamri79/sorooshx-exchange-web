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
} from '@/components/trading';
import { binanceWS } from '@/services/websocket';
import { BarChart3, BookOpen, Wallet, History, Menu, X } from 'lucide-react';

interface TradingPageClientProps {
  locale: string;
}

export function TradingPageClient({ locale }: TradingPageClientProps) {
  const t = useTranslations('nav');
  const isRTL = locale === 'fa';
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'orderbook' | 'order' | 'positions'>('chart');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check screen size
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

  // Connect WebSocket on mount
  useEffect(() => {
    binanceWS.connect();
    return () => binanceWS.disconnect();
  }, []);

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-black" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-3 py-2 bg-black border-b border-[#1e2329]">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="SorooshX" width={28} height={28} className="rounded" />
            <span className="font-bold text-white text-sm">SOROOSHX</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#848e9c]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Market Info - Compact */}
        <div className="bg-black border-b border-[#1e2329]">
          <div className="flex items-center gap-2 px-3 py-2">
            <TickerSwitcher className="shrink-0" />
          </div>
          <MarketInfo className="bg-black border-0 px-3 py-2" />
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-auto bg-black">
          {activeTab === 'chart' && (
            <TradingChart className="h-[calc(100vh-280px)] min-h-[300px] bg-black border-0 rounded-none" />
          )}
          {activeTab === 'orderbook' && (
            <Orderbook className="h-full bg-black border-0 rounded-none" maxRows={25} />
          )}
          {activeTab === 'order' && (
            <OrderForm className="bg-black border-0 rounded-none" />
          )}
          {activeTab === 'positions' && (
            <OrdersPanel className="h-full bg-black border-0 rounded-none" />
          )}
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex items-center justify-around bg-black border-t border-[#1e2329] py-2 safe-area-bottom">
          <button
            onClick={() => setActiveTab('chart')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
              activeTab === 'chart' ? 'text-[#ed7620]' : 'text-[#848e9c]'
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Chart</span>
          </button>
          <button
            onClick={() => setActiveTab('orderbook')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
              activeTab === 'orderbook' ? 'text-[#ed7620]' : 'text-[#848e9c]'
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Order Book</span>
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
              activeTab === 'order' ? 'text-[#ed7620]' : 'text-[#848e9c]'
            )}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px]">Trade</span>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
              activeTab === 'positions' ? 'text-[#ed7620]' : 'text-[#848e9c]'
            )}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">Positions</span>
          </button>
        </div>
      </div>
    );
  }

  // Tablet Layout (768px - 1024px)
  if (isTablet) {
    return (
      <div className="flex flex-col h-screen bg-black" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Market Info Header */}
        <header className="bg-black border-b border-[#1e2329]">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="SorooshX" width={32} height={32} className="rounded" />
              <span className="font-bold text-white">SOROOSHX</span>
            </div>
            <TickerSwitcher />
          </div>
          <MarketInfo className="bg-black border-0" />
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chart */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <TradingChart className="flex-1 min-h-[300px] bg-black border-0 rounded-none border-r border-[#1e2329]" />
            <OrdersPanel className="h-[200px] bg-black border-0 rounded-none border-t border-[#1e2329]" />
          </main>

          {/* Right: Orderbook + Order Form stacked */}
          <aside className="w-[320px] flex flex-col border-l border-[#1e2329]">
            <Orderbook className="flex-1 bg-black border-0 rounded-none" maxRows={12} />
            <OrderForm className="bg-black border-0 rounded-none border-t border-[#1e2329]" />
          </aside>
        </div>
      </div>
    );
  }

  // Desktop Layout (1024px+) - Matching the example screenshot exactly
  return (
    <div className="flex flex-col h-screen bg-black" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Market Info Header - Zone 3 */}
      <header className="bg-black border-b border-[#1e2329]">
        <div className="flex items-center gap-4 px-4 py-2">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="SorooshX" width={32} height={32} className="rounded" />
            <span className="font-bold text-white text-lg">SOROOSHX</span>
          </div>
          
          {/* Ticker Switcher */}
          <TickerSwitcher />
          
          {/* Market Info fills remaining space */}
          <MarketInfo className="flex-1 bg-transparent border-0 py-0" />
        </div>
      </header>

      {/* Main Trading Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section: Chart + Orders Panel */}
        <main className={cn('flex-1 flex flex-col overflow-hidden', isRTL && 'order-2')}>
          {/* Zone 4: Trading Chart */}
          <TradingChart className="flex-1 min-h-[400px] bg-black border-0 rounded-none" />
          
          {/* Zone 5: Orders/Positions Panel */}
          <OrdersPanel className="h-[240px] bg-black border-0 rounded-none border-t border-[#1e2329]" />
        </main>

        {/* Right Section: Orderbook + Order Form */}
        <aside
          className={cn(
            'w-[560px] xl:w-[640px] 2xl:w-[720px] flex border-l border-[#1e2329] bg-black',
            isRTL && 'order-1 border-l-0 border-r'
          )}
        >
          {/* Zone 2: Orderbook */}
          <div className="w-[280px] xl:w-[320px] 2xl:w-[360px] flex flex-col border-r border-[#1e2329]">
            <Orderbook className="flex-1 bg-black border-0 rounded-none" maxRows={22} />
          </div>
          
          {/* Zone 1: Order Form */}
          <div className="flex-1 flex flex-col overflow-auto">
            <OrderForm className="flex-none bg-black border-0 rounded-none" />
          </div>
        </aside>
      </div>
    </div>
  );
}
