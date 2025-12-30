import { renderHook } from '@testing-library/react';
import { useTradeStore } from '../useTradeStore';

describe('useTradeStore', () => {
  beforeEach(() => {
    const { wallet } = useTradeStore.getState();
    useTradeStore.setState({
      orders: [],
      positions: [],
      wallet: { ...wallet, balance: '10000.00000000', availableBalance: '10000.00000000' },
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.orders).toEqual([]);
    expect(result.current.positions).toEqual([]);
    expect(result.current.wallet).toBeDefined();
  });

  it('should have order management', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.orders).toBeDefined();
    expect(Array.isArray(result.current.orders)).toBe(true);
  });

  it('should support order cancellation', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.cancelOrder).toBeDefined();
    expect(typeof result.current.cancelOrder).toBe('function');
  });

  it('should support position management', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.positions).toBeDefined();
    expect(Array.isArray(result.current.positions)).toBe(true);
  });

  it('should support position closing', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.closePosition).toBeDefined();
    expect(typeof result.current.closePosition).toBe('function');
  });

  it('should manage wallet', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.wallet).toBeDefined();
    expect(result.current.wallet.balance).toBeDefined();
  });

  it('should have leverage settings', () => {
    const { result } = renderHook(() => useTradeStore());
    expect(result.current.defaultLeverage).toBeDefined();
    expect(result.current.setDefaultLeverage).toBeDefined();
  });
});
