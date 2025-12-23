'use client';

import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';

interface TradingViewWidgetProps {
  className?: string;
}

function TradingViewWidgetComponent({ className }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const { currentSymbol } = useMarketStore();

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
    }

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100% - 32px)';
    widgetDiv.style.width = '100%';
    widgetContainer.appendChild(widgetDiv);

    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright';
    copyright.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>`;
    copyright.style.cssText = 'font-size: 10px; line-height: 24px; text-align: center; color: #848e9c;';
    widgetContainer.appendChild(copyright);

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(widgetContainer);
    widgetRef.current = widgetContainer;

    // Load TradingView script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
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
    });

    widgetDiv.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [currentSymbol]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full', className)}
      style={{ minHeight: '300px' }}
    />
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
