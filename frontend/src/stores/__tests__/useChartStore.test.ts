import { renderHook, act } from '@testing-library/react';
import { useChartStore } from '../useChartStore';

describe('useChartStore', () => {
  beforeEach(() => {
    useChartStore.setState({
      chartType: 'candlestick',
      showVolume: true,
      showGrid: true,
      showCrosshair: true,
      indicators: {},
      alerts: [],
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChartStore());
    expect(result.current.chartType).toBeDefined();
    expect(result.current.indicators).toBeDefined();
  });

  it('should update chart type', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setChartType('line');
    });

    expect(result.current.chartType).toBe('line');
  });

  it('should toggle volume', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setShowVolume(!result.current.showVolume);
    });

    expect(result.current.showVolume).toBe(false);
  });

  it('should toggle grid', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setShowGrid(!result.current.showGrid);
    });

    expect(result.current.showGrid).toBe(false);
  });

  it('should toggle crosshair', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setShowCrosshair(!result.current.showCrosshair);
    });

    expect(result.current.showCrosshair).toBe(false);
  });

  it('should toggle indicator', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.toggleIndicator('rsi');
    });

    expect(result.current.indicators.rsi).toBeDefined();
  });

  it('should update indicator settings', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.updateIndicatorSettings('rsi', { period: 20 });
    });

    expect(result.current.indicators.rsi).toBeDefined();
  });

  it('should add price alert', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.addAlert(95000, 'above');
    });

    expect(result.current.alerts.length).toBeGreaterThan(0);
  });

  it('should set drawing mode', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setDrawingMode('line');
    });

    expect(result.current.drawingMode).toBe('line');
  });
});
