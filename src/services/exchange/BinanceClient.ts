/**
 * Binance Futures API Client
 * Tier 1 (Primary) - Best real-time data, <100ms latency
 * Supports: Klines, Depth, Ticker, Account, Orders, WebSocket
 */

import Decimal from 'decimal.js';
import {
  IExchangeClient,
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
  Trade,
  PlaceOrderParams,
  AccountUpdateEvent,
  OrderUpdateEvent,
} from '@/types/exchange';

interface WebSocketConnection {
  ws?: WebSocket;
  isConnected: boolean;
  isConnecting: boolean;
  subscriptions: Map<string, (data: any) => void>;
  lastMessageTime: number;
  pingInterval?: NodeJS.Timeout;
}

export class BinanceClient implements IExchangeClient {
  private baseUrl = 'https://fapi.binance.com';
  private wsUrl = 'wss://stream.binance.com:9443/ws';
  private publicWs: WebSocketConnection = {
    isConnected: false,
    isConnecting: false,
    subscriptions: new Map(),
    lastMessageTime: 0,
  };
  private privateWs: WebSocketConnection = {
    isConnected: false,
    isConnecting: false,
    subscriptions: new Map(),
    lastMessageTime: 0,
  };

  private apiKey: string;
  private apiSecret: string;
  private listenKey: string | null = null;
  private listenKeyRefreshInterval: NodeJS.Timeout | null = null;

  private orderBook: Map<string, OrderBook> = new Map();
  private latency = 0;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_BINANCE_API_KEY || '';
    this.apiSecret = apiSecret || process.env.BINANCE_API_SECRET || '';
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    try {
      // For private endpoints, get ListenKey
      if (this.apiKey && this.apiSecret) {
        await this.getListenKey();
        this.setupListenKeyRefresh();
      }

      // Connect to public WebSocket
      this.connectPublicWebSocket();

      // Connect to private WebSocket if credentials available
      if (this.listenKey) {
        this.connectPrivateWebSocket();
      }
    } catch (error) {
      console.error('Binance connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.closeWebSocket(this.publicWs);
    this.closeWebSocket(this.privateWs);

    if (this.listenKeyRefreshInterval) {
      clearInterval(this.listenKeyRefreshInterval);
    }

    if (this.listenKey && this.apiKey) {
      try {
        await fetch(`${this.baseUrl}/fapi/v1/listenKey`, {
          method: 'DELETE',
          headers: { 'X-MBX-APIKEY': this.apiKey },
        });
      } catch (error) {
        console.error('Error closing ListenKey:', error);
      }
    }
  }

  isConnected(): boolean {
    return this.publicWs.isConnected;
  }

  // ============================================================================
  // REST API Methods - Market Data
  // ============================================================================

  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 100
  ): Promise<KlineData[]> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      interval,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/klines?${params}`);
    if (!response.ok) throw new Error(`Binance klines error: ${response.statusText}`);

    const data = await response.json();
    return data.map((k: any) => ({
      symbol: symbol.toUpperCase(),
      timestamp: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[7],
      quoteVolume: k[7],
      trades: k[8],
      buyBaseVolume: k[9],
      buyQuoteVolume: k[10],
      isFinal: true,
    }));
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/depth?${params}`);
    if (!response.ok) throw new Error(`Binance depth error: ${response.statusText}`);

    const data = await response.json();
    return {
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
      bids: data.bids.map((b: [string, string]) => ({
        price: b[0],
        quantity: b[1],
      })),
      asks: data.asks.map((a: [string, string]) => ({
        price: a[0],
        quantity: a[1],
      })),
      lastUpdateId: data.lastUpdateId,
    };
  }

  async getTicker(symbol: string): Promise<TickerData> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/ticker/24hr?${params}`);
    if (!response.ok) throw new Error(`Binance ticker error: ${response.statusText}`);

    const data = await response.json();
    return {
      symbol: symbol.toUpperCase(),
      lastPrice: data.lastPrice,
      priceChange: data.priceChange,
      priceChangePercent: data.priceChangePercent,
      highPrice: data.highPrice,
      lowPrice: data.lowPrice,
      quoteVolume: data.quoteAssetVolume,
      baseVolume: data.volume,
      bidPrice: data.bidPrice,
      bidQuantity: data.bidQty,
      askPrice: data.askPrice,
      askQuantity: data.askQty,
      timestamp: Date.now(),
    };
  }

  async getFundingRate(symbol: string): Promise<FundingRateData> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/premiumIndex?${params}`);
    if (!response.ok) throw new Error(`Binance funding rate error: ${response.statusText}`);

    const data = await response.json();
    return {
      symbol: symbol.toUpperCase(),
      fundingRate: data.lastFundingRate,
      fundingTime: data.nextFundingTime,
      markPrice: data.markPrice,
      indexPrice: data.indexPrice,
    };
  }

  async getMarkPrice(symbol: string): Promise<MarkPriceData> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/premiumIndex?${params}`);
    if (!response.ok) throw new Error(`Binance mark price error: ${response.statusText}`);

    const data = await response.json();
    return {
      symbol: symbol.toUpperCase(),
      markPrice: data.markPrice,
      indexPrice: data.indexPrice,
      timestamp: Date.now(),
      estimatedSettlePrice: data.estimatedSettlePrice,
    };
  }

  async getRecentTrades(symbol: string, limit: number = 100): Promise<TradeData[]> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/aggTrades?${params}`);
    if (!response.ok) throw new Error(`Binance trades error: ${response.statusText}`);

    const data = await response.json();
    return data.map((t: any) => ({
      symbol: symbol.toUpperCase(),
      tradeId: t.a,
      price: t.p,
      quantity: t.q,
      quoteQuantity: new Decimal(t.p).times(t.q).toString(),
      time: t.T,
      isBuyerMaker: t.m,
    }));
  }

  async getOpenInterest(symbol: string): Promise<{ symbol: string; openInterest: string }> {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
    });

    const response = await fetch(`${this.baseUrl}/fapi/v1/openInterest?${params}`);
    if (!response.ok) throw new Error(`Binance open interest error: ${response.statusText}`);

    const data = await response.json();
    return {
      symbol: symbol.toUpperCase(),
      openInterest: data.openInterest,
    };
  }

  // ============================================================================
  // REST API Methods - Account & Position
  // ============================================================================

  async getAccount(): Promise<Account> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required for account data');
    }

    const response = await this.makeAuthenticatedRequest('GET', '/fapi/v2/account');
    const data = await response.json();

    return {
      totalBalance: data.totalWalletBalance,
      totalUnrealizedProfit: data.totalUnrealizedProfit,
      totalMarginUsed: data.totalMarginUsed,
      totalCollateral: data.totalCollateral,
      availableBalance: data.availableBalance,
      balances: data.assets.map((a: any) => ({
        asset: a.asset,
        balance: a.walletBalance,
        availableBalance: a.availableBalance,
        locked: a.lockedBalance,
      })),
      positions: data.positions
        .filter((p: any) => parseFloat(p.positionAmt) !== 0)
        .map((p: any) => ({
          symbol: p.symbol,
          positionSide: p.positionSide,
          quantity: p.positionAmt,
          entryPrice: p.entryPrice,
          markPrice: p.markPrice,
          liquidationPrice: p.liquidationPrice,
          unrealizedProfit: p.unrealizedProfit,
          margin: p.isolatedCreated
            ? p.isolatedWallet
            : new Decimal(p.positionAmt).abs().times(p.markPrice).dividedBy(p.leverage).toString(),
          marginType: p.marginType.toLowerCase(),
          leverage: p.leverage,
          riskRate: p.riskRate,
          isolatedCreated: p.isolatedCreated,
          updateTime: p.updateTime,
        })),
      timestamp: Date.now(),
      updateTime: data.updateTime,
    };
  }

  async getBalance(): Promise<AccountBalance[]> {
    const account = await this.getAccount();
    return account.balances;
  }

  async getPositions(): Promise<Position[]> {
    const account = await this.getAccount();
    return account.positions;
  }

  async getOrders(symbol?: string): Promise<Order[]> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required for order data');
    }

    const params = new URLSearchParams({ limit: '100' });
    if (symbol) params.append('symbol', symbol.toUpperCase());

    const response = await this.makeAuthenticatedRequest('GET', `/fapi/v1/allOrders?${params}`);
    const data = await response.json();

    return data.map((o: any) => ({
      orderId: o.orderId,
      clientOrderId: o.clientOrderId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      quantity: o.origQty,
      price: o.price,
      stopPrice: o.stopPrice,
      executedQuantity: o.executedQty,
      cumulativeQuoteQuantity: o.cumulativeQuoteQty,
      status: o.status,
      timeInForce: o.timeInForce,
      updateTime: o.updateTime,
      createTime: o.time,
      avgPrice: o.avgPrice,
    }));
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required for order data');
    }

    const params = new URLSearchParams();
    if (symbol) params.append('symbol', symbol.toUpperCase());

    const response = await this.makeAuthenticatedRequest('GET', `/fapi/v1/openOrders?${params}`);
    const data = await response.json();

    return data.map((o: any) => ({
      orderId: o.orderId,
      clientOrderId: o.clientOrderId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      quantity: o.origQty,
      price: o.price,
      stopPrice: o.stopPrice,
      executedQuantity: o.executedQty,
      cumulativeQuoteQuantity: o.cumulativeQuoteQty,
      status: o.status,
      timeInForce: o.timeInForce,
      updateTime: o.updateTime,
      createTime: o.time,
      avgPrice: o.avgPrice,
    }));
  }

  async getTrades(symbol?: string): Promise<Trade[]> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required for trade data');
    }

    const params = new URLSearchParams({ limit: '100' });
    if (symbol) params.append('symbol', symbol.toUpperCase());

    const response = await this.makeAuthenticatedRequest('GET', `/fapi/v1/userTrades?${params}`);
    const data = await response.json();

    return data.map((t: any) => ({
      symbol: t.symbol,
      tradeId: t.id,
      orderId: t.orderId,
      side: t.side,
      price: t.price,
      quantity: t.qty,
      commission: t.commission,
      commissionAsset: t.commissionAsset,
      time: t.time,
      positionSide: t.positionSide,
      realizedPnl: t.realizedPnl,
    }));
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async placeOrder(params: PlaceOrderParams): Promise<Order> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to place orders');
    }

    const orderParams = new URLSearchParams({
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    });

    if (params.price) orderParams.append('price', params.price);
    if (params.stopPrice) orderParams.append('stopPrice', params.stopPrice);
    if (params.callbackRate) orderParams.append('callbackRate', params.callbackRate);
    if (params.timeInForce) orderParams.append('timeInForce', params.timeInForce);
    if (params.positionSide) orderParams.append('positionSide', params.positionSide);
    if (params.closePosition) orderParams.append('closePosition', 'true');

    const response = await this.makeAuthenticatedRequest('POST', `/fapi/v1/order?${orderParams}`);
    const data = await response.json();

    return {
      orderId: data.orderId,
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: data.origQty,
      price: data.price,
      stopPrice: data.stopPrice,
      executedQuantity: data.executedQty,
      cumulativeQuoteQuantity: data.cumulativeQuoteQty,
      status: data.status,
      timeInForce: data.timeInForce,
      updateTime: data.updateTime,
      createTime: data.time,
    };
  }

  async cancelOrder(symbol: string, orderId: string | number): Promise<Order> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to cancel orders');
    }

    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      orderId: orderId.toString(),
    });

    const response = await this.makeAuthenticatedRequest('DELETE', `/fapi/v1/order?${params}`);
    const data = await response.json();

    return {
      orderId: data.orderId,
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      side: data.side,
      type: data.type,
      quantity: data.origQty,
      price: data.price,
      stopPrice: data.stopPrice,
      executedQuantity: data.executedQty,
      cumulativeQuoteQuantity: data.cumulativeQuoteQty,
      status: data.status,
      updateTime: data.updateTime,
      createTime: data.time,
    };
  }

  async cancelAllOrders(symbol: string): Promise<Order[]> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required to cancel orders');
    }

    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
    });

    const response = await this.makeAuthenticatedRequest('DELETE', `/fapi/v1/allOpenOrders?${params}`);
    const data = await response.json();

    return data.map((o: any) => ({
      orderId: o.orderId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      quantity: o.origQty,
      price: o.price,
      status: o.status,
      updateTime: o.updateTime,
      createTime: o.time,
    }));
  }

  async modifyOrder(
    symbol: string,
    orderId: string | number,
    params: Partial<PlaceOrderParams>
  ): Promise<Order> {
    // Cancel and re-place (Binance PUT /order may not be available in older versions)
    await this.cancelOrder(symbol, orderId);
    return this.placeOrder({
      symbol,
      side: params.side!,
      type: params.type!,
      quantity: params.quantity!,
      price: params.price,
      stopPrice: params.stopPrice,
      timeInForce: params.timeInForce,
    });
  }

  // ============================================================================
  // WebSocket Subscriptions - Public
  // ============================================================================

  subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (data: KlineData) => void
  ): string {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const subscriptionId = `kline_${symbol}_${interval}_${Date.now()}`;

    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === 'kline') {
          const k = message.k;
          callback({
            symbol: symbol.toUpperCase(),
            timestamp: k.t,
            open: k.o,
            high: k.h,
            low: k.l,
            close: k.c,
            volume: k.v,
            quoteVolume: k.q,
            trades: k.n,
            buyBaseVolume: k.V,
            buyQuoteVolume: k.Q,
            isFinal: k.x,
          });
        }
      } catch (error) {
        console.error('Error processing kline:', error);
      }
    };

    this.subscribePublicStream(stream, subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  subscribeToDepth(symbol: string, callback: (data: OrderBook) => void): string {
    const stream = `${symbol.toLowerCase()}@depth@100ms`;
    const subscriptionId = `depth_${symbol}_${Date.now()}`;

    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (!Array.isArray(message)) {
          // Delta update
          const book = this.orderBook.get(symbol);
          if (book && message.U <= book.lastUpdateId + 1 && message.u >= book.lastUpdateId) {
            // Apply deltas
            if (message.b && Array.isArray(message.b)) {
              message.b.forEach((bid: [string, string]) => {
                const idx = book.bids.findIndex(b => b.price === bid[0]);
                if (bid[1] === '0') {
                  if (idx !== -1) book.bids.splice(idx, 1);
                } else {
                  if (idx !== -1) {
                    book.bids[idx]!.quantity = bid[1];
                  } else {
                    book.bids.push({ price: bid[0], quantity: bid[1] });
                  }
                }
              });
            }
            if (message.a && Array.isArray(message.a)) {
              message.a.forEach((ask: [string, string]) => {
                const idx = book.asks.findIndex(a => a.price === ask[0]);
                if (ask[1] === '0') {
                  if (idx !== -1) book.asks.splice(idx, 1);
                } else {
                  if (idx !== -1) {
                    book.asks[idx]!.quantity = ask[1];
                  } else {
                    book.asks.push({ price: ask[0], quantity: ask[1] });
                  }
                }
              });
            }
            book.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            book.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            book.lastUpdateId = message.u;
            book.timestamp = Date.now();
            callback(book);
          }
        }
      } catch (error) {
        console.error('Error processing depth:', error);
      }
    };

    this.subscribePublicStream(stream, subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  subscribeToTicker(symbol: string, callback: (data: TickerData) => void): string {
    const stream = `${symbol.toLowerCase()}@ticker`;
    const subscriptionId = `ticker_${symbol}_${Date.now()}`;

    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === '24hrTicker') {
          callback({
            symbol: symbol.toUpperCase(),
            lastPrice: message.c,
            priceChange: message.p,
            priceChangePercent: message.P,
            highPrice: message.h,
            lowPrice: message.l,
            quoteVolume: message.q,
            baseVolume: message.v,
            bidPrice: message.b,
            bidQuantity: message.B,
            askPrice: message.a,
            askQuantity: message.A,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error processing ticker:', error);
      }
    };

    this.subscribePublicStream(stream, subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  subscribeToTrades(symbol: string, callback: (data: TradeData) => void): string {
    const stream = `${symbol.toLowerCase()}@aggTrade`;
    const subscriptionId = `trade_${symbol}_${Date.now()}`;

    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === 'aggTrade') {
          callback({
            symbol: symbol.toUpperCase(),
            tradeId: message.a.toString(),
            price: message.p,
            quantity: message.q,
            quoteQuantity: message.q,
            time: message.T,
            isBuyerMaker: message.m,
          });
        }
      } catch (error) {
        console.error('Error processing trade:', error);
      }
    };

    this.subscribePublicStream(stream, subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  subscribeToMarkPrice(symbol: string, callback: (data: MarkPriceData) => void): string {
    const stream = `${symbol.toLowerCase()}@markPrice`;
    const subscriptionId = `markPrice_${symbol}_${Date.now()}`;

    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === 'markPriceUpdate') {
          callback({
            symbol: symbol.toUpperCase(),
            markPrice: message.p,
            indexPrice: message.i,
            timestamp: message.E,
          });
        }
      } catch (error) {
        console.error('Error processing mark price:', error);
      }
    };

    this.subscribePublicStream(stream, subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  // ============================================================================
  // WebSocket Subscriptions - Private
  // ============================================================================

  subscribeToAccount(callback: (data: AccountUpdateEvent) => void): string {
    if (!this.listenKey) {
      throw new Error('ListenKey not available');
    }

    const subscriptionId = `account_${Date.now()}`;
    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === 'ACCOUNT_UPDATE') {
          callback({
            balances: message.a.B.map((b: any) => ({
              asset: b.a,
              balance: b.wb,
              availableBalance: b.cw,
              locked: b.cw === b.wb ? '0' : new Decimal(b.wb).minus(b.cw).toString(),
            })),
            positions: message.a.P.filter((p: any) => p.ps !== 'BOTH').map((p: any) => ({
              symbol: p.s,
              positionSide: p.ps,
              quantity: p.pa,
              entryPrice: p.ep,
              markPrice: p.mp,
              liquidationPrice: p.lp,
              unrealizedProfit: p.up,
              margin: p.iw,
              marginType: p.mt,
              leverage: p.l,
              riskRate: p.ir,
              updateTime: message.E,
            })),
            timestamp: message.E,
          });
        }
      } catch (error) {
        console.error('Error processing account update:', error);
      }
    };

    this.subscribePrivateStream(subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  subscribeToOrders(callback: (data: OrderUpdateEvent) => void): string {
    if (!this.listenKey) {
      throw new Error('ListenKey not available');
    }

    const subscriptionId = `order_${Date.now()}`;
    const wrappedCallback = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.e === 'ORDER_TRADE_UPDATE') {
          const o = message.o;
          callback({
            order: {
              orderId: o.i,
              clientOrderId: o.c,
              symbol: o.s,
              side: o.S,
              type: o.o,
              quantity: o.q,
              price: o.p,
              stopPrice: o.sp,
              executedQuantity: o.z,
              cumulativeQuoteQuantity: o.Z,
              status: o.X,
              timeInForce: o.f,
              updateTime: o.T,
              createTime: o.T,
            },
            fills: o.l ? [{ price: o.L, quantity: o.l, commission: o.n, commissionAsset: o.N }] : undefined,
            timestamp: message.E,
          });
        }
      } catch (error) {
        console.error('Error processing order update:', error);
      }
    };

    this.subscribePrivateStream(subscriptionId, wrappedCallback);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.publicWs.subscriptions.delete(subscriptionId);
    this.privateWs.subscriptions.delete(subscriptionId);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async ping(): Promise<number> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/fapi/v1/ping`);
      if (!response.ok) throw new Error(`Ping failed: ${response.statusText}`);
      this.latency = Date.now() - startTime;
      return this.latency;
    } catch (error) {
      console.error('Ping error:', error);
      return -1;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getListenKey(): Promise<void> {
    if (!this.apiKey) throw new Error('API key required');

    const response = await fetch(`${this.baseUrl}/fapi/v1/listenKey`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });

    if (!response.ok) throw new Error(`Failed to get ListenKey: ${response.statusText}`);

    const data = await response.json();
    this.listenKey = data.listenKey;
  }

  private setupListenKeyRefresh(): void {
    this.listenKeyRefreshInterval = setInterval(async () => {
      try {
        if (this.listenKey && this.apiKey) {
          const response = await fetch(`${this.baseUrl}/fapi/v1/listenKey`, {
            method: 'PUT',
            headers: { 'X-MBX-APIKEY': this.apiKey },
          });

          if (!response.ok) {
            console.error('Failed to refresh ListenKey');
            await this.getListenKey();
          }
        }
      } catch (error) {
        console.error('Error refreshing ListenKey:', error);
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes
  }

  private makeAuthenticatedRequest(
    method: string,
    endpoint: string
  ): Promise<Response> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials required');
    }

    const timestamp = Date.now().toString();
    const signature = this.generateSignature(endpoint, timestamp);
    const url = `${this.baseUrl}${endpoint}&timestamp=${timestamp}&signature=${signature}`;

    return fetch(url, {
      method,
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });
  }

  private generateSignature(_queryString: string, _timestamp: string): string {
    // Implement HMAC-SHA256 signature
    // For now, returning placeholder - implement with crypto-js or similar
    return '';
  }

  private connectPublicWebSocket(): void {
    if (this.publicWs.isConnecting || this.publicWs.isConnected) return;

    this.publicWs.isConnecting = true;

    try {
      this.publicWs.ws = new WebSocket(this.wsUrl);

      this.publicWs.ws.onopen = () => {
        this.publicWs.isConnected = true;
        this.publicWs.isConnecting = false;
        this.setupWebSocketPing(this.publicWs);
        console.log('Binance public WebSocket connected');
      };

      this.publicWs.ws.onmessage = (event: MessageEvent) => {
        this.publicWs.lastMessageTime = Date.now();
        // Dispatch to subscribed callbacks
        this.publicWs.subscriptions.forEach((callback) => {
          callback(event);
        });
      };

      this.publicWs.ws.onerror = (error) => {
        console.error('Binance public WebSocket error:', error);
      };

      this.publicWs.ws.onclose = () => {
        this.publicWs.isConnected = false;
        this.publicWs.isConnecting = false;
        // Attempt reconnection
        setTimeout(() => this.connectPublicWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Error connecting to Binance public WebSocket:', error);
      this.publicWs.isConnecting = false;
    }
  }

  private connectPrivateWebSocket(): void {
    if (!this.listenKey || this.privateWs.isConnecting || this.privateWs.isConnected) return;

    this.privateWs.isConnecting = true;

    try {
      this.privateWs.ws = new WebSocket(`${this.wsUrl}/${this.listenKey}`);

      this.privateWs.ws.onopen = () => {
        this.privateWs.isConnected = true;
        this.privateWs.isConnecting = false;
        this.setupWebSocketPing(this.privateWs);
        console.log('Binance private WebSocket connected');
      };

      this.privateWs.ws.onmessage = (event: MessageEvent) => {
        this.privateWs.lastMessageTime = Date.now();
        this.privateWs.subscriptions.forEach((callback) => {
          callback(event);
        });
      };

      this.privateWs.ws.onerror = (error) => {
        console.error('Binance private WebSocket error:', error);
      };

      this.privateWs.ws.onclose = () => {
        this.privateWs.isConnected = false;
        this.privateWs.isConnecting = false;
        setTimeout(() => this.connectPrivateWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Error connecting to Binance private WebSocket:', error);
      this.privateWs.isConnecting = false;
    }
  }

  private subscribePublicStream(
    _stream: string,
    subscriptionId: string,
    callback: (event: MessageEvent) => void
  ): void {
    // Subscribe to stream via WebSocket
    // Implementation depends on Binance API format
    this.publicWs.subscriptions.set(subscriptionId, callback);
  }

  private subscribePrivateStream(
    subscriptionId: string,
    callback: (event: MessageEvent) => void
  ): void {
    this.privateWs.subscriptions.set(subscriptionId, callback);
  }

  private setupWebSocketPing(ws: WebSocketConnection): void {
    if (ws.pingInterval) clearInterval(ws.pingInterval);

    ws.pingInterval = setInterval(() => {
      if (ws.ws && ws.isConnected) {
        // Binance WebSocket handles ping automatically
        // But we can implement health check via timeout
        const now = Date.now();
        if (now - ws.lastMessageTime > 10 * 60 * 1000) {
          // No message for 10 minutes
          console.warn('WebSocket inactive, reconnecting...');
          this.closeWebSocket(ws);
        }
      }
    }, 3 * 60 * 1000); // Check every 3 minutes
  }

  private closeWebSocket(ws: WebSocketConnection): void {
    if (ws.pingInterval) {
      clearInterval(ws.pingInterval);
    }

    if (ws.ws) {
      ws.ws.close();
      ws.ws = undefined;
    }

    ws.isConnected = false;
    ws.isConnecting = false;
    ws.subscriptions.clear();
  }
}
