'use client';

import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';

interface TradingViewWidgetProps {
  className?: string;
}

// Convert our symbol format to TradingView format
function formatSymbolForTradingView(symbol: string): string {
  // Remove USDT suffix and format for TradingView
  // Example: BTCUSDT -> BINANCE:BTCUSDT
  return `BINANCE:${symbol}`;
}

function TradingViewWidgetComponent({ className }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentSymbol } = useMarketStore();
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    const container = containerRef.current;
    container.innerHTML = '';

    // Create widget container structure
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    widgetContainer.appendChild(widgetDiv);

    // Create and configure the script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // TradingView widget configuration - Bitget-style professional chart
    const config = {
      // Symbol Settings
      symbol: formatSymbolForTradingView(currentSymbol),
      interval: '15',
      
      // Theme - Dark mode matching Bitget
      theme: 'dark',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(30, 35, 41, 0.6)',
      
      // Size
      autosize: true,
      
      // Toolbar Configuration - Show ALL tools like Bitget
      hide_top_toolbar: false,
      hide_side_toolbar: false,  // IMPORTANT: Show left toolbar with drawing tools!
      hide_legend: false,
      hide_volume: false,
      
      // Features
      allow_symbol_change: true,
      save_image: true,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      
      // Style - Candlestick
      style: '1',
      
      // Locale & Timezone
      locale: 'en',
      timezone: 'Etc/UTC',
      
      // Default Studies/Indicators (like Bitget's EMA lines)
      studies: [
        'STD;EMA',
        'STD;EMA',
        'STD;EMA',
        'STD;EMA',
      ],
      
      // Enable additional features
      support_host: 'https://www.tradingview.com',
      
      // Compare symbols (empty by default)
      compareSymbols: [],
      
      // Watchlist (empty by default)
      watchlist: [],
      
      // Overrides for styling
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
        'mainSeriesProperties.candleStyle.downColor': '#ef5350',
        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
        'paneProperties.background': '#000000',
        'paneProperties.backgroundType': 'solid',
      },
    };
    
    script.innerHTML = JSON.stringify(config);
    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);
    scriptRef.current = script;

    return () => {
      if (container) {
        container.innerHTML = '';
      }
      scriptRef.current = null;
    };
  }, [currentSymbol]);

  return (
    <div 
      className={cn('relative w-full h-full min-h-[400px]', className)} 
      ref={containerRef}
    />
  );
}

// Memoize to prevent unnecessary re-renders
export const TradingViewWidget = memo(TradingViewWidgetComponent);
