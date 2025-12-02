/**
 * Binance Futures WebSocket Manager
 * Handles connections to Binance WebSocket streams with:
 * - Auto-reconnect with exponential backoff
 * - Multiple stream multiplexing
 * - Subscription management
 * - Heartbeat/ping-pong
 * - Alternative WebSocket sources when primary is blocked
 * - NO MOCK DATA - only real market data or unavailable state
 */

import { BINANCE_WS_URL, WS_RECONNECT_DELAY, WS_MAX_RECONNECT_DELAY, WS_RECONNECT_MULTIPLIER } from '@/lib/constants';

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;
type StatusHandler = (status: ConnectionStatus) => void;

interface Subscription {
  stream: string;
  handlers: Set<MessageHandler>;
}

// Connection status for UI display
export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable'
  | 'reconnecting';

// WebSocket sources to try in order
type WebSocketSource = 'binance' | 'okx' | 'bybit';

const WS_SOURCES: Record<WebSocketSource, string> = {
  binance: 'wss://stream.binance.com:9443',
  okx: 'wss://ws.okx.com:8443/ws/v5/public',
  bybit: 'wss://stream.bybit.com/v5/public/spot',
};

// Normalize data from different sources to Binance format
function normalizeTickerData(data: unknown, source: WebSocketSource): unknown {
  if (source === 'binance') return data;
  
  try {
    if (source === 'okx') {
      const okxData = data as { arg?: { instId: string }, data?: Array<{ last: string, open24h: string, high24h: string, low24h: string, vol24h: string }> };
      if (okxData.data && okxData.data[0]) {
        const d = okxData.data[0];
        const symbol = okxData.arg?.instId?.replace('-', '') || '';
        const lastPrice = parseFloat(d.last);
        const openPrice = parseFloat(d.open24h);
        const priceChange = lastPrice - openPrice;
        
        return {
          e: '24hrTicker',
          E: Date.now(),
          s: symbol,
          c: d.last,
          o: d.open24h,
          h: d.high24h,
          l: d.low24h,
          v: d.vol24h,
          p: priceChange.toFixed(8),
          P: ((priceChange / openPrice) * 100).toFixed(2),
          _source: 'okx',
        };
      }
    } else if (source === 'bybit') {
      const bybitData = data as { topic?: string, data?: { symbol: string, lastPrice: string, prevPrice24h: string, highPrice24h: string, lowPrice24h: string, volume24h: string } };
      if (bybitData.data) {
        const d = bybitData.data;
        const lastPrice = parseFloat(d.lastPrice);
        const openPrice = parseFloat(d.prevPrice24h);
        const priceChange = lastPrice - openPrice;
        
        return {
          e: '24hrTicker',
          E: Date.now(),
          s: d.symbol,
          c: d.lastPrice,
          o: d.prevPrice24h,
          h: d.highPrice24h,
          l: d.lowPrice24h,
          v: d.volume24h,
          p: priceChange.toFixed(8),
          P: ((priceChange / openPrice) * 100).toFixed(2),
          _source: 'bybit',
        };
      }
    }
  } catch {
    // Return null if normalization fails
  }
  
  return null;
}

class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectDelay = WS_RECONNECT_DELAY;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private hasEverConnected = false;
  
  // Multi-source support
  private currentSource: WebSocketSource = 'binance';
  private sourceAttempts: Map<WebSocketSource, number> = new Map();
  private failedSources: Set<WebSocketSource> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private onErrorHandlers: Set<ErrorHandler> = new Set();
  private onStatusChangeHandlers: Set<StatusHandler> = new Set();

  constructor() {
    // Initialize source attempts
    this.sourceAttempts.set('binance', 0);
    this.sourceAttempts.set('okx', 0);
    this.sourceAttempts.set('bybit', 0);
  }

  /**
   * Update and notify connection status
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.onStatusChangeHandlers.forEach((handler) => handler(status));
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get current data source name
   */
  getCurrentSource(): WebSocketSource {
    return this.currentSource;
  }

  /**
   * Connect to WebSocket (tries multiple sources)
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Build URL with streams
    const streams = Array.from(this.subscriptions.keys());
    if (streams.length === 0) {
      this.isConnecting = false;
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.setConnectionStatus('connecting');

    this.connectToSource(this.currentSource, streams);
  }

  /**
   * Try to connect to a specific source
   */
  private connectToSource(source: WebSocketSource, streams: string[]): void {
    let url: string;
    
    if (source === 'binance') {
      url = `${BINANCE_WS_URL}/stream?streams=${streams.join('/')}`;
    } else if (source === 'okx') {
      url = WS_SOURCES.okx;
    } else if (source === 'bybit') {
      url = WS_SOURCES.bybit;
    } else {
      this.tryNextSource();
      return;
    }
    
    try {
      this.ws = new WebSocket(url);
      this.setupEventHandlers(source);
    } catch (error) {
      console.error(`WebSocket connection error (${source}):`, error);
      this.tryNextSource();
    }
  }

  /**
   * Try next available WebSocket source
   */
  private tryNextSource(): void {
    const sources: WebSocketSource[] = ['binance', 'okx', 'bybit'];
    const currentIndex = sources.indexOf(this.currentSource);
    
    // Mark current source as failed
    this.failedSources.add(this.currentSource);
    
    // Find next source that hasn't failed
    for (let i = 1; i <= sources.length; i++) {
      const nextIndex = (currentIndex + i) % sources.length;
      const nextSource = sources[nextIndex];
      
      if (nextSource && !this.failedSources.has(nextSource)) {
        this.currentSource = nextSource;
        console.info(`Trying WebSocket source: ${nextSource}`);
        
        const streams = Array.from(this.subscriptions.keys());
        this.connectToSource(nextSource, streams);
        return;
      }
    }
    
    // All sources failed - set unavailable status
    this.isConnecting = false;
    this.setConnectionStatus('unavailable');
    console.warn('All WebSocket sources unavailable - live data cannot be displayed');
    
    // Notify handlers that connection is unavailable
    this.onDisconnectHandlers.forEach((handler) => handler());
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.setConnectionStatus('disconnected');
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
    
    // Connect or reconnect if needed
    if (this.ws?.readyState === WebSocket.OPEN) {
      // For combined streams, we need to reconnect with new URL
      this.reconnect();
    } else if (this.connectionStatus !== 'unavailable') {
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
        
        // Reconnect without this stream
        if (this.subscriptions.size > 0 && this.connectionStatus === 'connected') {
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
   * Add status change event handler
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.onStatusChangeHandlers.add(handler);
    // Immediately notify of current status
    handler(this.connectionStatus);
    return () => this.onStatusChangeHandlers.delete(handler);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get subscribed streams
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  private setupEventHandlers(source: WebSocketSource): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectDelay = WS_RECONNECT_DELAY;
      this.connectionAttempts = 0;
      this.hasEverConnected = true;
      this.failedSources.clear(); // Clear failed sources on successful connection
      this.setConnectionStatus('connected');
      this.startPingInterval();
      
      // For OKX and Bybit, we need to send subscription messages
      if (source === 'okx') {
        this.sendOKXSubscriptions();
      } else if (source === 'bybit') {
        this.sendBybitSubscriptions();
      }
      
      console.info(`WebSocket connected to ${source}`);
      this.onConnectHandlers.forEach((handler) => handler());
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this.clearTimers();
      
      // Update status based on situation
      if (!this.hasEverConnected && this.shouldReconnect) {
        this.connectionAttempts++;
        
        // If connection closes immediately, likely blocked
        if (this.connectionAttempts >= this.maxConnectionAttempts || event.wasClean === false) {
          // Try next source
          this.tryNextSource();
        } else {
          this.setConnectionStatus('reconnecting');
          this.scheduleReconnect();
        }
      } else if (this.hasEverConnected && this.shouldReconnect) {
        // We had a working connection, try to reconnect to same source first
        this.setConnectionStatus('reconnecting');
        this.scheduleReconnect();
      } else {
        this.setConnectionStatus('disconnected');
      }
      
      this.onDisconnectHandlers.forEach((handler) => handler());
    };

    this.ws.onerror = () => {
      this.onErrorHandlers.forEach((handler) => handler(new Event('error')));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        
        // Normalize data based on source
        let normalizedData: unknown;
        
        if (source === 'binance') {
          // Handle combined stream format: { stream: "btcusdt@ticker", data: {...} }
          if (message.stream && message.data) {
            const subscription = this.subscriptions.get(message.stream);
            if (subscription) {
              subscription.handlers.forEach((handler) => handler(message.data));
            }
          } else {
            // Handle single stream format
            this.subscriptions.forEach((subscription) => {
              subscription.handlers.forEach((handler) => handler(message));
            });
          }
        } else {
          // Normalize data from other sources
          normalizedData = normalizeTickerData(message, source);
          if (normalizedData) {
            // Send to relevant subscriptions
            this.subscriptions.forEach((subscription) => {
              if (subscription.stream.includes('@ticker')) {
                subscription.handlers.forEach((handler) => handler(normalizedData));
              }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
  }

  /**
   * Send subscription messages to OKX WebSocket
   */
  private sendOKXSubscriptions(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const args: Array<{ channel: string; instId: string }> = [];
    
    this.subscriptions.forEach((_, stream) => {
      const parts = stream.split('@');
      const symbol = parts[0]?.toUpperCase() || '';
      const streamType = parts[1] || '';
      
      if (streamType === 'ticker') {
        const instId = symbol.replace('USDT', '-USDT');
        args.push({ channel: 'tickers', instId });
      }
    });
    
    if (args.length > 0) {
      this.ws.send(JSON.stringify({ op: 'subscribe', args }));
    }
  }

  /**
   * Send subscription messages to Bybit WebSocket
   */
  private sendBybitSubscriptions(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const args: string[] = [];
    
    this.subscriptions.forEach((_, stream) => {
      const parts = stream.split('@');
      const symbol = parts[0]?.toUpperCase() || '';
      const streamType = parts[1] || '';
      
      if (streamType === 'ticker') {
        args.push(`tickers.${symbol}`);
      }
    });
    
    if (args.length > 0) {
      this.ws.send(JSON.stringify({ op: 'subscribe', args }));
    }
  }

  private startPingInterval(): void {
    this.clearTimers();
    
    // Send ping every 3 minutes to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Binance: no explicit ping needed
        // OKX: send ping message
        if (this.currentSource === 'okx') {
          this.ws.send('ping');
        }
        // Bybit: send ping message
        else if (this.currentSource === 'bybit') {
          this.ws.send(JSON.stringify({ op: 'ping' }));
        }
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
    if (this.ws) {
      this.shouldReconnect = true;
      this.ws.close();
    }
  }

  /**
   * Reset connection and try all sources again
   * Useful for users who want to retry after changing network/VPN
   */
  retryConnection(): void {
    this.failedSources.clear();
    this.connectionAttempts = 0;
    this.currentSource = 'binance'; // Start with primary source
    this.hasEverConnected = false;
    this.setConnectionStatus('connecting');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Reconnect with subscriptions
    if (this.subscriptions.size > 0) {
      this.connect();
    }
  }

  /**
   * Check if data is currently unavailable
   */
  isUnavailable(): boolean {
    return this.connectionStatus === 'unavailable';
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
