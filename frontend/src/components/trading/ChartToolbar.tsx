'use client';

import { useState } from 'react';
import { useChartStore } from '@/stores/useChartStore';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Settings,
  AlertCircle,
  PenTool,
  Square,
  Type,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ChartToolbarProps {
  className?: string;
  onSettingsClick?: () => void;
  onAlertsClick?: () => void;
}

export function ChartToolbar({ className, onSettingsClick, onAlertsClick }: ChartToolbarProps) {
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const {
    chartType,
    setChartType,
    drawingMode,
    setDrawingMode,
    indicators,
    toggleIndicator,
    alerts,
  } = useChartStore();

  const activeIndicatorCount = Object.values(indicators)
    .filter((ind) => ind && 'enabled' in ind && ind.enabled)
    .length;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 border-b border-[#1e2329] bg-black',
        className
      )}
    >
      {/* Left Section: Chart Type Selector */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-[#0a0e27] border-[#1e2329] text-[#848e9c] hover:text-white hover:bg-[#1a1a2e]"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0a0e27] border-[#1e2329]">
            <DropdownMenuCheckboxItem
              checked={chartType === 'candlestick'}
              onCheckedChange={() => setChartType('candlestick')}
              className="text-[#848e9c] hover:text-white"
            >
              Candlestick
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={chartType === 'line'}
              onCheckedChange={() => setChartType('line')}
              className="text-[#848e9c] hover:text-white"
            >
              Line
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={chartType === 'bar'}
              onCheckedChange={() => setChartType('bar')}
              className="text-[#848e9c] hover:text-white"
            >
              Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={chartType === 'heikin-ashi'}
              onCheckedChange={() => setChartType('heikin-ashi')}
              className="text-[#848e9c] hover:text-white"
            >
              Heikin-Ashi
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Middle Section: Drawing Tools & Indicators */}
      <div className="flex items-center gap-1">
        {/* Drawing Tools */}
        <DropdownMenu open={showDrawingTools} onOpenChange={setShowDrawingTools}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-[#0a0e27] border-[#1e2329] text-[#848e9c] hover:text-white hover:bg-[#1a1a2e]"
            >
              <PenTool className="w-3 h-3 mr-1" />
              Draw
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0a0e27] border-[#1e2329]">
            <DropdownMenuCheckboxItem
              checked={drawingMode === 'line'}
              onCheckedChange={() => setDrawingMode(drawingMode === 'line' ? null : 'line')}
              className="text-[#848e9c] hover:text-white"
            >
              <TrendingUp className="w-3 h-3 mr-2" />
              Trend Line
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={drawingMode === 'rectangle'}
              onCheckedChange={() =>
                setDrawingMode(drawingMode === 'rectangle' ? null : 'rectangle')
              }
              className="text-[#848e9c] hover:text-white"
            >
              <Square className="w-3 h-3 mr-2" />
              Rectangle
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={drawingMode === 'fibonacci'}
              onCheckedChange={() =>
                setDrawingMode(drawingMode === 'fibonacci' ? null : 'fibonacci')
              }
              className="text-[#848e9c] hover:text-white"
            >
              Fibonacci
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={drawingMode === 'text'}
              onCheckedChange={() => setDrawingMode(drawingMode === 'text' ? null : 'text')}
              className="text-[#848e9c] hover:text-white"
            >
              <Type className="w-3 h-3 mr-2" />
              Text Label
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Indicators */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'text-xs bg-[#0a0e27] border-[#1e2329] text-[#848e9c] hover:text-white hover:bg-[#1a1a2e]',
                activeIndicatorCount > 0 && 'border-[#ed7620] text-[#ed7620]'
              )}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Indicators {activeIndicatorCount > 0 && `(${activeIndicatorCount})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0a0e27] border-[#1e2329] w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-[#848e9c]">
              Moving Averages
            </div>
            <DropdownMenuCheckboxItem
              checked={indicators.sma?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('sma')}
              className="text-[#848e9c] hover:text-white"
            >
              Simple Moving Average (SMA)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={indicators.ema?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('ema')}
              className="text-[#848e9c] hover:text-white"
            >
              Exponential Moving Average (EMA)
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator className="bg-[#1e2329]" />

            <div className="px-2 py-1.5 text-xs font-semibold text-[#848e9c]">
              Oscillators
            </div>
            <DropdownMenuCheckboxItem
              checked={indicators.rsi?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('rsi')}
              className="text-[#848e9c] hover:text-white"
            >
              Relative Strength Index (RSI)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={indicators.stochastic?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('stochastic')}
              className="text-[#848e9c] hover:text-white"
            >
              Stochastic Oscillator
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator className="bg-[#1e2329]" />

            <div className="px-2 py-1.5 text-xs font-semibold text-[#848e9c]">
              Trends & Volatility
            </div>
            <DropdownMenuCheckboxItem
              checked={indicators.macd?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('macd')}
              className="text-[#848e9c] hover:text-white"
            >
              MACD
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={indicators.bbands?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('bbands')}
              className="text-[#848e9c] hover:text-white"
            >
              Bollinger Bands
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={indicators.atr?.enabled ?? false}
              onCheckedChange={() => toggleIndicator('atr')}
              className="text-[#848e9c] hover:text-white"
            >
              Average True Range (ATR)
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Section: Settings & Alerts */}
      <div className="flex items-center gap-1">
        {/* Price Alerts Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAlertsClick}
          className={cn(
            'text-xs bg-[#0a0e27] border-[#1e2329] text-[#848e9c] hover:text-white hover:bg-[#1a1a2e]',
            alerts.length > 0 && 'border-[#ed7620] text-[#ed7620]'
          )}
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Alerts {alerts.length > 0 && `(${alerts.length})`}
        </Button>

        {/* Settings Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
          className="text-xs bg-[#0a0e27] border-[#1e2329] text-[#848e9c] hover:text-white hover:bg-[#1a1a2e]"
        >
          <Settings className="w-3 h-3 mr-1" />
          Settings
        </Button>

        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          className="text-xs bg-[#0a0e27] border-[#1e2329] text-[#848e9c] hover:text-white hover:bg-[#1a1a2e]"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
