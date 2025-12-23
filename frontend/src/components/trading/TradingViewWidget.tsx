'use client';

import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';

interface TradingViewWidgetProps {
  className?: string;
}

function TradingViewWidgetComponent({ className }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const { currentSymbol } = useMarketStore();

  useEffect(() => {
    if (!containerRef.current) return;

    // Remove any existing script and content
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    containerRef.current.innerHTML = '';

    // Create the widget container structure that TradingView expects
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.cssText = 'height: 100%; width: 100%;';

    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.style.cssText = 'height: calc(100% - 32px); width: 100%;';
    widgetContainer.appendChild(widgetInner);

    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright';
    copyright.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';
    copyright.style.cssText = 'font-size: 10px; line-height: 32px; text-align: center; color: #6b6b6b;';
    widgetContainer.appendChild(copyright);

    containerRef.current.appendChild(widgetContainer);

    // Create and append the script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // TradingView widget configuration
    const config = {
      autosize: true,
      symbol: `BINANCE:${currentSymbol}`,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: 'rgba(13, 13, 15, 1)',
      gridColor: 'rgba(42, 42, 45, 0.6)',
      hide_volume: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      studies: ['RSI@tv-basicstudies'],
    };
    
    script.textContent = JSON.stringify(config);
    scriptRef.current = script;
    widgetInner.appendChild(script);

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [currentSymbol]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full min-h-[400px]', className)}
    />
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
