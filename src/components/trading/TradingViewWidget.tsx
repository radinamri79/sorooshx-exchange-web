'use client';

import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';

interface TradingViewWidgetProps {
  className?: string;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

function TradingViewWidgetComponent({ className }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string>(`tradingview_${Math.random().toString(36).substring(7)}`);
  const { currentSymbol } = useMarketStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const cleanupWidget = useCallback(() => {
    if (widgetContainerRef.current && containerRef.current) {
      try {
        if (containerRef.current.contains(widgetContainerRef.current)) {
          containerRef.current.removeChild(widgetContainerRef.current);
        }
      } catch {
        // Ignore cleanup errors
      }
      widgetContainerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Clean up previous widget
    cleanupWidget();

    // Generate new unique ID for this instance
    widgetIdRef.current = `tradingview_${Math.random().toString(36).substring(7)}`;
    const containerId = widgetIdRef.current;
    
    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.id = containerId;
    widgetContainer.style.cssText = 'height: 100%; width: 100%;';
    containerRef.current.appendChild(widgetContainer);
    widgetContainerRef.current = widgetContainer;

    // Symbol format for TradingView (Binance perpetual futures)
    const tvSymbol = `BINANCE:${currentSymbol.replace('USDT', '')}USDT.P`;

    // Load TradingView library script if not already loaded
    const loadWidget = () => {
      if (!isMountedRef.current) return;
      
      if (typeof window !== 'undefined' && window.TradingView) {
        try {
          new window.TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: '15',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#0d0d0f',
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: containerId,
            hide_side_toolbar: false,
            withdateranges: true,
            hide_volume: false,
            studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
            backgroundColor: '#0d0d0f',
            gridColor: 'rgba(42, 42, 45, 0.6)',
            overrides: {
              'paneProperties.background': '#0d0d0f',
              'paneProperties.backgroundType': 'solid',
              'scalesProperties.backgroundColor': '#0d0d0f',
            },
          });
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        } catch (err) {
          console.error('TradingView widget error:', err);
          if (isMountedRef.current) {
            setError('Failed to load chart');
            setIsLoading(false);
          }
        }
      }
    };

    // Check if TradingView is already loaded
    if (window.TradingView) {
      loadWidget();
    } else {
      // Load the TradingView library
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existingScript) {
        // Script exists, wait for it to load
        existingScript.addEventListener('load', loadWidget);
      } else {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = loadWidget;
        script.onerror = () => {
          if (isMountedRef.current) {
            setError('Failed to load TradingView library');
            setIsLoading(false);
          }
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      isMountedRef.current = false;
      cleanupWidget();
    };
  }, [currentSymbol, cleanupWidget]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full', className)}
      style={{ minHeight: '400px' }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#ed7620] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#6b6b6b]">Loading chart...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f] z-10">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <span className="text-sm text-[#ef5350]">{error}</span>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs bg-[#ed7620] text-white rounded hover:bg-[#ff8c3a] transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
