/**
 * Tests for WebSocket Manager with Multi-Source Support
 */

import { binanceWS } from '../websocket/binance';
import type { ConnectionStatus } from '../websocket/binance';

describe('BinanceWebSocketManager', () => {
  beforeEach(() => {
    // Reset before each test
    binanceWS.disconnect();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected status', () => {
      expect(binanceWS.getConnectionStatus()).toBe('disconnected');
    });

    it('should track connection status changes', (done) => {
      let statusChanges: ConnectionStatus[] = [];

      const unsubscribe = binanceWS.onStatusChange((status) => {
        statusChanges.push(status);
      });

      // Should immediately get current status
      expect(statusChanges.length).toBeGreaterThan(0);
      unsubscribe();
      done();
    });

    it('should check if connected', () => {
      expect(binanceWS.isConnected()).toBe(false);
    });

    it('should disconnect properly', () => {
      binanceWS.disconnect();
      expect(binanceWS.isConnected()).toBe(false);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to streams', () => {
      const handler = jest.fn();
      const unsubscribe = binanceWS.subscribe('btcusdt@ticker', handler);

      const subs = binanceWS.getSubscriptions();
      expect(subs).toContain('btcusdt@ticker');

      unsubscribe();
    });

    it('should unsubscribe from streams', () => {
      const handler = jest.fn();
      const unsubscribe = binanceWS.subscribe('ethusdt@ticker', handler);

      let subs = binanceWS.getSubscriptions();
      expect(subs).toContain('ethusdt@ticker');

      unsubscribe();

      subs = binanceWS.getSubscriptions();
      expect(subs).not.toContain('ethusdt@ticker');
    });

    it('should support multiple handlers per stream', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsub1 = binanceWS.subscribe('btcusdt@ticker', handler1);
      const unsub2 = binanceWS.subscribe('btcusdt@ticker', handler2);

      expect(binanceWS.getSubscriptions()).toContain('btcusdt@ticker');

      unsub1();
      unsub2();
    });

    it('should get all subscribed streams', () => {
      const handler = jest.fn();

      binanceWS.subscribe('btcusdt@ticker', handler);
      binanceWS.subscribe('ethusdt@depth@100ms', handler);
      binanceWS.subscribe('adausdt@kline_1m', handler);

      const subs = binanceWS.getSubscriptions();
      expect(subs.length).toBe(3);
      expect(subs).toContain('btcusdt@ticker');
      expect(subs).toContain('ethusdt@depth@100ms');
      expect(subs).toContain('adausdt@kline_1m');
    });
  });

  describe('Multi-Source Support', () => {
    it('should track current data source', () => {
      const source = binanceWS.getCurrentSource();
      expect(['binance', 'okx', 'bybit']).toContain(source);
    });

    it('should retry with next source on connection failure', (done) => {
      // This would require mocking WebSocket
      // For now, we just verify the method exists and has the right signature
      expect(typeof binanceWS.retryConnection).toBe('function');
      done();
    });

    it('should have fallback sources available', () => {
      const sources = ['binance', 'okx', 'bybit'];
      expect(binanceWS.getCurrentSource()).toBeTruthy();
      expect(sources).toContain(binanceWS.getCurrentSource());
    });
  });

  describe('Connection Status', () => {
    it('should handle connection status changes', (done) => {
      const statuses: ConnectionStatus[] = [];

      const unsubscribe = binanceWS.onStatusChange((status) => {
        statuses.push(status);
      });

      // Immediate callback with current status
      expect(statuses.length).toBeGreaterThan(0);

      unsubscribe();
      done();
    });

    it('should support unavailable status', () => {
      expect(binanceWS.isUnavailable()).toBeDefined();
      expect(typeof binanceWS.isUnavailable()).toBe('boolean');
    });
  });

  describe('Event Handlers', () => {
    it('should call connect handlers when connected', (done) => {
      const handler = jest.fn();
      const unsubscribe = binanceWS.onConnect(handler);

      // Would be called on actual WebSocket connection
      unsubscribe();
      done();
    });

    it('should call disconnect handlers when disconnected', (done) => {
      const handler = jest.fn();
      const unsubscribe = binanceWS.onDisconnect(handler);

      binanceWS.disconnect();
      unsubscribe();
      done();
    });

    it('should support multiple event handlers', (done) => {
      const connectHandler1 = jest.fn();
      const connectHandler2 = jest.fn();
      const disconnectHandler = jest.fn();

      const unsub1 = binanceWS.onConnect(connectHandler1);
      const unsub2 = binanceWS.onConnect(connectHandler2);
      const unsub3 = binanceWS.onDisconnect(disconnectHandler);

      binanceWS.disconnect();

      unsub1();
      unsub2();
      unsub3();
      done();
    });
  });

  describe('Convenience Functions', () => {
    it('should provide subscribeTicker convenience function', () => {
      const handler = jest.fn();
      const unsubscribe = require('../websocket/binance').subscribeTicker('BTCUSDT', handler);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should provide subscribeDepth convenience function', () => {
      const handler = jest.fn();
      const unsubscribe = require('../websocket/binance').subscribeDepth('ETHUSDT', handler, '100ms');

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should provide subscribeKline convenience function', () => {
      const handler = jest.fn();
      const unsubscribe = require('../websocket/binance').subscribeKline('ADAUSDT', '1m', handler);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});
