/**
 * Market Data Service - Provides real-time market data with intelligent caching
 * Coordinates with ExchangeManager for failover and data freshness
 */

import Decimal from 'decimal.js';
import {
  KlineData,
  OrderBook,
  TickerData,
  FundingRateData,
  MarkPriceData,
  ExchangeName,
  DataFreshness,
} from '@/types/exchange';
import { getExchangeManager } from '@/services/exchange/ExchangeManager';

interface MarketDataState {
  // Klines by symbol and interval
  klines: Map<string, Map<string, KlineData[]>>;
  // Order books by symbol
  orderBooks: Map<string, OrderBook>;
  // Ticker data by symbol
  tickers: Map<string, TickerData>;
  // Funding rates by symbol
  fundingRates: Map<string, FundingRateData>;
  // Mark prices by symbol
  markPrices: Map<string, MarkPriceData>;
  // Active subscriptions
  subscriptions: Map<string, { unsubscribe: () => void; type: string }>;
  // Data freshness
  dataFreshness: DataFreshness | null;
  // Loading states
  loading: Map<string, boolean>;
  // Error states
  errors: Map<string, string>;
  // Current exchange
  currentExchange: ExchangeName;
}

class MarketDataService {
  private manager = getExchangeManager();
  private state: MarketDataState = {
    klines: new Map(),
    orderBooks: new Map(),
    tickers: new Map(),
    fundingRates: new Map(),
    markPrices: new Map(),
    subscriptions: new Map(),
    dataFreshness: null,
    loading: new Map(),
    errors: new Map(),
    currentExchange: 'binance',
  };

  private updateInterval: NodeJS.Timeout | null = null;
  private symbols: Set<string> = new Set();
  private activeIntervals: Set<string> = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);

  constructor() {
    this.setupExchangeListeners();
    this.startDataFreshnessUpdates();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private setupExchangeListeners(): void {
    this.manager.on('failover', (data: any) => {
      console.log(`Market data failover: ${data.from} → ${data.to}`);
      this.state.currentExchange = data.to;
      // Optionally reconnect subscriptions to new exchange
    });

    this.manager.on('allExchangesDown', () => {
      console.warn('All exchanges down, showing cached market data');
      this.state.errors.set('market', 'All exchanges unavailable, showing cached data');
    });
  }

  private startDataFreshnessUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.state.dataFreshness = this.manager.getDataFreshness();
    }, 1000);
  }

  // ============================================================================
  // Kline Data Management
  // ============================================================================

  async getKlines(symbol: string, interval: string, limit?: number): Promise<KlineData[]> {
    const key = `${symbol}:${interval}`;
    this.state.loading.set(key, true);

    try {
      const data = await this.manager.getKlines(symbol, interval, limit);

      // Store in state
      if (!this.state.klines.has(symbol)) {
        this.state.klines.set(symbol, new Map());
      }
      this.state.klines.get(symbol)!.set(interval, data);

      this.state.errors.delete(key);
      this.symbols.add(symbol);
      this.activeIntervals.add(interval);

      return data;
    } catch (error) {
      const errorMsg = `Failed to load klines: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (data: KlineData[]) => void
  ): string {
    const subscriptionId = `kline_${symbol}_${interval}_${Date.now()}`;

    try {
      const unsub = this.manager.subscribeToKlines(symbol, interval, (kline) => {
        // Update local state
        if (!this.state.klines.has(symbol)) {
          this.state.klines.set(symbol, new Map());
        }

        const klines = this.state.klines.get(symbol)!.get(interval) || [];

        // If last candle is same time, update it; otherwise add new
        if (klines.length > 0 && klines[klines.length - 1].timestamp === kline.timestamp) {
          klines[klines.length - 1] = kline;
        } else if (kline.isFinal) {
          klines.push(kline);
          // Keep only last 500 candles in memory
          if (klines.length > 500) {
            klines.shift();
          }
        }

        this.state.klines.get(symbol)!.set(interval, klines);
        callback(klines);
      });

      this.state.subscriptions.set(subscriptionId, {
        unsubscribe: unsub,
        type: 'kline',
      });

      this.symbols.add(symbol);
      this.activeIntervals.add(interval);

      return subscriptionId;
    } catch (error) {
      console.error(`Failed to subscribe to klines: ${error}`);
      throw error;
    }
  }

  // ============================================================================
  // Order Book Management
  // ============================================================================

  async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    const key = symbol;
    this.state.loading.set(key, true);

    try {
      const data = await this.manager.getOrderBook(symbol, limit);
      this.state.orderBooks.set(symbol, data);
      this.state.errors.delete(key);
      this.symbols.add(symbol);
      return data;
    } catch (error) {
      const errorMsg = `Failed to load order book: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  subscribeToDepth(symbol: string, callback: (data: OrderBook) => void): string {
    const subscriptionId = `depth_${symbol}_${Date.now()}`;

    try {
      const unsub = this.manager.subscribeToDepth(symbol, (depth) => {
        this.state.orderBooks.set(symbol, depth);
        callback(depth);
      });

      this.state.subscriptions.set(subscriptionId, {
        unsubscribe: unsub,
        type: 'depth',
      });

      this.symbols.add(symbol);
      return subscriptionId;
    } catch (error) {
      console.error(`Failed to subscribe to depth: ${error}`);
      throw error;
    }
  }

  // ============================================================================
  // Ticker Data Management
  // ============================================================================

  async getTicker(symbol: string): Promise<TickerData> {
    const key = symbol;
    this.state.loading.set(key, true);

    try {
      const data = await this.manager.getTicker(symbol);
      this.state.tickers.set(symbol, data);
      this.state.errors.delete(key);
      this.symbols.add(symbol);
      return data;
    } catch (error) {
      const errorMsg = `Failed to load ticker: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  subscribeToTicker(symbol: string, callback: (data: TickerData) => void): string {
    const subscriptionId = `ticker_${symbol}_${Date.now()}`;

    try {
      const unsub = this.manager.subscribeToTicker(symbol, (ticker) => {
        this.state.tickers.set(symbol, ticker);
        callback(ticker);
      });

      this.state.subscriptions.set(subscriptionId, {
        unsubscribe: unsub,
        type: 'ticker',
      });

      this.symbols.add(symbol);
      return subscriptionId;
    } catch (error) {
      console.error(`Failed to subscribe to ticker: ${error}`);
      throw error;
    }
  }

  // ============================================================================
  // Funding Rate Management
  // ============================================================================

  async getFundingRate(symbol: string): Promise<FundingRateData> {
    const key = `fr_${symbol}`;
    this.state.loading.set(key, true);

    try {
      const data = await this.manager.getFundingRate(symbol);
      this.state.fundingRates.set(symbol, data);
      this.state.errors.delete(key);
      this.symbols.add(symbol);
      return data;
    } catch (error) {
      const errorMsg = `Failed to load funding rate: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  // ============================================================================
  // Mark Price Management
  // ============================================================================

  async getMarkPrice(symbol: string): Promise<MarkPriceData> {
    const key = `mp_${symbol}`;
    this.state.loading.set(key, true);

    try {
      const data = await this.manager.getMarkPrice(symbol);
      this.state.markPrices.set(symbol, data);
      this.state.errors.delete(key);
      this.symbols.add(symbol);
      return data;
    } catch (error) {
      const errorMsg = `Failed to load mark price: ${error}`;
      this.state.errors.set(key, errorMsg);
      throw error;
    } finally {
      this.state.loading.delete(key);
    }
  }

  subscribeToMarkPrice(symbol: string, callback: (data: MarkPriceData) => void): string {
    const subscriptionId = `markPrice_${symbol}_${Date.now()}`;

    try {
      const unsub = this.manager.subscribeToMarkPrice(symbol, (markPrice) => {
        this.state.markPrices.set(symbol, markPrice);
        callback(markPrice);
      });

      this.state.subscriptions.set(subscriptionId, {
        unsubscribe: unsub,
        type: 'markPrice',
      });

      this.symbols.add(symbol);
      return subscriptionId;
    } catch (error) {
      console.error(`Failed to subscribe to mark price: ${error}`);
      throw error;
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  unsubscribe(subscriptionId: string): void {
    const subscription = this.state.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.state.subscriptions.delete(subscriptionId);
    }
  }

  unsubscribeAll(): void {
    this.state.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this.state.subscriptions.clear();
  }

  // ============================================================================
  // Getters & Computed
  // ============================================================================

  getKlinesBySymbol(symbol: string): Map<string, KlineData[]> | undefined {
    return this.state.klines.get(symbol);
  }

  getLatestKline(symbol: string, interval: string): KlineData | undefined {
    const klines = this.state.klines.get(symbol)?.get(interval);
    return klines?.[klines.length - 1];
  }

  getOrderBook(symbol: string): OrderBook | undefined {
    return this.state.orderBooks.get(symbol);
  }

  getTicker(symbol: string): TickerData | undefined {
    return this.state.tickers.get(symbol);
  }

  getFundingRate(symbol: string): FundingRateData | undefined {
    return this.state.fundingRates.get(symbol);
  }

  getMarkPrice(symbol: string): MarkPriceData | undefined {
    return this.state.markPrices.get(symbol);
  }

  getCurrentPrice(symbol: string): string {
    const markPrice = this.getMarkPrice(symbol);
    if (markPrice) return markPrice.markPrice;

    const ticker = this.getTicker(symbol);
    if (ticker) return ticker.lastPrice;

    const kline = this.getLatestKline(symbol, '1m');
    if (kline) return kline.close;

    return '0';
  }

  getBidAsk(symbol: string): { bid: string; ask: string } | undefined {
    const orderBook = this.getOrderBook(symbol);
    if (orderBook && orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      return {
        bid: orderBook.bids[0].price,
        ask: orderBook.asks[0].price,
      };
    }

    const ticker = this.getTicker(symbol);
    if (ticker) {
      return {
        bid: ticker.bidPrice,
        ask: ticker.askPrice,
      };
    }

    return undefined;
  }

  getSpread(symbol: string): string | undefined {
    const bidAsk = this.getBidAsk(symbol);
    if (!bidAsk) return undefined;

    const spread = new Decimal(bidAsk.ask).minus(bidAsk.bid);
    const midPrice = new Decimal(bidAsk.ask).plus(bidAsk.bid).dividedBy(2);
    return spread.dividedBy(midPrice).times(100).toString();
  }

  getDataFreshness(): DataFreshness | null {
    return this.state.dataFreshness;
  }

  isLoading(key?: string): boolean {
    if (key) return this.state.loading.get(key) || false;
    return this.state.loading.size > 0;
  }

  getError(key: string): string | undefined {
    return this.state.errors.get(key);
  }

  getCurrentExchange(): ExchangeName {
    return this.state.currentExchange;
  }

  getState(): MarketDataState {
    return this.state;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.unsubscribeAll();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Singleton instance
let marketDataService: MarketDataService | null = null;

export function getMarketDataService(): MarketDataService {
  if (!marketDataService) {
    marketDataService = new MarketDataService();
  }
  return marketDataService;
}

// Export for cleanup on unmount
export function destroyMarketDataService(): void {
  marketDataService?.destroy();
  marketDataService = null;
}
