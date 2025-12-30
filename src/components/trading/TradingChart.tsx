'use client';

import { cn } from '@/lib/utils';
import { TradingViewWidget } from './TradingViewWidget';

interface TradingChartProps {
  className?: string;
}

export function TradingChart({ className }: TradingChartProps) {
  return (
    <div className={cn('flex flex-col bg-black overflow-hidden h-full', className)}>
      {/* TradingView Official Widget - Full Professional Chart */}
      <TradingViewWidget className="flex-1" />
    </div>
  );
}
