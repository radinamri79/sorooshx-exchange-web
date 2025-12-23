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
import { BarChart3, BookOpen, Wallet, History, Menu, X, Bell, Settings, User, HelpCircle } from 'lucide-react';

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
      <div className="flex flex-col h-screen bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="flex items-center justify-between px-2 py-1.5 bg-[#121214] border-b border-[#2a2a2d]">
          <div className="flex items-center gap-1.5">
            <Image src="/logo.svg" alt="SorooshX" width={24} height={24} className="rounded" />
            <span className="font-bold text-white text-xs">SOROOSHX</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-[#a1a1a1] hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-[#a1a1a1] hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="bg-[#121214] border-b border-[#2a2a2d]">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <TickerSwitcher className="shrink-0" />
          </div>
          <MarketInfo className="bg-transparent border-0 px-2 py-1" />
        </div>

        <div className="flex-1 overflow-auto bg-[#0d0d0f]">
          {activeTab === 'chart' && (
            <TradingChart className="h-[calc(100vh-240px)] min-h-[280px] bg-[#0d0d0f] border-0 rounded-none" />
          )}
          {activeTab === 'orderbook' && (
            <Orderbook className="h-full bg-[#0d0d0f] border-0 rounded-none" maxRows={20} />
          )}
          {activeTab === 'order' && (
            <OrderForm className="bg-[#0d0d0f] border-0 rounded-none" />
          )}
          {activeTab === 'positions' && (
            <OrdersPanel className="h-full bg-[#0d0d0f] border-0 rounded-none" />
          )}
        </div>

        <div className="flex items-center justify-around bg-[#121214] border-t border-[#2a2a2d] py-1.5 safe-area-bottom">
          <button
            onClick={() => setActiveTab('chart')}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors',
              activeTab === 'chart' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[9px]">Chart</span>
          </button>
          <button
            onClick={() => setActiveTab('orderbook')}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors',
              activeTab === 'orderbook' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[9px]">Book</span>
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors',
              activeTab === 'order' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[9px]">Trade</span>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors',
              activeTab === 'positions' ? 'text-[#ed7620]' : 'text-[#6b6b6b]'
            )}
          >
            <History className="w-4 h-4" />
            <span className="text-[9px]">Orders</span>
          </button>
        </div>
      </div>
    );
  }

  // Tablet Layout (768px - 1024px)
  if (isTablet) {
    return (
      <div className="flex flex-col h-screen bg-[#0d0d0f]" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="bg-[#121214] border-b border-[#2a2a2d] px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Image src="/logo.svg" alt="SorooshX" width={24} height={24} className="rounded" />
              <span className="font-bold text-white text-xs">SOROOSHX</span>
            </div>
            <TickerSwitcher />
            <MarketInfo className="flex-1 bg-transparent border-0 py-0 px-0" />
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden">
            <TradingChart className="flex-1 min-h-[280px] bg-[#0d0d0f] border-0 rounded-none border-r border-[#2a2a2d]" />
            <OrdersPanel className="h-[160px] bg-[#0d0d0f] border-0 rounded-none border-t border-[#2a2a2d]" />
          </main>

          <aside className="w-72 flex flex-col border-l border-[#2a2a2d]">
            <Orderbook className="flex-1 bg-[#0d0d0f] border-0 rounded-none border-b border-[#2a2a2d]" maxRows={12} />
            <OrderForm className="h-auto bg-[#0d0d0f] border-0 rounded-none overflow-auto flex-shrink-0" />
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

      {/* MAIN TRADING AREA: 3-Column Layout like Bitget */}
      <div className="flex-1 flex overflow-hidden bg-[#0d0d0f]">
        {/* LEFT COLUMN: Chart + Orders */}
        <main className={cn('flex-1 flex flex-col overflow-hidden min-w-0', isRTL && 'order-2')}>
          {/* TradingView Chart */}
          <div className="flex-1 overflow-hidden bg-[#0d0d0f]">
            <TradingChart className="w-full h-full bg-[#0d0d0f] border-0" />
          </div>

          {/* Orders & Positions Panel */}
          <div className="h-[180px] bg-[#121214] border-t border-[#2a2a2d] overflow-hidden">
            <OrdersPanel className="h-full bg-transparent border-0" />
          </div>
        </main>

        {/* MIDDLE COLUMN: Order Book + Trades */}
        <aside className={cn(
          'w-[240px] flex flex-col border-l border-[#2a2a2d]',
          isRTL && 'order-1 border-l-0 border-r'
        )}>
          <Orderbook 
            className="flex-1 bg-[#0d0d0f] border-0" 
            maxRows={18}
          />
        </aside>

        {/* RIGHT COLUMN: Order Form + Account Info */}
        <aside className={cn(
          'w-[280px] flex flex-col border-l border-[#2a2a2d]',
          isRTL && 'order-3 border-l-0 border-r'
        )}>
          {/* Order Form Section */}
          <div className="flex-1 overflow-auto bg-[#121214]">
            <OrderForm className="bg-transparent border-0" />
          </div>

          {/* Account Info Section */}
          <div className="h-[180px] bg-[#121214] border-t border-[#2a2a2d] overflow-hidden">
            <AccountInfoPanel className="h-full bg-transparent" />
          </div>
        </aside>
      </div>
    </div>
  );
}
