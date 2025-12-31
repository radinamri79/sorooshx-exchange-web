/**
 * Exchange Manager - Handles multi-exchange failover and data routing
 * Tier 1: Binance (Primary)
 * Tier 2: Bybit (Fallback 1)
 * Tier 3: OKX (Fallback 2)
 * Tier 4: Gate.io (Fallback 3)
 * Tier 5: Bitget (Fallback 4, Account trading)
 */

import {
  IExchangeClient,
  ExchangeName,
  ExchangeTier,
  EXCHANGE_RANKING,
  KlineData,
  OrderBook,
  TickerData,
  FundingRateData,
  MarkPriceData,
  TradeData,
  Account,
  AccountBalance,
  Position,
  Order,
  PlaceOrderParams,
  ExchangeHealth,
  DataFreshness,
} from '@/types/exchange';
import { BinanceClient } from './BinanceClient';

interface ExchangeCache {
  klines: Map<string, { data: KlineData[]; timestamp: number }>;
  depth: Map<string, { data: OrderBook; timestamp: number }>;
  ticker: Map<string, { data: TickerData; timestamp: number }>;
  fundingRate: Map<string, { data: FundingRateData; timestamp: number }>;
  markPrice: Map<string, { data: MarkPriceData; timestamp: number }>;
  account: { data: Account; timestamp: number } | null;
}

interface FailoverConfig {
  dataTimeout: number;           // ms - when to trigger failover
  accountDataTimeout: number;    // ms - when to poll fallback for account
  cacheMaxAge: number;           // ms - max age of cached data
  healthCheckInterval: number;   // ms - how often to check exchange health
  maxConsecutiveErrors: number;  // errors before marking unhealthy
}

export class ExchangeManager {
  private exchanges: Map<ExchangeName, IExchangeClient> = new Map();
  private activeExchanges: ExchangeName[] = ['binance', 'bybit', 'okx', 'gateio', 'bitget'];
  private currentExchange: ExchangeName = 'binance';
  private currentTradingExchange: ExchangeName = 'binance'; // User can switch to Bitget
  private health: Map<ExchangeName, ExchangeHealth> = new Map();
  private cache: ExchangeCache = {
    klines: new Map(),
    depth: new Map(),
    ticker: new Map(),
    fundingRate: new Map(),
    markPrice: new Map(),
    account: null,
  };

  private config: FailoverConfig = {
    dataTimeout: 15000,           // 15 seconds
    accountDataTimeout: 30000,    // 30 seconds
    cacheMaxAge: 5 * 60 * 1000,   // 5 minutes
    healthCheckInterval: 30000,   // 30 seconds
    maxConsecutiveErrors: 5,
  };

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initializeExchanges();
    this.initializeHealth();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeExchanges(): void {
    // Initialize all supported exchanges
    this.exchanges.set('binance', new BinanceClient());
    // TODO: Add other exchange clients
    // this.exchanges.set('bybit', new BybitClient());
    // this.exchanges.set('okx', new OKXClient());
    // this.exchanges.set('gateio', new GateioClient());
    // this.exchanges.set('bitget', new BitgetClient());
  }

  private initializeHealth(): void {
    this.activeExchanges.forEach((exchange) => {
      this.health.set(exchange, {
        exchange,
        tier: EXCHANGE_RANKING[exchange],
        isConnected: false,
        isHealthy: false,
        lastPing: 0,
        latency: 0,
        errorCount: 0,
        uptime: 100,
        failoverCount: 0,
      });
    });
  }

  // ============================================================================
  // Connection & Health Management
  // ============================================================================

  async connect(): Promise<void> {
    try {
      // Connect to primary exchange
      const primaryClient = this.exchanges.get('binance');
      if (primaryClient) {
        await primaryClient.connect();
        this.updateHealth('binance', { isConnected: true, isHealthy: true });
        this.currentExchange = 'binance';
      }

      // Start health check loop
      this.startHealthCheck();

      console.log('ExchangeManager connected');
    } catch (error) {
      console.error('Failed to connect to primary exchange:', error);
      // Attempt fallback
      await this.triggerFailover();
    }
  }

  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const client of this.exchanges.values()) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [exchange, client] of this.exchanges) {
        try {
          const latency = await client.ping();
          const health = this.health.get(exchange);
          if (health) {
            health.latency = latency;
            health.errorCount = Math.max(0, health.errorCount - 1); // Recover from errors
            health.isHealthy = latency > 0 && latency < 5000; // Reasonable latency
          }
        } catch (error) {
          const health = this.health.get(exchange);
          if (health) {
            health.errorCount++;
            health.isHealthy = health.errorCount < this.config.maxConsecutiveErrors;
          }
        }
      }

      // Check if need to failover
      const currentHealth = this.health.get(this.currentExchange);
      if (currentHealth && !currentHealth.isHealthy) {
        console.warn(
          `Exchange ${this.currentExchange} unhealthy, triggering failover...`
        );
        await this.triggerFailover();
      }
    }, this.config.healthCheckInterval);
  }

  private async triggerFailover(): Promise<void> {
    const tiers = Object.values(ExchangeTier).sort();
    const currentTier = EXCHANGE_RANKING[this.currentExchange];
    const currentTierIndex = tiers.indexOf(currentTier);

    // Try next tier
    for (let i = currentTierIndex + 1; i < tiers.length; i++) {
      const nextTier = tiers[i];
      const nextExchange = Object.entries(EXCHANGE_RANKING).find(
        ([_, tier]) => tier === nextTier && this.health.get(_ as ExchangeName)?.isHealthy
      )?.[0];

      if (nextExchange) {
        const exchangeName = nextExchange as ExchangeName;
        const client = this.exchanges.get(exchangeName);

        if (client && !client.isConnected()) {
          try {
            await client.connect();
            this.currentExchange = exchangeName;
            const health = this.health.get(exchangeName);
            if (health) {
              health.failoverCount++;
              health.isHealthy = true;
            }

            this.emit('failover', { from: this.currentExchange, to: exchangeName });
            console.log(`Failover successful: switched to ${exchangeName}`);
            return;
          } catch (error) {
            console.error(`Failed to connect to ${exchangeName}:`, error);
          }
        }
      }
    }

    // All exchanges down, use cache
    this.emit('allExchangesDown', { timestamp: Date.now() });
    console.error('All exchanges down, using cached data');
  }

  // ============================================================================
  // Market Data Methods with Failover
  // ============================================================================

  async getKlines(
    symbol: string,
    interval: string,
    limit?: number
  ): Promise<KlineData[]> {
    const cacheKey = `${symbol}:${interval}`;

    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      const data = await this.withTimeout(
        client.getKlines(symbol, interval, limit),
        this.config.dataTimeout
      );

      // Cache result
      this.cache.klines.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn(
        `Failed to get klines from ${this.currentExchange}: ${error}`
      );

      // Try fallback
      return this.tryFallbackOrCache('klines', cacheKey, async (client) =>
        client.getKlines(symbol, interval, limit)
      );
    }
  }

  async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    const cacheKey = `${symbol}:${limit || 20}`;

    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      const data = await this.withTimeout(
        client.getOrderBook(symbol, limit),
        this.config.dataTimeout
      );

      this.cache.depth.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn(`Failed to get depth from ${this.currentExchange}: ${error}`);

      return this.tryFallbackOrCache('depth', cacheKey, async (client) =>
        client.getOrderBook(symbol, limit)
      );
    }
  }

  async getTicker(symbol: string): Promise<TickerData> {
    const cacheKey = symbol;

    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      const data = await this.withTimeout(
        client.getTicker(symbol),
        this.config.dataTimeout
      );

      this.cache.ticker.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn(`Failed to get ticker from ${this.currentExchange}: ${error}`);

      return this.tryFallbackOrCache('ticker', cacheKey, async (client) =>
        client.getTicker(symbol)
      );
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRateData> {
    const cacheKey = symbol;

    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      const data = await this.withTimeout(
        client.getFundingRate(symbol),
        this.config.dataTimeout
      );

      this.cache.fundingRate.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn(
        `Failed to get funding rate from ${this.currentExchange}: ${error}`
      );

      return this.tryFallbackOrCache('fundingRate', cacheKey, async (client) =>
        client.getFundingRate(symbol)
      );
    }
  }

  async getMarkPrice(symbol: string): Promise<MarkPriceData> {
    const cacheKey = symbol;

    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      const data = await this.withTimeout(
        client.getMarkPrice(symbol),
        this.config.dataTimeout
      );

      this.cache.markPrice.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn(
        `Failed to get mark price from ${this.currentExchange}: ${error}`
      );

      return this.tryFallbackOrCache('markPrice', cacheKey, async (client) =>
        client.getMarkPrice(symbol)
      );
    }
  }

  async getRecentTrades(symbol: string, limit?: number): Promise<TradeData[]> {
    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      return await this.withTimeout(
        client.getRecentTrades(symbol, limit),
        this.config.dataTimeout
      );
    } catch (error) {
      console.warn(`Failed to get trades from ${this.currentExchange}: ${error}`);

      // Try fallback exchanges for trades
      for (const exchange of this.activeExchanges) {
        if (exchange === this.currentExchange) continue;
        const client = this.exchanges.get(exchange);
        if (client) {
          try {
            return await client.getRecentTrades(symbol, limit);
          } catch (e) {
            continue;
          }
        }
      }

      throw error;
    }
  }

  async getOpenInterest(symbol: string): Promise<{ symbol: string; openInterest: string }> {
    try {
      const client = this.exchanges.get(this.currentExchange);
      if (!client) throw new Error(`No client for ${this.currentExchange}`);

      return await this.withTimeout(
        client.getOpenInterest(symbol),
        this.config.dataTimeout
      );
    } catch (error) {
      console.warn(`Failed to get OI from ${this.currentExchange}: ${error}`);

      for (const exchange of this.activeExchanges) {
        if (exchange === this.currentExchange) continue;
        const client = this.exchanges.get(exchange);
        if (client) {
          try {
            return await client.getOpenInterest(symbol);
          } catch (e) {
            continue;
          }
        }
      }

      throw error;
    }
  }

  // ============================================================================
  // Account Data Methods
  // ============================================================================

  async getAccount(): Promise<Account> {
    const client = this.exchanges.get(this.currentTradingExchange);
    if (!client) throw new Error(`No client for ${this.currentTradingExchange}`);

    try {
      const data = await this.withTimeout(
        client.getAccount(),
        this.config.accountDataTimeout
      );

      this.cache.account = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      console.warn(`Failed to get account from trading exchange: ${error}`);

      // Cannot fallback for account data (wrong account!)
      // Use cached if available
      if (this.cache.account && this.cache.account.timestamp > Date.now() - 60000) {
        console.warn('Using cached account data (>60s old)');
        return this.cache.account.data;
      }

      throw error;
    }
  }

  async getBalance(): Promise<AccountBalance[]> {
    const account = await this.getAccount();
    return account.balances;
  }

  async getPositions(): Promise<Position[]> {
    const account = await this.getAccount();
    return account.positions;
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async placeOrder(params: PlaceOrderParams): Promise<Order> {
    const client = this.exchanges.get(this.currentTradingExchange);
    if (!client) throw new Error(`No client for ${this.currentTradingExchange}`);

    return client.placeOrder(params);
  }

  async cancelOrder(symbol: string, orderId: string | number): Promise<Order> {
    const client = this.exchanges.get(this.currentTradingExchange);
    if (!client) throw new Error(`No client for ${this.currentTradingExchange}`);

    return client.cancelOrder(symbol, orderId);
  }

  // ============================================================================
  // WebSocket Subscriptions
  // ============================================================================

  subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (data: KlineData) => void
  ): string {
    const client = this.exchanges.get(this.currentExchange);
    if (!client) throw new Error(`No client for ${this.currentExchange}`);

    return client.subscribeToKlines(symbol, interval, callback);
  }

  subscribeToDepth(symbol: string, callback: (data: OrderBook) => void): string {
    const client = this.exchanges.get(this.currentExchange);
    if (!client) throw new Error(`No client for ${this.currentExchange}`);

    return client.subscribeToDepth(symbol, callback);
  }

  subscribeToTicker(symbol: string, callback: (data: TickerData) => void): string {
    const client = this.exchanges.get(this.currentExchange);
    if (!client) throw new Error(`No client for ${this.currentExchange}`);

    return client.subscribeToTicker(symbol, callback);
  }

  // ============================================================================
  // Status & Health
  // ============================================================================

  getHealth(exchange?: ExchangeName): ExchangeHealth | Map<ExchangeName, ExchangeHealth> {
    if (exchange) {
      const health = this.health.get(exchange);
      if (!health) throw new Error(`Unknown exchange: ${exchange}`);
      return health;
    }
    return this.health;
  }

  getDataFreshness(): DataFreshness {
    return {
      kline: this.getDataAge('klines'),
      depth: this.getDataAge('depth'),
      ticker: this.getDataAge('ticker'),
      account: { age: this.cache.account?.timestamp ? Date.now() - this.cache.account.timestamp : Infinity, source: this.currentExchange },
      fundingRate: this.getDataAge('fundingRate'),
      markPrice: this.getDataAge('markPrice'),
    };
  }

  getCurrentExchange(): ExchangeName {
    return this.currentExchange;
  }

  getCurrentTradingExchange(): ExchangeName {
    return this.currentTradingExchange;
  }

  setTradingExchange(exchange: ExchangeName): void {
    if (!this.activeExchanges.includes(exchange)) {
      throw new Error(`Unsupported exchange: ${exchange}`);
    }
    this.currentTradingExchange = exchange;
    this.emit('tradingExchangeChanged', { exchange });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  private async tryFallbackOrCache<T>(
    cacheType: keyof ExchangeCache,
    cacheKey: string,
    fetcher: (client: IExchangeClient) => Promise<T>
  ): Promise<T> {
    // Try fallback exchanges
    for (const exchange of this.activeExchanges) {
      if (exchange === this.currentExchange) continue;

      const client = this.exchanges.get(exchange);
      if (!client) continue;

      try {
        const data = await this.withTimeout(fetcher(client), this.config.dataTimeout);
        return data;
      } catch (error) {
        continue;
      }
    }

    // Use cache if available
    const cache = this.cache[cacheType as keyof typeof this.cache] as any;
    const cached = cache.get(cacheKey);

    if (cached && cached.timestamp > Date.now() - this.config.cacheMaxAge) {
      console.warn(`Using cached ${cacheType} data`);
      return cached.data;
    }

    throw new Error(`All exchanges failed and no cache available for ${cacheKey}`);
  }

  private getDataAge(cacheType: keyof Omit<ExchangeCache, 'account'>): { age: number; source: ExchangeName } {
    const cache = this.cache[cacheType];
    if (cache instanceof Map && cache.size > 0) {
      let newest: any = null;
      cache.forEach((entry: any) => {
        if (!newest || entry.timestamp > newest.timestamp) {
          newest = entry;
        }
      });
      if (newest) {
        return { age: Date.now() - newest.timestamp, source: this.currentExchange };
      }
    }
    return { age: Infinity, source: this.currentExchange };
  }

  // ============================================================================
  // Event Emitter
  // ============================================================================

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  updateHealth(exchange: ExchangeName, partial: Partial<ExchangeHealth>): void {
    const health = this.health.get(exchange);
    if (health) {
      Object.assign(health, partial);
    }
  }
}

// Singleton instance
let exchangeManager: ExchangeManager | null = null;

export function getExchangeManager(): ExchangeManager {
  if (!exchangeManager) {
    exchangeManager = new ExchangeManager();
  }
  return exchangeManager;
}
