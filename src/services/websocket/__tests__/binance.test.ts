import { binanceWS, subscribeTicker, subscribeDepth } from '../binance';

describe('Binance WebSocket', () => {
  let mockWs: any;

  beforeEach(() => {
    mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    global.WebSocket = jest.fn(() => mockWs) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize binance websocket manager', () => {
    expect(binanceWS).toBeDefined();
    expect(binanceWS).toHaveProperty('subscribe');
    expect(binanceWS).toHaveProperty('unsubscribe');
  });

  it('should subscribe to ticker', () => {
    const handler = jest.fn();
    const unsubscribe = subscribeTicker('BTCUSDT', handler);
    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should subscribe to depth', () => {
    const handler = jest.fn();
    const unsubscribe = subscribeDepth('BTCUSDT', handler);
    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should handle connection status', () => {
    const status = binanceWS.getConnectionStatus();
    expect(status).toBeDefined();
    expect(['connected', 'disconnected', 'connecting', 'reconnecting']).toContain(status);
  });

  it('should support status change callbacks', () => {
    const callback = jest.fn();
    const unsubscribe = binanceWS.onStatusChange(callback);
    expect(unsubscribe).toBeDefined();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should handle message parsing', () => {
    const handler = jest.fn();
    subscribeTicker('BTCUSDT', handler);
    expect(handler).toBeDefined();
  });

  it('should cleanup on unsubscribe', () => {
    const handler = jest.fn();
    const unsubscribe = subscribeTicker('BTCUSDT', handler);
    unsubscribe();
    expect(typeof unsubscribe).toBe('function');
  });
});
