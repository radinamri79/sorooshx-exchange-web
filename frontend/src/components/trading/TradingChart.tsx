'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { binanceWS } from '@/services/websocket';
import { fetchKlines } from '@/services/api';
import type { KlineData } from '@/types';

interface TradingChartProps {
  className?: string;
}

type TimeframeValue = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

const TIMEFRAMES: { value: TimeframeValue; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

// Convert timeframe to Binance interval
const BINANCE_INTERVALS: Record<TimeframeValue, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

export function TradingChart({ className }: TradingChartProps) {
  const { currentSymbol } = useMarketStore();
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  const [timeframe, setTimeframe] = useState<TimeframeValue>('15m');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#3B82F6',
          style: 1,
        },
        horzLine: {
          width: 1,
          color: '#3B82F6',
          style: 1,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Fetch historical klines
  useEffect(() => {
    const loadKlines = async () => {
      setIsLoading(true);
      
      try {
        const interval = BINANCE_INTERVALS[timeframe];
        const data = await fetchKlines(currentSymbol, interval, 500);
        
        if (candlestickSeriesRef.current && volumeSeriesRef.current) {
          // Format candlestick data
          const candlestickData: CandlestickData<Time>[] = data.map((k: KlineData) => ({
            time: (k.time / 1000) as Time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }));

          // Format volume data
          const volumeData: HistogramData<Time>[] = data.map((k: KlineData) => ({
            time: (k.time / 1000) as Time,
            value: k.volume,
            color: k.close >= k.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }));

          candlestickSeriesRef.current.setData(candlestickData);
          volumeSeriesRef.current.setData(volumeData);
          
          // Fit content
          chartRef.current?.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Failed to fetch klines:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadKlines();
  }, [currentSymbol, timeframe]);

  // Subscribe to kline WebSocket updates
  useEffect(() => {
    const interval = BINANCE_INTERVALS[timeframe];
    const streamName = `${currentSymbol.toLowerCase()}@kline_${interval}`;

    const handleKlineUpdate = (data: unknown) => {
      const klineMsg = data as {
        k: {
          t: number;
          o: string;
          h: string;
          l: string;
          c: string;
          v: string;
          x: boolean;
        };
      };
      if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

      const kline = klineMsg.k;
      const time = (kline.t / 1000) as Time;

      // Update candlestick
      candlestickSeriesRef.current.update({
        time,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
      });

      // Update volume
      const isGreen = parseFloat(kline.c) >= parseFloat(kline.o);
      volumeSeriesRef.current.update({
        time,
        value: parseFloat(kline.v),
        color: isGreen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    };

    binanceWS.subscribe(streamName, handleKlineUpdate);

    return () => {
      binanceWS.unsubscribe(streamName, handleKlineUpdate);
    };
  }, [currentSymbol, timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeValue) => {
    setTimeframe(newTimeframe);
  }, []);

  return (
    <div className={cn('flex flex-col bg-background-secondary rounded-lg border border-border overflow-hidden', className)}>
      {/* Timeframe Selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {TIMEFRAMES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleTimeframeChange(value)}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap',
              timeframe === value
                ? 'bg-brand-500 text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background-secondary/50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
