'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Globe, Download, MoreHorizontal, User } from 'lucide-react';

interface TradingPageClientProps {
  locale: string;
}

export function TradingPageClient({ locale }: TradingPageClientProps) {
  const t = useTranslations('nav');
  const isRTL = locale === 'fa';
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'orderbook' | 'order' | 'positions'>('chart');

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Connect WebSocket on mount
  useEffect(() => {
    binanceWS.connect();
    return () => binanceWS.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background-primary" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between px-4 h-14 border-b border-border bg-background-secondary">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-text-primary text-lg hidden sm:block">SOROOSHX</span>
          </div>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {t('home')}
            </a>
            <a href="#" className="text-sm text-text-primary font-medium border-b-2 border-brand-500 pb-1">
              {t('trade')}
            </a>
            <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {t('ideas')}
            </a>
            <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {t('support')}
            </a>
            <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {t('downloads')}
            </a>
            <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {t('more')}
            </a>
          </div>
        </div>
        
        {/* Right: User Actions */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
            <Globe className="w-5 h-5" />
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-tertiary hover:bg-border transition-colors">
            <User className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-primary hidden sm:block">{t('account')}</span>
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary transition-colors md:hidden">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Market Info Bar */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-border bg-background-primary">
        <TickerSwitcher />
        <MarketInfo className="flex-1 border-0 bg-transparent py-0" />
      </header>

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'chart' && <TradingChart className="h-full min-h-[400px] border-0 rounded-none" />}
            {activeTab === 'orderbook' && <Orderbook className="h-full border-0 rounded-none" />}
            {activeTab === 'order' && <OrderForm className="border-0 rounded-none" />}
            {activeTab === 'positions' && <OrdersPanel className="h-full border-0 rounded-none" />}
          </div>
          
          {/* Mobile Tab Bar */}
          <div className="flex items-center justify-around border-t border-border bg-background-secondary py-2">
            <button
              onClick={() => setActiveTab('chart')}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                activeTab === 'chart' ? 'text-brand-500' : 'text-text-secondary'
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M8 17l4-8 4 4 5-6" />
              </svg>
              <span className="text-xs">Chart</span>
            </button>
            <button
              onClick={() => setActiveTab('orderbook')}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                activeTab === 'orderbook' ? 'text-brand-500' : 'text-text-secondary'
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 12h18" />
                <path d="M12 3v18" />
              </svg>
              <span className="text-xs">Book</span>
            </button>
            <button
              onClick={() => setActiveTab('order')}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                activeTab === 'order' ? 'text-brand-500' : 'text-text-secondary'
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
              <span className="text-xs">Trade</span>
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                activeTab === 'positions' ? 'text-brand-500' : 'text-text-secondary'
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18" />
                <path d="M8 4v6" />
              </svg>
              <span className="text-xs">Positions</span>
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Layout - Matching SorooshX screenshot layout */
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chart Area */}
          <main className={cn('flex-1 flex flex-col overflow-hidden', isRTL && 'order-2')}>
            {/* Zone 4: Trading Chart */}
            <TradingChart className="flex-1 min-h-[400px] border-0 rounded-none" />
            
            {/* Zone 5: Orders Panel */}
            <OrdersPanel className="h-[220px] border-0 rounded-none border-t border-border" />
          </main>

          {/* Right Panel: Orderbook + Order Form */}
          <aside
            className={cn(
              'w-[600px] xl:w-[680px] flex border-l border-border bg-background-primary',
              isRTL && 'order-1 border-l-0 border-r'
            )}
          >
            {/* Zone 2: Orderbook */}
            <div className="w-[280px] xl:w-[320px] flex flex-col border-r border-border">
              <Orderbook className="flex-1 border-0 rounded-none" maxRows={20} />
            </div>
            
            {/* Zone 1: Order Form */}
            <div className="flex-1 flex flex-col">
              <OrderForm className="flex-none border-0 rounded-none" />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
