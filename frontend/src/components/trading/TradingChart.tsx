'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { useMarketStore } from '@/stores/useMarketStore';
import { useChartStore } from '@/stores/useChartStore';
import { binanceWS } from '@/services/websocket';
import { fetchKlines } from '@/services/api';
import type { KlineData } from '@/types';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBBands,
  calculateMACD,
  calculateStochastic,
  calculateATR,
} from '@/lib/indicators';
import { ChartLeftToolbar } from './ChartLeftToolbar';

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
  const {
    indicators,
    showVolume,
    showGrid,
    showCrosshair,
    alerts,
    triggerAlert,
  } = useChartStore();
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  
  const [timeframe, setTimeframe] = useState<TimeframeValue>('15m');
  const [isLoading, setIsLoading] = useState(true);
  const [klineData, setKlineData] = useState<KlineData[]>([]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#000000' },
        textColor: '#848e9c',
      },
      grid: {
        vertLines: { color: showGrid ? 'rgba(30, 35, 41, 0.6)' : 'transparent' },
        horzLines: { color: showGrid ? 'rgba(30, 35, 41, 0.6)' : 'transparent' },
      },
      crosshair: {
        mode: showCrosshair ? 1 : 0,
        vertLine: {
          width: 1,
          color: '#ed7620',
          style: 1,
        },
        horzLine: {
          width: 1,
          color: '#ed7620',
          style: 1,
        },
      },
      rightPriceScale: {
        borderColor: '#1e2329',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1e2329',
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
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
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
  }, [showGrid, showCrosshair]);

  // Fetch historical klines
  useEffect(() => {
    const loadKlines = async () => {
      setIsLoading(true);
      
      try {
        const interval = BINANCE_INTERVALS[timeframe];
        const data = await fetchKlines(currentSymbol, interval, 500);
        
        setKlineData(data);
        
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
            color: k.close >= k.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
          }));

          candlestickSeriesRef.current.setData(candlestickData);
          volumeSeriesRef.current.setData(showVolume ? volumeData : []);
          
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
  }, [currentSymbol, timeframe, showVolume]);

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
        color: isGreen ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
      });

      // Check price alerts
      const closePrice = parseFloat(kline.c);
      alerts.forEach((alert) => {
        if (!alert.triggered) {
          if (alert.condition === 'above' && closePrice >= alert.price) {
            triggerAlert(alert.id);
            // Show browser notification
            if (Notification.permission === 'granted') {
              new Notification(`Price Alert: ${currentSymbol}`, {
                body: `Price reached $${alert.price.toFixed(2)}!`,
              });
            }
          } else if (alert.condition === 'below' && closePrice <= alert.price) {
            triggerAlert(alert.id);
            if (Notification.permission === 'granted') {
              new Notification(`Price Alert: ${currentSymbol}`, {
                body: `Price reached $${alert.price.toFixed(2)}!`,
              });
            }
          }
        }
      });
    };

    binanceWS.subscribe(streamName, handleKlineUpdate);

    return () => {
      binanceWS.unsubscribe(streamName, handleKlineUpdate);
    };
  }, [currentSymbol, timeframe, alerts, triggerAlert]);

  // Render technical indicators
  useEffect(() => {
    if (!chartRef.current || klineData.length === 0) return;

    // Clean up old indicator series
    indicatorSeriesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    indicatorSeriesRef.current.clear();

    const closes = klineData.map((k) => k.close);
    const highs = klineData.map((k) => k.high);
    const lows = klineData.map((k) => k.low);
    const times = klineData.map((k) => ((k.time / 1000) as Time));

    // SMA
    if (indicators.sma?.enabled) {
      const smaValues = calculateSMA(closes, indicators.sma.value || 20);
      const smaSeries = chartRef.current.addLineSeries({
        color: '#ffd700',
        lineWidth: 1,
        priceScaleId: 'right',
      });
      
      const smaData = smaValues
        .map((value, idx) => ({
          time: times[idx],
          value: value,
        }))
        .filter((d) => !isNaN(d.value));
      
      smaSeries.setData(smaData);
      indicatorSeriesRef.current.set('sma', smaSeries);
    }

    // EMA
    if (indicators.ema?.enabled) {
      const emaValues = calculateEMA(closes, indicators.ema.value || 20);
      const emaSeries = chartRef.current.addLineSeries({
        color: '#00d4ff',
        lineWidth: 1,
        priceScaleId: 'right',
      });
      
      const emaData = emaValues
        .map((value, idx) => ({
          time: times[idx],
          value: value,
        }))
        .filter((d) => !isNaN(d.value));
      
      emaSeries.setData(emaData);
      indicatorSeriesRef.current.set('ema', emaSeries);
    }

    // Bollinger Bands
    if (indicators.bbands?.enabled) {
      const bbandsValues = calculateBBands(
        closes,
        indicators.bbands.period || 20,
        indicators.bbands.stdDevMultiplier || 2
      );
      
      const upperSeries = chartRef.current.addLineSeries({
        color: 'rgba(255, 107, 107, 0.5)',
        lineWidth: 1,
        priceScaleId: 'right',
      });
      
      const lowerSeries = chartRef.current.addLineSeries({
        color: 'rgba(107, 255, 107, 0.5)',
        lineWidth: 1,
        priceScaleId: 'right',
      });
      
      const middleSeries = chartRef.current.addLineSeries({
        color: 'rgba(255, 255, 255, 0.3)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'right',
      });

      const upperData = bbandsValues
        .map((d) => ({ time: d.time as Time, value: d.upper }))
        .filter((d) => !isNaN(d.value));
      
      const lowerData = bbandsValues
        .map((d) => ({ time: d.time as Time, value: d.lower }))
        .filter((d) => !isNaN(d.value));
      
      const middleData = bbandsValues
        .map((d) => ({ time: d.time as Time, value: d.middle }))
        .filter((d) => !isNaN(d.value));

      upperSeries.setData(upperData);
      lowerSeries.setData(lowerData);
      middleSeries.setData(middleData);
      
      indicatorSeriesRef.current.set('bbands-upper', upperSeries);
      indicatorSeriesRef.current.set('bbands-lower', lowerSeries);
      indicatorSeriesRef.current.set('bbands-middle', middleSeries);
    }

  }, [klineData, indicators]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeValue) => {
    setTimeframe(newTimeframe);
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-black overflow-hidden', className)}>
      {/* Timeframe Selector - Top Bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1e2329] overflow-x-auto bg-[#0a0e27]">
        {TIMEFRAMES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleTimeframeChange(value)}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap',
              timeframe === value
                ? 'bg-[#ed7620] text-white'
                : 'text-[#848e9c] hover:text-white hover:bg-[#1a1a1a]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Chart Area with Left Toolbar */}
      <div className="flex flex-1 min-h-0">
        {/* Left Toolbar */}
        <ChartLeftToolbar onIndicatorClick={() => {}} />

        {/* Chart Container */}
        <div className="relative flex-1 min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ed7620]" />
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
