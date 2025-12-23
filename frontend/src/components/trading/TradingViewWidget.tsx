'use client';

import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';

interface TradingViewWidgetProps {
  className?: string;
}

// Convert our symbol format to TradingView format
function formatSymbolForTradingView(symbol: string): string {
  // Example: BTCUSDT -> BINANCE:BTCUSDT
  return `BINANCE:${symbol}`;
}

function TradingViewWidgetComponent({ className }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentSymbol } = useMarketStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Set the symbol for display
    const formattedSymbol = formatSymbolForTradingView(currentSymbol);
    
    // Clear and build HTML structure
    container.innerHTML = `
      <div class="tradingview-widget-container" style="height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div class="tradingview-widget-container__widget" style="height: 100%; width: 100%; position: relative;"></div>
        <div class="tradingview-widget-copyright" style="font-size: 13px; line-height: 20px; color: rgba(132, 142, 156, 0.8); margin-bottom: 8px;">
          <a href="https://www.tradingview.com/symbols/${formattedSymbol}/" rel="noopener nofollow" target="_blank" style="color: #23a897; text-decoration: none;">
            <span>${currentSymbol}</span>
          </a> by TradingView
        </div>
      </div>
    `;

    // Load the TradingView script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    
    // Configuration for the widget
    const widgetConfig = {
      symbol: formattedSymbol,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(30, 35, 41, 0.6)',
      autosize: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      allow_symbol_change: true,
      save_image: true,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      compareSymbols: [],
      watchlist: [],
      studies: [],
    };

    script.textContent = JSON.stringify(widgetConfig);
    container.appendChild(script);

    return () => {
      // Cleanup handled by React
    };
  }, [currentSymbol]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full bg-black', className)}
      style={{ 
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
      }}
    />
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
