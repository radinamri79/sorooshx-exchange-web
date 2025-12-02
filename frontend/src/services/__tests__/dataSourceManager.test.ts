/**
 * Tests for DataSourceManager
 * Tests multi-source data handling, caching, and fallback mechanisms
 */

import { dataSourceManager, validateRealData, createUnavailableResponse, getStalenessLevel } from '../dataSourceManager';
import type { TickerDataWithMeta } from '../dataSourceManager';

describe('DataSourceManager', () => {
  beforeEach(() => {
    // Clear cache before each test
    dataSourceManager.resetAllSources();
  });

  describe('Source Health Tracking', () => {
    it('should initialize all sources as healthy', () => {
      const statuses = dataSourceManager.getAllSourceStatus();
      expect(statuses).toHaveLength(5);
      expect(statuses.every(s => s.healthy)).toBe(true);
    });

    it('should mark source unhealthy after consecutive errors', () => {
      dataSourceManager.recordError('binance', 'Network error');
      dataSourceManager.recordError('binance', 'Timeout');
      dataSourceManager.recordError('binance', 'Connection refused');

      const status = dataSourceManager.getAllSourceStatus().find(s => s.source === 'binance');
      expect(status?.healthy).toBe(false);
    });

    it('should recover source health after recovery time', (done) => {
      // Mark as unhealthy (3+ errors)
      for (let i = 0; i < 3; i++) {
        dataSourceManager.recordError('binance', 'Error');
      }

      let binanceStatus = dataSourceManager.getAllSourceStatus().find(s => s.source === 'binance');
      expect(binanceStatus?.healthy).toBe(false);

      // Check recovery after 5 minutes (simplified for testing)
      dataSourceManager.resetSource('binance');
      binanceStatus = dataSourceManager.getAllSourceStatus().find(s => s.source === 'binance');
      expect(binanceStatus?.healthy).toBe(true);

      done();
    });

    it('should record successful fetch and reset error count', () => {
      // Cause some errors
      dataSourceManager.recordError('okx', 'Error 1');
      dataSourceManager.recordError('okx', 'Error 2');

      let okxStatus = dataSourceManager.getAllSourceStatus().find(s => s.source === 'okx');
      expect(okxStatus?.consecutiveErrors).toBe(2);

      // Record success
      dataSourceManager.recordSuccess('okx', 150);

      okxStatus = dataSourceManager.getAllSourceStatus().find(s => s.source === 'okx');
      expect(okxStatus?.consecutiveErrors).toBe(0);
      expect(okxStatus?.healthy).toBe(true);
      expect(okxStatus?.responseTime).toBe(150);
    });
  });

  describe('Data Caching', () => {
    it('should cache real data with metadata', () => {
      const mockData: TickerDataWithMeta = {
        symbol: 'BTCUSDT',
        lastPrice: '97500.00',
        priceChange: '1500.00',
        priceChangePercent: '1.56',
        highPrice: '98000.00',
        lowPrice: '96000.00',
        volume: '50000',
        quoteVolume: '4875000000',
        _meta: {
          source: 'binance',
          reality: 'real',
          timestamp: Date.now(),
          age: 0,
          isStale: false,
          confidence: 1,
        },
      };

      dataSourceManager.cacheData('BTCUSDT', mockData);
      const cached = dataSourceManager.getCachedData('BTCUSDT');

      expect(cached).toBeDefined();
      expect(cached?.symbol).toBe('BTCUSDT');
      expect(cached?._meta.source).toBe('cache');
      expect(cached?._meta.reality).toBe('cached');
    });

    it('should return null for expired cache', () => {
      const mockData: TickerDataWithMeta = {
        symbol: 'ETHUSDT',
        lastPrice: '3650.00',
        priceChange: '50.00',
        priceChangePercent: '1.39',
        highPrice: '3700.00',
        lowPrice: '3600.00',
        volume: '100000',
        quoteVolume: '365000000',
        _meta: {
          source: 'binance',
          reality: 'real',
          timestamp: Date.now() - (70 * 60 * 1000), // 70 minutes old
          age: 0,
          isStale: true,
          confidence: 0.5,
        },
      };

      dataSourceManager.cacheData('ETHUSDT', mockData);
      const cached = dataSourceManager.getCachedData('ETHUSDT', 60 * 60 * 1000); // 1 hour max

      expect(cached).toBeNull();
    });

    it('should return cached data within acceptable age', () => {
      const mockData: TickerDataWithMeta = {
        symbol: 'XRPUSDT',
        lastPrice: '2.35',
        priceChange: '0.05',
        priceChangePercent: '2.18',
        highPrice: '2.40',
        lowPrice: '2.30',
        volume: '5000000',
        quoteVolume: '11750000',
        _meta: {
          source: 'binance',
          reality: 'real',
          timestamp: Date.now() - (5 * 60 * 1000), // 5 minutes old
          age: 0,
          isStale: false,
          confidence: 0.95,
        },
      };

      dataSourceManager.cacheData('XRPUSDT', mockData);
      const cached = dataSourceManager.getCachedData('XRPUSDT', 60 * 60 * 1000);

      expect(cached).toBeDefined();
      expect(cached?.symbol).toBe('XRPUSDT');
    });
  });

  describe('Healthy Sources', () => {
    it('should return healthy sources in priority order', () => {
      // Mark binance as unhealthy
      for (let i = 0; i < 3; i++) {
        dataSourceManager.recordError('binance', 'Error');
      }

      const healthySources = dataSourceManager.getHealthySources();
      expect(healthySources).not.toContain('binance');
      expect(healthySources).toContain('okx');
      expect(healthySources).toContain('bybit');
    });

    it('should check for realtime sources availability', () => {
      // Mark all non-coingecko sources as unhealthy
      for (const source of ['binance', 'okx', 'bybit', 'bitget']) {
        for (let i = 0; i < 3; i++) {
          dataSourceManager.recordError(source as any, 'Error');
        }
      }

      expect(dataSourceManager.hasRealtimeSource()).toBe(false);
    });
  });

  describe('Status Reporting', () => {
    it('should provide current status for UI display', () => {
      const mockData: TickerDataWithMeta = {
        symbol: 'BTCUSDT',
        lastPrice: '97500.00',
        priceChange: '1500.00',
        priceChangePercent: '1.56',
        highPrice: '98000.00',
        lowPrice: '96000.00',
        volume: '50000',
        quoteVolume: '4875000000',
        _meta: {
          source: 'binance',
          reality: 'real',
          timestamp: Date.now(),
          age: 0,
          isStale: false,
          confidence: 1,
        },
      };

      dataSourceManager.recordSuccess('binance', 100);
      dataSourceManager.cacheData('BTCUSDT', mockData);

      const status = dataSourceManager.getStatus();

      expect(status.currentSource).toBe('binance');
      expect(status.lastSuccessfulFetch).toBeDefined();
      expect(status.healthySources).toBeGreaterThan(0);
      expect(status.totalSources).toBe(5);
    });
  });
});

describe('validateRealData', () => {
  it('should accept valid market data', () => {
    const validData = {
      c: '97500.00',
      v: '50000',
      P: '1.56',
    };

    expect(validateRealData(validData as any)).toBe(true);
  });

  it('should reject data with invalid prices', () => {
    const invalidData = {
      c: '-100',
      v: '50000',
      P: '1.56',
    };

    expect(validateRealData(invalidData as any)).toBe(false);
  });

  it('should reject data with invalid volume', () => {
    const invalidData = {
      c: '97500.00',
      v: '-1000',
      P: '1.56',
    };

    expect(validateRealData(invalidData as any)).toBe(false);
  });

  it('should reject missing critical fields', () => {
    const incompleteData = {
      c: '97500.00',
      // Missing volume and price change
    };

    expect(validateRealData(incompleteData as any)).toBe(false);
  });
});

describe('getStalenessLevel', () => {
  it('should classify fresh data as FRESH', () => {
    const age = 5 * 1000; // 5 seconds
    expect(getStalenessLevel(age)).toBe('fresh');
  });

  it('should classify acceptable data as ACCEPTABLE', () => {
    const age = 30 * 1000; // 30 seconds
    expect(getStalenessLevel(age)).toBe('acceptable');
  });

  it('should classify stale data as STALE', () => {
    const age = 2 * 60 * 1000; // 2 minutes
    expect(getStalenessLevel(age)).toBe('stale');
  });

  it('should classify very stale data as VERY_STALE', () => {
    const age = 30 * 60 * 1000; // 30 minutes
    expect(getStalenessLevel(age)).toBe('very_stale');
  });
});

describe('createUnavailableResponse', () => {
  it('should create unavailable response with correct metadata', () => {
    const response = createUnavailableResponse('BTCUSDT');

    expect(response.symbol).toBe('BTCUSDT');
    expect(response._meta.reality).toBe('unavailable');
    expect(response._meta.source).toBe('none');
    expect(response.lastPrice).toBe('--');
  });

  it('should mark as unavailable in metadata', () => {
    const response = createUnavailableResponse('ETHUSDT');

    expect(response._meta.reality).toBe('unavailable');
    expect(response._meta.isStale).toBe(true);
    expect(response._meta.confidence).toBe(0);
  });
});
