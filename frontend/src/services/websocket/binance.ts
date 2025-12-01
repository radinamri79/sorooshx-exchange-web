/**
 * Binance Futures WebSocket Manager
 * Handles connections to Binance WebSocket streams with:
 * - Auto-reconnect with exponential backoff
 * - Multiple stream multiplexing
 * - Subscription management
 * - Heartbeat/ping-pong
 */

import { BINANCE_WS_URL, WS_RECONNECT_DELAY, WS_MAX_RECONNECT_DELAY, WS_RECONNECT_MULTIPLIER } from '@/lib/constants';

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

interface Subscription {
  stream: string;
  handlers: Set<MessageHandler>;
}

class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectDelay = WS_RECONNECT_DELAY;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private onErrorHandlers: Set<ErrorHandler> = new Set();

  /**
   * Connect to Binance WebSocket
   */
  connect(): void {
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
      this.scheduleReconnect();
    }
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
        
        // Reconnect without this stream
        if (this.subscriptions.size > 0) {
          this.reconnect();
        } else {
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
    return this.ws?.readyState === WebSocket.OPEN;
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
      this.startPingInterval();
      
      this.onConnectHandlers.forEach((handler) => handler());
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.clearTimers();
      
      this.onDisconnectHandlers.forEach((handler) => handler());
      
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      const errorMessage = this.ws?.readyState === WebSocket.CLOSED 
        ? 'WebSocket connection closed unexpectedly' 
        : 'WebSocket connection error';
      console.error(errorMessage, {
        readyState: this.ws?.readyState,
        url: this.ws?.url,
        event: error,
      });
      this.onErrorHandlers.forEach((handler) => handler(error));
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
    if (this.ws) {
      this.shouldReconnect = true;
      this.ws.close();
    }
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
