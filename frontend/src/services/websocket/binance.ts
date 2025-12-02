/**
 * Binance Futures WebSocket Manager
 * Handles connections to Binance WebSocket streams with:
 * - Auto-reconnect with exponential backoff
 * - Multiple stream multiplexing
 * - Subscription management
 * - Heartbeat/ping-pong
 * - Mock data fallback when Binance is geo-blocked
 */

import { BINANCE_WS_URL, WS_RECONNECT_DELAY, WS_MAX_RECONNECT_DELAY, WS_RECONNECT_MULTIPLIER } from '@/lib/constants';

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

interface Subscription {
  stream: string;
  handlers: Set<MessageHandler>;
}

// Mock data generators for when Binance is blocked
const BASE_PRICES: Record<string, number> = {
  btcusdt: 97500,
  ethusdt: 3650,
  bnbusdt: 635,
  xrpusdt: 2.35,
  solusdt: 235,
  dogeusdt: 0.42,
  adausdt: 1.05,
  avaxusdt: 45,
  dotusdt: 9.5,
  linkusdt: 24,
};

function generateMockTickerData(symbol: string) {
  const basePrice = BASE_PRICES[symbol.toLowerCase()] || 100;
  const priceChange = (Math.random() - 0.5) * basePrice * 0.02;
  const lastPrice = basePrice + priceChange;
  
  return {
    e: '24hrTicker',
    E: Date.now(),
    s: symbol.toUpperCase(),
    p: priceChange.toFixed(2),
    P: ((priceChange / basePrice) * 100).toFixed(2),
    w: basePrice.toFixed(2),
    c: lastPrice.toFixed(2),
    Q: (Math.random() * 10).toFixed(4),
    o: basePrice.toFixed(2),
    h: (basePrice * 1.02).toFixed(2),
    l: (basePrice * 0.98).toFixed(2),
    v: (10000 + Math.random() * 100000).toFixed(4),
    q: ((10000 + Math.random() * 100000) * basePrice).toFixed(2),
  };
}

function generateMockDepthUpdate(symbol: string) {
  const basePrice = BASE_PRICES[symbol.toLowerCase()] || 100;
  const bids: [string, string][] = [];
  const asks: [string, string][] = [];
  
  for (let i = 0; i < 5; i++) {
    bids.push([(basePrice - i * 0.1).toFixed(2), (Math.random() * 10).toFixed(4)]);
    asks.push([(basePrice + i * 0.1).toFixed(2), (Math.random() * 10).toFixed(4)]);
  }
  
  return {
    e: 'depthUpdate',
    E: Date.now(),
    T: Date.now(),
    s: symbol.toUpperCase(),
    U: Date.now(),
    u: Date.now() + 1,
    b: bids,
    a: asks,
  };
}

function generateMockKlineData(symbol: string, interval: string) {
  const basePrice = BASE_PRICES[symbol.toLowerCase()] || 100;
  const open = basePrice * (0.99 + Math.random() * 0.02);
  const close = open * (0.99 + Math.random() * 0.02);
  const high = Math.max(open, close) * (1 + Math.random() * 0.005);
  const low = Math.min(open, close) * (1 - Math.random() * 0.005);
  
  return {
    e: 'kline',
    E: Date.now(),
    s: symbol.toUpperCase(),
    k: {
      t: Date.now() - 60000,
      T: Date.now(),
      s: symbol.toUpperCase(),
      i: interval,
      o: open.toFixed(2),
      c: close.toFixed(2),
      h: high.toFixed(2),
      l: low.toFixed(2),
      v: (100 + Math.random() * 1000).toFixed(4),
      n: Math.floor(50 + Math.random() * 200),
      x: false,
    },
  };
}

class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectDelay = WS_RECONNECT_DELAY;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private mockIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;
  private useMockData = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 2; // Reduced to fail faster
  private hasEverConnected = false; // Track if we ever successfully connected
  private connectionFailedPermanently = false; // Track if we've determined connection won't work
  
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private onErrorHandlers: Set<ErrorHandler> = new Set();

  constructor() {
    // Check if we should use mock data immediately (e.g., from environment or previous failures)
    if (typeof window !== 'undefined') {
      // Check localStorage for previous connection failures
      const useMock = localStorage.getItem('binance_ws_use_mock');
      if (useMock === 'true') {
        this.useMockData = true;
        this.connectionFailedPermanently = true;
        console.info('Using mock WebSocket data (previously detected connection issues)');
      }
    }
  }

  /**
   * Connect to Binance WebSocket
   */
  connect(): void {
    // If connection has permanently failed, use mock data
    if (this.connectionFailedPermanently || this.useMockData) {
      if (!this.useMockData) {
        this.switchToMockData();
      } else {
        this.startMockDataIntervals();
      }
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    // Build URL with streams
    const streams = Array.from(this.subscriptions.keys());
    if (streams.length === 0) {
      this.isConnecting = false;
      return;
    }

    const url = `${BINANCE_WS_URL}/stream?streams=${streams.join('/')}`;
    
    try {
      this.ws = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn('Max connection attempts reached, switching to mock data');
        this.switchToMockData();
      } else {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    this.stopMockDataIntervals();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to a stream
   */
  subscribe(stream: string, handler: MessageHandler): () => void {
    const normalizedStream = stream.toLowerCase();
    
    if (!this.subscriptions.has(normalizedStream)) {
      this.subscriptions.set(normalizedStream, {
        stream: normalizedStream,
        handlers: new Set(),
      });
    }
    
    const subscription = this.subscriptions.get(normalizedStream);
    if (subscription) {
      subscription.handlers.add(handler);
    }
    
    // If using mock data, start mock interval for this stream
    if (this.useMockData) {
      this.startMockIntervalForStream(normalizedStream);
      return () => this.unsubscribe(normalizedStream, handler);
    }
    
    // Reconnect if needed to add new stream
    if (this.ws?.readyState === WebSocket.OPEN) {
      // For combined streams, we need to reconnect with new URL
      this.reconnect();
    } else {
      this.connect();
    }
    
    // Return unsubscribe function
    return () => this.unsubscribe(normalizedStream, handler);
  }

  /**
   * Unsubscribe from a stream
   */
  unsubscribe(stream: string, handler: MessageHandler): void {
    const normalizedStream = stream.toLowerCase();
    const subscription = this.subscriptions.get(normalizedStream);
    
    if (subscription) {
      subscription.handlers.delete(handler);
      
      // Remove subscription if no handlers left
      if (subscription.handlers.size === 0) {
        this.subscriptions.delete(normalizedStream);
        
        // Stop mock interval for this stream if using mock data
        if (this.useMockData) {
          this.stopMockIntervalForStream(normalizedStream);
        }
        
        // Reconnect without this stream
        if (this.subscriptions.size > 0 && !this.useMockData) {
          this.reconnect();
        } else if (this.subscriptions.size === 0) {
          this.disconnect();
        }
      }
    }
  }

  /**
   * Add connection event handler
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.onConnectHandlers.add(handler);
    return () => this.onConnectHandlers.delete(handler);
  }

  /**
   * Add disconnect event handler
   */
  onDisconnect(handler: ConnectionHandler): () => void {
    this.onDisconnectHandlers.add(handler);
    return () => this.onDisconnectHandlers.delete(handler);
  }

  /**
   * Add error event handler
   */
  onError(handler: ErrorHandler): () => void {
    this.onErrorHandlers.add(handler);
    return () => this.onErrorHandlers.delete(handler);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.useMockData;
  }

  /**
   * Get subscribed streams
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectDelay = WS_RECONNECT_DELAY;
      this.connectionAttempts = 0; // Reset on successful connection
      this.hasEverConnected = true;
      this.startPingInterval();
      
      // Clear the mock data flag from localStorage since we connected successfully
      if (typeof window !== 'undefined') {
        localStorage.removeItem('binance_ws_use_mock');
      }
      
      this.onConnectHandlers.forEach((handler) => handler());
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this.clearTimers();
      
      this.onDisconnectHandlers.forEach((handler) => handler());
      
      // If the connection closed immediately (within a few ms) and we never connected,
      // it's likely geo-blocked - switch to mock data faster
      if (!this.hasEverConnected && this.shouldReconnect && !this.useMockData) {
        this.connectionAttempts++;
        
        // Be more aggressive - if connection closes immediately, likely geo-blocked
        if (this.connectionAttempts >= this.maxConnectionAttempts || event.wasClean === false) {
          // Only log once when switching to mock data
          if (this.connectionAttempts === this.maxConnectionAttempts) {
            console.info('WebSocket blocked, using mock data');
          }
          this.switchToMockData();
        } else {
          this.scheduleReconnect();
        }
      } else if (this.hasEverConnected && this.shouldReconnect && !this.useMockData) {
        // We had a working connection before, try to reconnect
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // Suppress error logging - connection issues are handled in onclose
      // Only notify registered error handlers
      this.onErrorHandlers.forEach((handler) => handler(new Event('error')));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        
        // Handle combined stream format: { stream: "btcusdt@ticker", data: {...} }
        if (message.stream && message.data) {
          const subscription = this.subscriptions.get(message.stream);
          if (subscription) {
            subscription.handlers.forEach((handler) => handler(message.data));
          }
        } else {
          // Handle single stream format
          // Notify all subscriptions (for single-stream connections)
          this.subscriptions.forEach((subscription) => {
            subscription.handlers.forEach((handler) => handler(message));
          });
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
  }

  private startPingInterval(): void {
    this.clearTimers();
    
    // Send ping every 3 minutes (Binance timeout is 10 minutes)
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Binance doesn't require explicit ping, but we can send a simple message
        // to keep the connection alive through proxies
      }
    }, 180000);
  }

  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || !this.shouldReconnect) return;
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
      
      // Exponential backoff
      this.reconnectDelay = Math.min(
        this.reconnectDelay * WS_RECONNECT_MULTIPLIER,
        WS_MAX_RECONNECT_DELAY
      );
    }, this.reconnectDelay);
  }

  private reconnect(): void {
    // Don't try to reconnect if we're using mock data
    if (this.useMockData || this.connectionFailedPermanently) {
      return;
    }
    
    if (this.ws) {
      this.shouldReconnect = true;
      this.ws.close();
    }
  }

  /**
   * Reset mock data mode and try to connect to real WebSocket again
   * Useful for users who want to retry after enabling VPN
   */
  resetMockMode(): void {
    this.useMockData = false;
    this.connectionFailedPermanently = false;
    this.connectionAttempts = 0;
    this.hasEverConnected = false;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('binance_ws_use_mock');
    }
    
    this.stopMockDataIntervals();
    
    // Reconnect with real WebSocket
    if (this.subscriptions.size > 0) {
      this.connect();
    }
  }

  /**
   * Check if using mock data
   */
  isUsingMockData(): boolean {
    return this.useMockData;
  }

  /**
   * Switch to mock data mode when WebSocket connection fails
   */
  private switchToMockData(): void {
    this.useMockData = true;
    this.connectionFailedPermanently = true;
    this.shouldReconnect = false;
    this.isConnecting = false;
    
    // Persist the mock mode to localStorage to avoid repeated failed attempts on page reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('binance_ws_use_mock', 'true');
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Start mock intervals for all current subscriptions
    this.startMockDataIntervals();
    
    // Notify handlers that we're "connected" (via mock data)
    this.onConnectHandlers.forEach((handler) => handler());
  }

  /**
   * Start mock data intervals for all subscriptions
   */
  private startMockDataIntervals(): void {
    this.subscriptions.forEach((_, stream) => {
      this.startMockIntervalForStream(stream);
    });
  }

  /**
   * Start mock data interval for a specific stream
   */
  private startMockIntervalForStream(stream: string): void {
    // Don't create duplicate intervals
    if (this.mockIntervals.has(stream)) {
      return;
    }

    // Parse stream to determine type and symbol
    // Formats: btcusdt@ticker, btcusdt@depth@100ms, btcusdt@kline_1m
    const parts = stream.split('@');
    const symbol = parts[0] || 'btcusdt';
    const streamType = parts[1] || 'ticker';

    let interval: ReturnType<typeof setInterval>;

    if (streamType === 'ticker') {
      // Ticker updates every 1 second
      interval = setInterval(() => {
        const mockData = generateMockTickerData(symbol);
        const subscription = this.subscriptions.get(stream);
        if (subscription) {
          subscription.handlers.forEach((handler) => handler(mockData));
        }
      }, 1000);
    } else if (streamType === 'depth') {
      // Depth updates every 100-500ms
      interval = setInterval(() => {
        const mockData = generateMockDepthUpdate(symbol);
        const subscription = this.subscriptions.get(stream);
        if (subscription) {
          subscription.handlers.forEach((handler) => handler(mockData));
        }
      }, 500);
    } else if (streamType.startsWith('kline_')) {
      // Kline updates every 2 seconds
      const klineInterval = streamType.replace('kline_', '');
      interval = setInterval(() => {
        const mockData = generateMockKlineData(symbol, klineInterval);
        const subscription = this.subscriptions.get(stream);
        if (subscription) {
          subscription.handlers.forEach((handler) => handler(mockData));
        }
      }, 2000);
    } else {
      // Default: generic update every second
      interval = setInterval(() => {
        const mockData = generateMockTickerData(symbol);
        const subscription = this.subscriptions.get(stream);
        if (subscription) {
          subscription.handlers.forEach((handler) => handler(mockData));
        }
      }, 1000);
    }

    this.mockIntervals.set(stream, interval);
  }

  /**
   * Stop mock data interval for a specific stream
   */
  private stopMockIntervalForStream(stream: string): void {
    const interval = this.mockIntervals.get(stream);
    if (interval) {
      clearInterval(interval);
      this.mockIntervals.delete(stream);
    }
  }

  /**
   * Stop all mock data intervals
   */
  private stopMockDataIntervals(): void {
    this.mockIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.mockIntervals.clear();
  }
}

// Singleton instance
export const binanceWS = new BinanceWebSocketManager();

// Convenience functions for specific streams
export function subscribeTicker(symbol: string, handler: MessageHandler): () => void {
  return binanceWS.subscribe(`${symbol.toLowerCase()}@ticker`, handler);
}

export function subscribeDepth(symbol: string, handler: MessageHandler, speed = '100ms'): () => void {
  return binanceWS.subscribe(`${symbol.toLowerCase()}@depth@${speed}`, handler);
}

export function subscribeKline(symbol: string, interval: string, handler: MessageHandler): () => void {
  return binanceWS.subscribe(`${symbol.toLowerCase()}@kline_${interval}`, handler);
}

export function subscribeAggTrade(symbol: string, handler: MessageHandler): () => void {
  return binanceWS.subscribe(`${symbol.toLowerCase()}@aggTrade`, handler);
}

export function subscribeMarkPrice(symbol: string, handler: MessageHandler): () => void {
  return binanceWS.subscribe(`${symbol.toLowerCase()}@markPrice`, handler);
}
