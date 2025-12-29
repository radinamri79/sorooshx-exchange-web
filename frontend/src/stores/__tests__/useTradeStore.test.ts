import { renderHook, act } from '@testing-library/react';
import { useTradeStore } from '../useTradeStore';

describe('useTradeStore', () => {
  beforeEach(() => {
    useTradeStore.setState({
      orders: [],
      positions: [],
      accountBalance: '0',
      selectedOrderId: null,
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.orders).toEqual([]);
    expect(result.current.positions).toEqual([]);
    expect(result.current.accountBalance).toBe('0');
  });

  it('should create new order', () => {
    const { result } = renderHook(() => useTradeStore());
    const mockOrder = {
      id: '1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      price: '97500',
      quantity: '1.5',
      status: 'NEW',
      timestamp: Date.now(),
    };
    
    act(() => {
      result.current.addOrder(mockOrder);
    });

    expect(result.current.orders).toContain(mockOrder);
  });

  it('should update order status', () => {
    const { result } = renderHook(() => useTradeStore());
    const mockOrder = {
      id: '1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      price: '97500',
      quantity: '1.5',
      status: 'NEW',
      timestamp: Date.now(),
    };
    
    act(() => {
      result.current.addOrder(mockOrder);
      result.current.updateOrderStatus('1', 'FILLED');
    });

    expect(result.current.orders[0].status).toBe('FILLED');
  });

  it('should cancel order', () => {
    const { result } = renderHook(() => useTradeStore());
    const mockOrder = {
      id: '1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      price: '97500',
      quantity: '1.5',
      status: 'NEW',
      timestamp: Date.now(),
    };
    
    act(() => {
      result.current.addOrder(mockOrder);
      result.current.cancelOrder('1');
    });

    expect(result.current.orders[0].status).toBe('CANCELLED');
  });

  it('should add position', () => {
    const { result } = renderHook(() => useTradeStore());
    const mockPosition = {
      symbol: 'BTCUSDT',
      side: 'LONG',
      quantity: '1.5',
      entryPrice: '97000',
      currentPrice: '97500',
      pnl: '750',
      pnlPercent: '0.77',
    };
    
    act(() => {
      result.current.addPosition(mockPosition);
    });

    expect(result.current.positions).toContain(mockPosition);
  });

  it('should update account balance', () => {
    const { result } = renderHook(() => useTradeStore());
    
    act(() => {
      result.current.setAccountBalance('50000');
    });

    expect(result.current.accountBalance).toBe('50000');
  });

  it('should select order', () => {
    const { result } = renderHook(() => useTradeStore());
    
    act(() => {
      result.current.setSelectedOrderId('1');
    });

    expect(result.current.selectedOrderId).toBe('1');
  });
});
