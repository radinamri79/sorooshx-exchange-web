import { renderHook, act } from '@testing-library/react';
import { useOrderbookStore } from '../useOrderbookStore';

describe('useOrderbookStore', () => {
  beforeEach(() => {
    useOrderbookStore.setState({
      bids: [],
      asks: [],
      lastUpdateId: 0,
      symbol: 'BTCUSDT',
      precision: 2,
      levels: 20,
      isConnected: false,
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOrderbookStore());
    expect(result.current.bids).toEqual([]);
    expect(result.current.asks).toEqual([]);
    expect(result.current.symbol).toBe('BTCUSDT');
  });

  it('should set orderbook snapshot', () => {
    const { result } = renderHook(() => useOrderbookStore());
    const mockBids: [string, string][] = [['97400', '10'], ['97300', '20']];
    const mockAsks: [string, string][] = [['97500', '15'], ['97600', '25']];
    
    act(() => {
      result.current.setSnapshot({
        bids: mockBids,
        asks: mockAsks,
        lastUpdateId: 123456,
        symbol: 'BTCUSDT',
      });
    });

    expect(result.current.bids).toEqual(mockBids);
    expect(result.current.asks).toEqual(mockAsks);
  });

  it('should update orderbook with merge', () => {
    const { result } = renderHook(() => useOrderbookStore());
    const mockBids: [string, string][] = [['97400', '10']];
    const mockAsks: [string, string][] = [['97500', '15']];
    
    act(() => {
      result.current.updateOrderbook({
        bids: mockBids,
        asks: mockAsks,
        firstUpdateId: 0,
        lastUpdateId: 123456,
      });
    });

    expect(result.current.lastUpdateId).toBe(123456);
  });

  it('should merge orderbook data', () => {
    const { result } = renderHook(() => useOrderbookStore());
    const mockBids: [string, string][] = [['97400', '10']];
    const mockAsks: [string, string][] = [['97500', '15']];
    
    act(() => {
      result.current.mergeOrderbook(mockBids, mockAsks, 123456);
    });

    expect(result.current.lastUpdateId).toBe(123456);
  });

  it('should clear orderbook', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.setSnapshot({
        bids: [['97400', '10']],
        asks: [['97500', '15']],
        lastUpdateId: 123456,
      });
      result.current.clearOrderbook();
    });

    expect(result.current.bids).toEqual([]);
    expect(result.current.asks).toEqual([]);
  });

  it('should set precision', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.setPrecision(4);
    });

    expect(result.current.precision).toBe(4);
  });

  it('should set levels', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.setLevels(50);
    });

    expect(result.current.levels).toBe(50);
  });

  it('should set connected status', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.setConnected(true);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should get spread', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.setSnapshot({
        bids: [['97400', '10']],
        asks: [['97500', '15']],
        lastUpdateId: 123456,
      });
    });

    const spread = result.current.getSpread();
    expect(spread).toBeGreaterThan(0);
  });

  it('should compute mid price', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.setSnapshot({
        bids: [['97400', '10']],
        asks: [['97500', '15']],
        lastUpdateId: 123456,
      });
    });

    expect(result.current.bids.length).toBeGreaterThan(0);
    expect(result.current.asks.length).toBeGreaterThan(0);
  });
});
