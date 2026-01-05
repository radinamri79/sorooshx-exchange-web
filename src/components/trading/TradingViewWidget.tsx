'use client';

import { useEffect, useRef, memo, useState } from 'react';
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
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const containerMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const scriptLoadedRef = useRef(false);
  const { currentSymbol } = useMarketStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Effect to load TradingView script
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    const loadTradingViewScript = () => {
      if (document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')) {
        scriptLoadedRef.current = true;
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
      };
      script.onerror = () => {
        if (isMountedRef.current) {
          setError('Failed to load TradingView library');
          setIsLoading(false);
        }
      };
      document.head.appendChild(script);
    };

    loadTradingViewScript();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effect to create/update the widget
  useEffect(() => {
    isMountedRef.current = true;

    if (!mainContainerRef.current || !scriptLoadedRef.current) return;

    // Symbol format for TradingView (Binance perpetual futures)
    const tvSymbol = `BINANCE:${currentSymbol.replace('USDT', '')}USDT.P`;
    const containerId = `tradingview-${currentSymbol}`;

    const initializeWidget = () => {
      if (!isMountedRef.current || !window.TradingView) return;

      // Get or create the container for this symbol
      let container = containerMapRef.current.get(currentSymbol);
      
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = 'width: 100%; height: 100%;';
        mainContainerRef.current?.appendChild(container);
        containerMapRef.current.set(currentSymbol, container);
      }

      // Show this container, hide others
      containerMapRef.current.forEach((cont, symbol) => {
        if (symbol === currentSymbol) {
          cont.style.display = 'block';
        } else {
          cont.style.display = 'none';
        }
      });

      try {
        // Create the widget - TradingView will append to the container
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
          setError(null);
        }
      } catch (err) {
        console.error('TradingView widget error:', err);
        if (isMountedRef.current) {
          // If widget already exists, just show it
          if (container && container.children.length > 0) {
            setIsLoading(false);
            setError(null);
          } else {
            setError('Failed to load chart');
            setIsLoading(false);
          }
        }
      }
    };

    // Wait for TradingView to be available
    if (window.TradingView) {
      setIsLoading(true);
      const timeoutId = setTimeout(initializeWidget, 150);
      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // If TradingView is not loaded yet, wait
      const checkInterval = setInterval(() => {
        if (window.TradingView && isMountedRef.current) {
          clearInterval(checkInterval);
          setIsLoading(true);
          setTimeout(initializeWidget, 150);
        }
      }, 100);

      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [currentSymbol]);

  return (
    <div 
      ref={mainContainerRef}
      className={cn('relative w-full h-full', className)}
      style={{ minHeight: '400px' }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#ffb496] border-t-transparent rounded-full animate-spin" />
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
              className="px-3 py-1.5 text-xs bg-[#ffb496] text-black rounded hover:bg-[#ffc4b0] transition-colors"
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
