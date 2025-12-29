import { renderHook, act } from '@testing-library/react';
import { useMarketStore } from '../useMarketStore';

describe('useMarketStore', () => {
  beforeEach(() => {
    useMarketStore.setState({
      selectedSymbol: 'BTCUSDT',
      tickers: {},
      orderbook: null,
      trades: [],
      isLoadingTickers: false,
      isLoadingOrderbook: false,
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMarketStore());
    expect(result.current.selectedSymbol).toBe('BTCUSDT');
    expect(result.current.tickers).toEqual({});
    expect(result.current.trades).toEqual([]);
  });

  it('should update selected symbol', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.setSelectedSymbol('ETHUSDT');
    });

    expect(result.current.selectedSymbol).toBe('ETHUSDT');
  });

  it('should update ticker data', () => {
    const { result } = renderHook(() => useMarketStore());
    const mockTicker = {
      symbol: 'BTCUSDT',
      lastPrice: '97500.00',
      priceChangePercent: '2.5',
      volume: '50000',
    };
    
    act(() => {
      result.current.updateTicker('BTCUSDT', mockTicker);
    });

    expect(result.current.tickers['BTCUSDT']).toEqual(mockTicker);
  });

  it('should update orderbook', () => {
    const { result } = renderHook(() => useMarketStore());
    const mockOrderbook = {
      bids: [['97400', '10']],
      asks: [['97500', '10']],
    };
    
    act(() => {
      result.current.setOrderbook(mockOrderbook);
    });

    expect(result.current.orderbook).toEqual(mockOrderbook);
  });

  it('should add trade', () => {
    const { result } = renderHook(() => useMarketStore());
    const mockTrade = {
      id: '1',
      symbol: 'BTCUSDT',
      price: '97500',
      quantity: '1.5',
      side: 'BUY',
      timestamp: Date.now(),
    };
    
    act(() => {
      result.current.addTrade(mockTrade);
    });

    expect(result.current.trades).toContain(mockTrade);
  });

  it('should set loading states', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.setLoadingTickers(true);
      result.current.setLoadingOrderbook(true);
    });

    expect(result.current.isLoadingTickers).toBe(true);
    expect(result.current.isLoadingOrderbook).toBe(true);
  });
});
