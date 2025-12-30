/**
 * Multi-Source Data Manager
 * Provides real cryptocurrency data with intelligent fallback strategy.
 * NEVER returns mock/fake data - only real data or clearly marked cached/unavailable states.
 * 
 * Data Source Hierarchy:
 * 1. Binance (Primary - fastest, most accurate)
 * 2. OKX (Secondary - reliable alternative)
 * 3. Bybit (Tertiary - good coverage)
 * 4. Bitget (Quaternary - rarely blocked)
 * 5. CoinGecko (Last resort - free, never blocked, but slower)
 * 
 * If all sources fail:
 * - Return cached real data if available and not too old
 * - Return "unavailable" state with clear indicator
 * - NEVER return mock/generated data
 */

export type DataSource = 'binance' | 'okx' | 'bybit' | 'bitget' | 'coingecko';
export type DataReality = 'real' | 'cached' | 'unavailable';

export interface TickerDataWithMeta {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  // Metadata - ALWAYS present to indicate data quality
  _meta: {
    source: DataSource | 'cache';
    reality: DataReality;
    timestamp: number;
    age: number; // milliseconds since data was fetched
    isStale: boolean; // true if age > 60 seconds
    confidence: number; // 0-1 scale
  };
}

export interface DataSourceStatus {
  source: DataSource;
  healthy: boolean;
  consecutiveErrors: number;
  lastError?: string;
  lastSuccess?: number;
  responseTime?: number; // average response time in ms
}

interface CachedData {
  data: TickerDataWithMeta;
  timestamp: number;
}

// Maximum age for cached data before it's considered too stale to show
const MAX_CACHE_AGE = {
  PRICE: 60 * 60 * 1000, // 1 hour for prices
  CHART: 24 * 60 * 60 * 1000, // 24 hours for chart data
  ORDERBOOK: 5 * 60 * 1000, // 5 minutes for orderbook
};

// Staleness thresholds
const STALENESS_THRESHOLDS = {
  FRESH: 10 * 1000, // < 10 seconds
  ACCEPTABLE: 60 * 1000, // < 1 minute
  STALE: 5 * 60 * 1000, // < 5 minutes
  VERY_STALE: 60 * 60 * 1000, // < 1 hour
};

class DataSourceManager {
  private sourceStatus: Map<DataSource, DataSourceStatus> = new Map();
  private dataCache: Map<string, CachedData> = new Map();
  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly SOURCE_RECOVERY_TIME = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize all sources as healthy
    const sources: DataSource[] = ['binance', 'okx', 'bybit', 'bitget', 'coingecko'];
    sources.forEach((source) => {
      this.sourceStatus.set(source, {
        source,
        healthy: true,
        consecutiveErrors: 0,
      });
    });

    // Load cached data from localStorage on init
    this.loadCacheFromStorage();

    // Periodic cache cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupOldCache(), 60 * 1000);
    }
  }

  /**
   * Get healthy data sources in priority order
   */
  getHealthySources(): DataSource[] {
    const sources: DataSource[] = ['binance', 'okx', 'bybit', 'bitget', 'coingecko'];
    return sources.filter((source) => {
      const status = this.sourceStatus.get(source);
      return status?.healthy ?? true;
    });
  }

  /**
   * Record successful data fetch
   */
  recordSuccess(source: DataSource, responseTime?: number): void {
    const status = this.sourceStatus.get(source);
    if (status) {
      status.healthy = true;
      status.consecutiveErrors = 0;
      status.lastSuccess = Date.now();
      if (responseTime !== undefined) {
        status.responseTime = status.responseTime
          ? (status.responseTime + responseTime) / 2
          : responseTime;
      }
    }
  }

  /**
   * Record failed data fetch
   */
  recordError(source: DataSource, error: string): void {
    const status = this.sourceStatus.get(source);
    if (!status) return;

    status.consecutiveErrors++;
    status.lastError = error;

    if (status.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      status.healthy = false;
      console.warn(`[DataSource] ${source} marked unhealthy: ${error}`);

      // Schedule recovery attempt
      setTimeout(() => {
        status.healthy = true;
        status.consecutiveErrors = 0;
        console.info(`[DataSource] ${source} recovery attempt scheduled`);
      }, this.SOURCE_RECOVERY_TIME);
    }
  }

  /**
   * Cache real data
   */
  cacheData(symbol: string, data: TickerDataWithMeta): void {
    this.dataCache.set(symbol, {
      data,
      timestamp: Date.now(),
    });

    // Also persist to localStorage
    this.saveCacheToStorage();
  }

  /**
   * Get cached data if available and not too old
   */
  getCachedData(symbol: string, maxAge = MAX_CACHE_AGE.PRICE): TickerDataWithMeta | null {
    const cached = this.dataCache.get(symbol);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      // Cache too old
      return null;
    }

    // Return cached data with updated metadata
    return {
      ...cached.data,
      _meta: {
        ...cached.data._meta,
        source: 'cache',
        reality: 'cached',
        age,
        isStale: age > STALENESS_THRESHOLDS.ACCEPTABLE,
        confidence: this.calculateCacheConfidence(age),
      },
    };
  }

  /**
   * Calculate confidence score based on cache age
   */
  private calculateCacheConfidence(age: number): number {
    if (age < STALENESS_THRESHOLDS.FRESH) return 0.95;
    if (age < STALENESS_THRESHOLDS.ACCEPTABLE) return 0.8;
    if (age < STALENESS_THRESHOLDS.STALE) return 0.6;
    if (age < STALENESS_THRESHOLDS.VERY_STALE) return 0.4;
    return 0.2;
  }

  /**
   * Get all source statuses for debugging/UI
   */
  getAllSourceStatus(): DataSourceStatus[] {
    return Array.from(this.sourceStatus.values());
  }

  /**
   * Get current status for UI display
   */
  getStatus(): { 
    currentSource: string | null; 
    lastSuccessfulFetch: number | null;
    healthySources: number;
    totalSources: number;
  } {
    const statuses = this.getAllSourceStatus();
    const healthySources = statuses.filter(s => s.healthy).length;
    const lastSuccess = statuses
      .filter(s => s.lastSuccess)
      .map(s => s.lastSuccess!)
      .sort((a, b) => b - a)[0] || null;
    
    const currentHealthy = statuses.find(s => s.healthy && s.lastSuccess);
    
    return {
      currentSource: currentHealthy?.source || null,
      lastSuccessfulFetch: lastSuccess,
      healthySources,
      totalSources: statuses.length,
    };
  }

  /**
   * Check if any real-time source is available
   */
  hasRealtimeSource(): boolean {
    return this.getHealthySources().some((s) => s !== 'coingecko');
  }

  /**
   * Force reset a source to healthy (for manual retry)
   */
  resetSource(source: DataSource): void {
    const status = this.sourceStatus.get(source);
    if (status) {
      status.healthy = true;
      status.consecutiveErrors = 0;
      status.lastError = undefined;
      console.info(`[DataSource] ${source} manually reset to healthy`);
    }
  }

  /**
   * Reset all sources (useful when user enables VPN)
   */
  resetAllSources(): void {
    this.sourceStatus.forEach((status) => {
      status.healthy = true;
      status.consecutiveErrors = 0;
      status.lastError = undefined;
    });
    console.info('[DataSource] All sources reset to healthy');
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('realDataCache');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([symbol, cached]) => {
          this.dataCache.set(symbol, cached as CachedData);
        });
      }
    } catch (error) {
      console.warn('[DataSource] Failed to load cache from storage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheObj: Record<string, CachedData> = {};
      this.dataCache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      localStorage.setItem('realDataCache', JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('[DataSource] Failed to save cache to storage:', error);
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupOldCache(): void {
    const now = Date.now();
    const maxAge = MAX_CACHE_AGE.PRICE * 2; // Keep for twice the max display age

    this.dataCache.forEach((cached, symbol) => {
      if (now - cached.timestamp > maxAge) {
        this.dataCache.delete(symbol);
      }
    });

    this.saveCacheToStorage();
  }
}

// Singleton instance
export const dataSourceManager = new DataSourceManager();

/**
 * Validate that data looks like real market data
 */
export function validateRealData(data: Partial<TickerDataWithMeta>): {
  isValid: boolean;
  reason?: string;
} {
  // Price validation
  const price = parseFloat(data.lastPrice || '0');
  if (isNaN(price) || price <= 0) {
    return { isValid: false, reason: 'Invalid price (zero or negative)' };
  }
  if (price > 10_000_000) {
    return { isValid: false, reason: 'Price unrealistically high' };
  }

  // Volume validation
  const volume = parseFloat(data.volume || '0');
  if (isNaN(volume) || volume < 0) {
    return { isValid: false, reason: 'Invalid volume' };
  }

  // Price change validation (should be reasonable)
  const changePercent = parseFloat(data.priceChangePercent || '0');
  if (!isNaN(changePercent) && Math.abs(changePercent) > 100) {
    return { isValid: false, reason: 'Price change > 100% (unrealistic)' };
  }

  return { isValid: true };
}

/**
 * Create an "unavailable" data response
 */
export function createUnavailableResponse(symbol: string): TickerDataWithMeta {
  return {
    symbol,
    lastPrice: '0',
    priceChange: '0',
    priceChangePercent: '0',
    highPrice: '0',
    lowPrice: '0',
    volume: '0',
    quoteVolume: '0',
    _meta: {
      source: 'cache',
      reality: 'unavailable',
      timestamp: Date.now(),
      age: 0,
      isStale: true,
      confidence: 0,
    },
  };
}

/**
 * Format data age for display
 */
export function formatDataAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Get staleness level for UI styling
 */
export function getStalenessLevel(ageMs: number): 'fresh' | 'acceptable' | 'stale' | 'very_stale' {
  if (ageMs < STALENESS_THRESHOLDS.FRESH) return 'fresh';
  if (ageMs < STALENESS_THRESHOLDS.ACCEPTABLE) return 'acceptable';
  if (ageMs < STALENESS_THRESHOLDS.STALE) return 'stale';
  return 'very_stale';
}
