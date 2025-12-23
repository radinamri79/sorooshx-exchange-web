'use client';

import { useChartStore } from '@/stores/useChartStore';
import { cn } from '@/lib/utils';
import {
  PenTool,
  Minus,
  Square,
  Triangle,
  Circle,
  Type,
  Crosshair,
  Trash2,
  Settings,
  Copy,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, active = false, onClick }: ToolButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded transition-all duration-200',
          active
            ? 'bg-[#ed7620] text-white shadow-lg'
            : 'bg-[#1a1a2e] text-[#848e9c] hover:bg-[#0a0e27] hover:text-[#ed7620]'
        )}
        title={label}
      >
        {icon}
      </button>
      <div className="absolute left-12 bottom-0 hidden group-hover:block bg-[#0a0e27] text-[#848e9c] text-xs px-2 py-1 rounded whitespace-nowrap border border-[#1e2329] z-50">
        {label}
      </div>
    </div>
  );
}

interface ChartLeftToolbarProps {
  onIndicatorClick?: () => void;
}

export function ChartLeftToolbar({ onIndicatorClick }: ChartLeftToolbarProps) {
  const {
    drawingMode,
    setDrawingMode,
    indicators,
    showVolume,
    setShowVolume,
    showGrid,
    setShowGrid,
  } = useChartStore();

  const activeIndicatorCount = Object.values(indicators).filter((ind) => ind?.enabled).length;

  return (
    <div className="flex flex-col items-center gap-2 w-14 px-2 py-4 bg-[#0a0e27] border-r border-[#1e2329] overflow-y-auto">
      {/* Drawing Tools Section */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <ToolButton
          icon={<PenTool size={18} />}
          label="Pen"
          active={drawingMode === 'line'}
          onClick={() => setDrawingMode(drawingMode === 'line' ? null : 'line')}
        />
      </div>

      {/* Geometric Shapes */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <ToolButton
          icon={<Minus size={18} />}
          label="Trend Line"
          active={drawingMode === 'trendline'}
          onClick={() => setDrawingMode(drawingMode === 'trendline' ? null : 'trendline')}
        />
        <ToolButton
          icon={<Square size={18} />}
          label="Rectangle"
          active={drawingMode === 'rectangle'}
          onClick={() => setDrawingMode(drawingMode === 'rectangle' ? null : 'rectangle')}
        />
        <ToolButton
          icon={<Triangle size={18} />}
          label="Triangle"
          active={drawingMode === 'triangle'}
          onClick={() => setDrawingMode(drawingMode === 'triangle' ? null : 'triangle')}
        />
        <ToolButton
          icon={<Circle size={18} />}
          label="Circle"
          active={drawingMode === 'circle'}
          onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
        />
      </div>

      {/* Measurement Tools */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <ToolButton
          icon={<Crosshair size={18} />}
          label="Measure"
          active={drawingMode === 'measure'}
          onClick={() => setDrawingMode(drawingMode === 'measure' ? null : 'measure')}
        />
        <ToolButton
          icon={<Type size={18} />}
          label="Text"
          active={drawingMode === 'text'}
          onClick={() => setDrawingMode(drawingMode === 'text' ? null : 'text')}
        />
      </div>

      {/* Drawing Management */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <ToolButton
          icon={<Copy size={18} />}
          label="Clone Drawing"
          onClick={() => {}}
        />
        <ToolButton
          icon={<Trash2 size={18} />}
          label="Delete All"
          onClick={() => {}}
        />
      </div>

      {/* Display Options */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <ToolButton
          icon={showGrid ? <Eye size={18} /> : <EyeOff size={18} />}
          label={showGrid ? 'Hide Grid' : 'Show Grid'}
          active={showGrid}
          onClick={() => setShowGrid(!showGrid)}
        />
        <ToolButton
          icon={showVolume ? <Eye size={18} /> : <EyeOff size={18} />}
          label={showVolume ? 'Hide Volume' : 'Show Volume'}
          active={showVolume}
          onClick={() => setShowVolume(!showVolume)}
        />
      </div>

      {/* Indicators */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <div className="relative group">
          <button
            onClick={onIndicatorClick}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded transition-all duration-200 text-xs font-bold',
              activeIndicatorCount > 0
                ? 'bg-[#ed7620] text-white shadow-lg'
                : 'bg-[#1a1a2e] text-[#848e9c] hover:bg-[#0a0e27] hover:text-[#ed7620]'
            )}
            title={`Indicators (${activeIndicatorCount})`}
          >
            ∑
          </button>
          <div className="absolute left-12 bottom-0 hidden group-hover:block bg-[#0a0e27] text-[#848e9c] text-xs px-2 py-1 rounded whitespace-nowrap border border-[#1e2329] z-50">
            Indicators {activeIndicatorCount > 0 && `(${activeIndicatorCount})`}
          </div>
        </div>
      </div>

      {/* Utility Tools */}
      <div className="space-y-1 pb-3 border-b border-[#1e2329]">
        <ToolButton
          icon={<RotateCcw size={18} />}
          label="Reset Chart"
          onClick={() => {}}
        />
        <ToolButton
          icon={<Download size={18} />}
          label="Screenshot"
          onClick={() => {}}
        />
      </div>

      {/* Settings */}
      <div className="space-y-1">
        <ToolButton
          icon={<Settings size={18} />}
          label="Settings"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
