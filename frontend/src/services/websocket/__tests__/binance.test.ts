import { createWebSocketClient, WebSocketClient } from '../binance';

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

  it('should create websocket client', () => {
    const client = createWebSocketClient('BTCUSDT');
    expect(client).toHaveProperty('connect');
    expect(client).toHaveProperty('disconnect');
  });

  it('should connect to websocket', (done) => {
    const client = createWebSocketClient('BTCUSDT');
    
    client.connect({
      onTicker: (data) => {
        expect(data).toBeDefined();
        done();
      },
    });

    expect(global.WebSocket).toHaveBeenCalled();
  });

  it('should handle message events', (done) => {
    const client = createWebSocketClient('BTCUSDT');
    const mockMessage = {
      e: '24hrTicker',
      s: 'BTCUSDT',
      c: '97500',
      p: '1500',
      P: '1.56',
      v: '50000',
      q: '4875000000',
    };

    let addEventListenerCall = 0;
    (mockWs.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === 'message') {
        setTimeout(() => {
          handler({
            data: JSON.stringify(mockMessage),
          });
        }, 0);
      }
    });

    client.connect({
      onTicker: (data) => {
        if (data.symbol === 'BTCUSDT') {
          expect(data.lastPrice).toBeDefined();
          done();
        }
      },
    });
  });

  it('should disconnect from websocket', () => {
    const client = createWebSocketClient('BTCUSDT');
    client.connect({});
    client.disconnect();

    expect(mockWs.close).toHaveBeenCalled();
  });

  it('should handle connection errors', (done) => {
    const client = createWebSocketClient('BTCUSDT');

    (mockWs.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      if (event === 'error') {
        setTimeout(() => {
          handler(new Error('Connection error'));
        }, 0);
      }
    });

    client.connect({
      onError: (error) => {
        expect(error).toBeDefined();
        done();
      },
    });
  });
});
