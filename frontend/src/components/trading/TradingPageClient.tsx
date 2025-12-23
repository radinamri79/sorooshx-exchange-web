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
  AccountInfoPanel,
} from '@/components/trading';
import { binanceWS } from '@/services/websocket';
import { BarChart3, BookOpen, Wallet, History, Menu, X } from 'lucide-react';

interface TradingPageClientProps {
  locale: string;
}

export function TradingPageClient({ locale }: TradingPageClientProps) {
  useTranslations('nav');
  const isRTL = locale === 'fa';
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'orderbook' | 'order' | 'positions'>('chart');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-black" dir={isRTL ? 'rtl' : 'ltr'}>
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

        <div className="bg-black border-b border-[#1e2329]">
          <div className="flex items-center gap-2 px-3 py-2">
            <TickerSwitcher className="shrink-0" />
          </div>
          <MarketInfo className="bg-black border-0 px-3 py-2" />
        </div>

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
        {/* Compact Header - Bitget Style */}
        <header className="bg-black border-b border-[#1e2329] px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Image src="/logo.svg" alt="SorooshX" width={28} height={28} className="rounded" />
              <span className="font-bold text-white text-sm">SOROOSHX</span>
            </div>
            <TickerSwitcher />
            <MarketInfo className="flex-1 bg-transparent border-0 py-0 px-0" />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chart (Takes most space) */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <TradingChart className="flex-1 min-h-[300px] bg-black border-0 rounded-none border-r border-[#1e2329]" />
            <OrdersPanel className="h-[180px] bg-black border-0 rounded-none border-t border-[#1e2329]" />
          </main>

          {/* Right: Order Book + Order Form */}
          <aside className="w-80 flex flex-col border-l border-[#1e2329]">
            <Orderbook className="flex-1 bg-black border-0 rounded-none border-b border-[#1e2329]" maxRows={14} />
            <OrderForm className="h-auto bg-black border-0 rounded-none overflow-auto flex-shrink-0" />
          </aside>
        </div>
      </div>
    );
  }

  // Desktop Layout (1024px+) - BITGET STYLE
  return (
    <div className="flex flex-col h-screen bg-black" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* HEADER: Compact single line with all info */}
      <header className="bg-[#0a0e27] border-b border-[#1e2329] px-4 py-2.5 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full">
          {/* Logo + Symbol */}
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="SorooshX" width={32} height={32} className="rounded" />
            <span className="font-bold text-white text-base">SOROOSHX</span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-[#1e2329]" />

          {/* Ticker Switcher */}
          <div className="shrink-0">
            <TickerSwitcher />
          </div>

          {/* Market Stats (Compact inline) */}
          <MarketInfo className="flex-1 bg-transparent border-0 py-0 px-0 h-full" />
        </div>
      </header>

      {/* MAIN TRADING AREA: 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden bg-black">
        {/* LEFT COLUMN: Chart (Large) */}
        <main className={cn('flex-1 flex flex-col overflow-hidden border-r border-[#1e2329]', isRTL && 'order-2')}>
          {/* TradingView Chart with left toolbar */}
          <div className="flex-1 overflow-hidden">
            <TradingChart className="w-full h-full bg-black border-0 rounded-none" />
          </div>

          {/* Orders & Positions Panel */}
          <div className="h-[220px] border-t border-[#1e2329] bg-black overflow-hidden">
            <OrdersPanel className="h-full bg-black border-0 rounded-none" />
          </div>
        </main>

        {/* RIGHT COLUMN: Order Book + Order Form + Account Info */}
        <aside className={cn(
          'w-96 flex flex-col bg-black border-l border-[#1e2329] overflow-hidden',
          isRTL && 'order-1 border-l-0 border-r border-[#1e2329]'
        )}>
          {/* Order Book Section */}
          <div className="h-1/3 border-b border-[#1e2329] overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-[#1e2329] bg-[#0a0e27]">
              <h3 className="text-xs font-semibold text-white">Order book</h3>
            </div>
            <Orderbook 
              className="flex-1 bg-black border-0 rounded-none overflow-auto" 
              maxRows={12}
            />
          </div>

          {/* Order Form Section */}
          <div className="h-1/3 border-b border-[#1e2329] bg-black overflow-auto flex flex-col">
            <OrderForm className="flex-1 bg-black border-0 rounded-none" />
          </div>

          {/* Account Info Section */}
          <div className="flex-1 border-t border-[#1e2329] overflow-auto">
            <AccountInfoPanel className="h-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}
