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
import { 
  CandlestickChart, 
  BookOpenText, 
  ArrowRightLeft, 
  ClipboardList, 
  Menu, 
  X, 
  Bell, 
  Settings, 
  User, 
  HelpCircle,
  Wallet
} from 'lucide-react';

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

  // Mobile Layout - Optimized for small screens
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Mobile Header - Compact */}
        <header className="flex items-center justify-between px-3 h-11 bg-[#121214] border-b border-[#2a2a2d] shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="SorooshX" width={22} height={22} className="rounded" />
            <span className="font-bold text-white text-[11px] tracking-tight">SOROOSHX</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="p-2 text-[#6b6b6b] hover:text-white active:bg-[#1e1f23] rounded transition-colors">
              <Bell className="w-[18px] h-[18px]" />
            </button>
            <button className="p-2 text-[#6b6b6b] hover:text-white active:bg-[#1e1f23] rounded transition-colors">
              <Wallet className="w-[18px] h-[18px]" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#6b6b6b] hover:text-white active:bg-[#1e1f23] rounded transition-colors"
            >
              {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-11 left-0 right-0 z-50 bg-[#121214] border-b border-[#2a2a2d] shadow-lg">
            <div className="p-3 space-y-2">
              <button className="w-full py-2.5 px-3 text-left text-sm text-[#f5f5f5] hover:bg-[#1e1f23] rounded-lg flex items-center gap-2">
                <User className="w-4 h-4 text-[#ed7620]" />
                Login / Register
              </button>
              <div className="border-t border-[#2a2a2d] pt-2 grid grid-cols-2 gap-2">
                <button className="py-2 px-3 text-xs text-[#a1a1a1] hover:text-white hover:bg-[#1e1f23] rounded-lg">Spot</button>
                <button className="py-2 px-3 text-xs text-[#ed7620] bg-[#ed7620]/10 rounded-lg font-medium">Futures</button>
                <button className="py-2 px-3 text-xs text-[#a1a1a1] hover:text-white hover:bg-[#1e1f23] rounded-lg">Convert</button>
                <button className="py-2 px-3 text-xs text-[#a1a1a1] hover:text-white hover:bg-[#1e1f23] rounded-lg">Copy Trade</button>
              </div>
            </div>
          </div>
        )}

        {/* Symbol & Market Info Bar */}
        <div className="bg-[#121214] border-b border-[#2a2a2d] shrink-0">
          <div className="flex items-center gap-2 px-3 py-2">
            <TickerSwitcher className="shrink-0" />
          </div>
          <MarketInfo className="bg-transparent border-0 px-3 py-1.5 overflow-x-auto" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden bg-[#0d0d0f]">
          {activeTab === 'chart' && (
            <TradingChart className="h-full min-h-[300px] bg-[#0d0d0f] border-0 rounded-none" />
          )}
          {activeTab === 'orderbook' && (
            <Orderbook className="h-full bg-[#0d0d0f] border-0 rounded-none" maxRows={25} />
          )}
          {activeTab === 'order' && (
            <div className="h-full overflow-y-auto">
              {/* Order Form Section */}
              <div className="bg-[#0d0d0f]">
                <OrderForm className="bg-transparent border-0 rounded-none" />
              </div>

              {/* Account Assets Section for Mobile */}
              <div className="border-t border-[#2a2a2d] bg-[#121214]">
                <AccountAssets symbol="BTC/USDT" />
              </div>
            </div>
          )}
          {activeTab === 'positions' && (
            <OrdersPanel className="h-full bg-[#0d0d0f] border-0 rounded-none" />
          )}
        </div>

        {/* Bottom Navigation - iOS/Android Style */}
        <nav className="flex items-center justify-around bg-[#121214] border-t border-[#2a2a2d] h-14 shrink-0 safe-area-bottom">
          <button
            onClick={() => setActiveTab('chart')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:bg-[#1e1f23]',
              activeTab === 'chart' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <CandlestickChart className={cn('w-5 h-5', activeTab === 'chart' && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">Chart</span>
          </button>
          <button
            onClick={() => setActiveTab('orderbook')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:bg-[#1e1f23]',
              activeTab === 'orderbook' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <BookOpenText className={cn('w-5 h-5', activeTab === 'orderbook' && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">Order Book</span>
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:bg-[#1e1f23]',
              activeTab === 'order' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <ArrowRightLeft className={cn('w-5 h-5', activeTab === 'order' && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">Trade</span>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:bg-[#1e1f23]',
              activeTab === 'positions' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <ClipboardList className={cn('w-5 h-5', activeTab === 'positions' && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">Positions</span>
          </button>
        </nav>
      </div>
    );
  }

  // Tablet Layout (768px - 1024px)
  if (isTablet) {
    return (
      <div className="flex flex-col h-screen bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="bg-[#121214] border-b border-[#2a2a2d] px-3 h-11 flex items-center">
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-1.5 shrink-0">
              <Image src="/logo.svg" alt="SorooshX" width={22} height={22} className="rounded" />
              <span className="font-bold text-white text-xs">SOROOSHX</span>
            </div>
            <TickerSwitcher />
            <MarketInfo className="flex-1 bg-transparent border-0 py-0 px-0 overflow-hidden" />
            <button className="p-1.5 text-[#6b6b6b] hover:text-white rounded hover:bg-[#1e1f23]">
              <User className="w-4 h-4" />
            </button>
          </div>
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
      {/* TOP NAV BAR - Compact */}
      <header className="bg-[#121214] border-b border-[#2a2a2d] px-3 h-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 shrink-0">
            <Image src="/logo.svg" alt="SorooshX" width={24} height={24} className="rounded" />
            <span className="font-bold text-white text-sm tracking-tight">SOROOSHX</span>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5">
            <button className="px-2 py-1 text-xs font-medium text-[#ed7620] bg-[#ed7620]/10 rounded">
              Futures
            </button>
            <button className="px-2 py-1 text-xs font-medium text-[#a1a1a1] hover:text-white transition-colors">
              Spot
            </button>
            <button className="px-2 py-1 text-xs font-medium text-[#a1a1a1] hover:text-white transition-colors">
              Convert
            </button>
            <button className="px-2 py-1 text-xs font-medium text-[#a1a1a1] hover:text-white transition-colors">
              Copy
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 text-[#a1a1a1] hover:text-white transition-colors rounded hover:bg-[#1e1f23]">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-[#a1a1a1] hover:text-white transition-colors rounded hover:bg-[#1e1f23]">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-[#a1a1a1] hover:text-white transition-colors rounded hover:bg-[#1e1f23]">
            <Settings className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#2a2a2d]" />
          <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[#ed7620] hover:bg-[#ff8c3a] rounded transition-colors">
            <User className="w-3.5 h-3.5" />
            Login
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

      {/* MAIN TRADING AREA: Flex column layout with top section and bottom orders panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0f]">
        
        {/* TOP SECTION: Chart + Orderbook + OrderForm */}
        <div className="flex-1 flex overflow-hidden bg-[#0d0d0f]">
          {/* LEFT COLUMN: Chart */}
          <main className={cn('flex-1 flex flex-col overflow-hidden min-w-0', isRTL && 'order-2')}>
            {/* TradingView Chart */}
            <div className="flex-1 overflow-hidden bg-[#0d0d0f]">
              <TradingChart className="w-full h-full bg-[#0d0d0f] border-0" />
            </div>
          </main>

          {/* MIDDLE COLUMN: Order Book */}
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

          {/* RIGHT COLUMN: Order Form + Account Assets */}
          <aside className={cn(
            'w-[280px] flex flex-col border-l border-[#2a2a2d] bg-[#0B0E11]',
            isRTL && 'order-3 border-l-0 border-r'
          )}>
            {/* Order Form Section */}
            <div className="bg-[#0B0E11] shrink-0">
              <OrderForm className="bg-transparent border-0" />
            </div>

            {/* Account Assets Section */}
            <div className="border-t border-[#2a2a2d] bg-[#0B0E11] shrink-0">
              <AccountAssets symbol="BTC/USDT" />
            </div>
          </aside>
        </div>

        {/* BOTTOM SECTION: Orders Panel - Spans Chart + Orderbook width, right column empty */}
        <div className="flex h-[220px] bg-[#0B0E11] border-t border-[#2a2a2d] overflow-hidden">
          {/* Orders Panel spans flex-1 (chart) + w-[260px] (orderbook) */}
          <div className="flex-1 flex overflow-hidden border-r border-[#2a2a2d]">
            <OrdersPanel className="flex-1 overflow-auto" />
          </div>
          
          {/* RIGHT COLUMN: Empty space matching OrderForm width */}
          <aside className={cn(
            'w-[280px] border-l border-[#2a2a2d] bg-[#0B0E11]',
            isRTL && 'border-l-0 border-r'
          )} />
        </div>
      </div>
    </div>
  );
}
