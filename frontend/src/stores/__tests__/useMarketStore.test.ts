import { renderHook, act } from '@testing-library/react';
import { useMarketStore } from '../useMarketStore';
import type { BinanceTicker } from '@/types';

describe('useMarketStore', () => {
  beforeEach(() => {
    useMarketStore.setState({
      currentSymbol: 'BTCUSDT',
      tickers: {},
      symbols: [],
      favorites: [],
      isLoading: false,
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMarketStore());
    expect(result.current.currentSymbol).toBe('BTCUSDT');
    expect(result.current.tickers).toEqual({});
    expect(result.current.favorites).toBeDefined();
  });

  it('should update current symbol', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.setCurrentSymbol('ETHUSDT');
    });

    expect(result.current.currentSymbol).toBe('ETHUSDT');
  });

  it('should update ticker data', () => {
    const { result } = renderHook(() => useMarketStore());
    const mockTicker: BinanceTicker = {
      s: 'BTCUSDT',
      c: '97500.00',
      p: '1500.00',
      P: '2.5',
      h: '98000.00',
      l: '96000.00',
      v: '50000',
      q: '4875000000',
    };
    
    act(() => {
      result.current.updateTicker('BTCUSDT', mockTicker);
    });

    expect(result.current.tickers['BTCUSDT']).toBeDefined();
  });

  it('should set full ticker', () => {
    const { result } = renderHook(() => useMarketStore());
    const mockTicker: BinanceTicker = {
      s: 'BTCUSDT',
      c: '97500.00',
      p: '1500.00',
      P: '2.5',
      h: '98000.00',
      l: '96000.00',
      v: '50000',
      q: '4875000000',
    };
    
    act(() => {
      result.current.setTicker('BTCUSDT', mockTicker);
    });

    expect(result.current.tickers['BTCUSDT']).toEqual(mockTicker);
  });

  it('should toggle favorite symbol', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.toggleFavorite('ETHUSDT');
    });

    expect(result.current.isFavorite('ETHUSDT')).toBe(true);
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should get current ticker', () => {
    const { result } = renderHook(() => useMarketStore());
    const mockTicker: BinanceTicker = {
      s: 'BTCUSDT',
      c: '97500.00',
      p: '1500.00',
      P: '2.5',
      h: '98000.00',
      l: '96000.00',
      v: '50000',
      q: '4875000000',
    };
    
    act(() => {
      result.current.setTicker('BTCUSDT', mockTicker);
    });

    const currentTicker = result.current.getCurrentTicker();
    expect(currentTicker?.s).toBe('BTCUSDT');
  });
});
