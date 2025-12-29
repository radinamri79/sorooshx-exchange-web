import { renderHook, act } from '@testing-library/react';
import { useOrderbookStore } from '../useOrderbookStore';

describe('useOrderbookStore', () => {
  beforeEach(() => {
    useOrderbookStore.setState({
      bids: [],
      asks: [],
      symbol: 'BTCUSDT',
      timestamp: 0,
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOrderbookStore());
    expect(result.current.bids).toEqual([]);
    expect(result.current.asks).toEqual([]);
    expect(result.current.symbol).toBe('BTCUSDT');
  });

  it('should update orderbook data', () => {
    const { result } = renderHook(() => useOrderbookStore());
    const mockBids = [['97400', '10'], ['97300', '20']];
    const mockAsks = [['97500', '15'], ['97600', '25']];
    
    act(() => {
      result.current.updateOrderbook(mockBids, mockAsks, 'BTCUSDT');
    });

    expect(result.current.bids).toEqual(mockBids);
    expect(result.current.asks).toEqual(mockAsks);
    expect(result.current.symbol).toBe('BTCUSDT');
  });

  it('should update timestamp', () => {
    const { result } = renderHook(() => useOrderbookStore());
    const now = Date.now();
    
    act(() => {
      result.current.updateOrderbook([], [], 'BTCUSDT', now);
    });

    expect(result.current.timestamp).toBe(now);
  });

  it('should handle empty orderbook', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.updateOrderbook([], [], 'ETHUSDT');
    });

    expect(result.current.bids).toEqual([]);
    expect(result.current.asks).toEqual([]);
  });

  it('should get spread', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.updateOrderbook(
        [['97400', '10']],
        [['97500', '15']],
        'BTCUSDT'
      );
    });

    const spread = result.current.getSpread();
    expect(spread).toBe(100); // 97500 - 97400
  });

  it('should get mid price', () => {
    const { result } = renderHook(() => useOrderbookStore());
    
    act(() => {
      result.current.updateOrderbook(
        [['97400', '10']],
        [['97500', '15']],
        'BTCUSDT'
      );
    });

    const midPrice = result.current.getMidPrice();
    expect(midPrice).toBe(97450); // (97400 + 97500) / 2
  });
});
