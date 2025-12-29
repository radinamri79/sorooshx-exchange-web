import { renderHook, act } from '@testing-library/react';
import { useChartStore } from '../useChartStore';

describe('useChartStore', () => {
  beforeEach(() => {
    useChartStore.setState({
      symbol: 'BTCUSDT',
      interval: '1h',
      indicatorType: 'RSI',
      enabledIndicators: [],
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChartStore());
    expect(result.current.symbol).toBeDefined();
    expect(result.current.interval).toBeDefined();
  });

  it('should update symbol', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setSymbol('ETHUSDT');
    });

    expect(result.current.symbol).toBe('ETHUSDT');
  });

  it('should update interval', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setInterval('4h');
    });

    expect(result.current.interval).toBe('4h');
  });

  it('should add enabled indicator', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.addEnabledIndicator('RSI');
    });

    expect(result.current.enabledIndicators).toContain('RSI');
  });

  it('should remove enabled indicator', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.addEnabledIndicator('RSI');
      result.current.addEnabledIndicator('MACD');
    });

    act(() => {
      result.current.removeEnabledIndicator('RSI');
    });

    expect(result.current.enabledIndicators).not.toContain('RSI');
    expect(result.current.enabledIndicators).toContain('MACD');
  });

  it('should toggle indicator type', () => {
    const { result } = renderHook(() => useChartStore());
    
    act(() => {
      result.current.setIndicatorType('MACD');
    });

    expect(result.current.indicatorType).toBe('MACD');
  });
});
