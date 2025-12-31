/**
 * OKX Futures API Client - Tier 3 Fallback Exchange
 * Phase 4: Multi-exchange client implementation
 * 
 * https://www.okx.com/docs-v5/en/
 * $16.8B volume, <200ms latency, institutional features
 */

import Decimal from 'decimal.js';
import {
  IExchangeClient,
  KlineData,
  OrderBook,
  TickerData,
  FundingRateData,
  MarkPriceData,
  Account,
  Position,
  Order,
  PlaceOrderParams,
  TradeData,
  Trade,
  AccountUpdateEvent,
  OrderUpdateEvent,
  AccountBalance,
} from '@/types/exchange';

export class OKXClient implements IExchangeClient {
  private baseUrl = 'https://www.okx.com/api/v5';
  private wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
  private ws: WebSocket | null = null;
  private _connected = false;
  private subscriptions: Map<string, Function> = new Map();
  private apiKey?: string;
  private apiSecret?: string;
  private passphrase?: string;

  constructor(apiKey?: string, apiSecret?: string, passphrase?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    this.connectPublicWebSocket();
    this._connected = true;
    console.log('OKX client connected');
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this._connected;
  }

  // ============================================================================
  // REST API - Market Data
  // ============================================================================

  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 100
  ): Promise<KlineData[]> {
    const bar = this.mapInterval(interval);
    const url = `${this.baseUrl}/market/candles?instId=${symbol}&bar=${bar}&limit=${limit}`;

    const data = await this.fetchPublic(url);
    return data.data.map((item: any) => ({
      time: parseInt(item[0]),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
      quoteAssetVolume: item[7],
      numberOfTrades: 0,
      takerBuyBaseAssetVolume: item[6],
      takerBuyQuoteAssetVolume: '0',
      isFinal: true,
      timestamp: parseInt(item[0]),
    }));
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    const url = `${this.baseUrl}/market/books?instId=${symbol}&sz=${limit}`;
    const data = await this.fetchPublic(url);

    const book = data.data[0];
    return {
      symbol,
      bids: book.bids.map((bid: any) => ({
        price: bid[0],
        quantity: bid[1],
      })),
      asks: book.asks.map((ask: any) => ({
        price: ask[0],
        quantity: ask[1],
      })),
      timestamp: parseInt(book.ts),
      lastUpdateId: parseInt(book.seqId || 0),
    };
  }

  async getTicker(symbol: string): Promise<TickerData> {
    const url = `${this.baseUrl}/market/ticker?instId=${symbol}`;
    const data = await this.fetchPublic(url);
    const ticker = data.data[0];

    return {
      symbol,
      lastPrice: ticker.last,
      priceChange: new Decimal(ticker.last || 0)
        .minus(ticker.open24h || 0)
        .toString(),
      priceChangePercent: ticker.pricePcnt,
      highPrice: ticker.high24h,
      lowPrice: ticker.low24h,
      quoteVolume: ticker.volCcy24h || '0',
      baseVolume: ticker.vol24h || '0',
      bidPrice: ticker.bidPx,
      bidQuantity: ticker.bidSz,
      askPrice: ticker.askPx,
      askQuantity: ticker.askSz,
      timestamp: parseInt(ticker.ts),
    };
  }

  async getFundingRate(symbol: string): Promise<FundingRateData> {
    const url = `${this.baseUrl}/market/funding-rate-history?instId=${symbol}&limit=1`;
    const data = await this.fetchPublic(url);
    const latest = data.data[0];

    return {
      symbol,
      fundingRate: latest.fundingRate,
      fundingTime: parseInt(latest.fundingTime),
      markPrice: latest.markPx,
      indexPrice: latest.indexPx,
    };
  }

  async getMarkPrice(symbol: string): Promise<MarkPriceData> {
    const url = `${this.baseUrl}/market/mark-price?instId=${symbol}`;
    const data = await this.fetchPublic(url);

    return {
      symbol,
      markPrice: data.data[0].markPx,
      indexPrice: data.data[0].idxPx,
      timestamp: Date.now(),
      estimatedSettlePrice: data.data[0].markPx,
    };
  }

  async getRecentTrades(_symbol: string, _limit: number = 30): Promise<TradeData[]> {
    return [];
  }

  async getOpenInterest(_symbol: string): Promise<{ symbol: string; openInterest: string }> {
    return { symbol: _symbol, openInterest: '0' };
  }

  // ============================================================================
  // REST API - Account
  // ============================================================================

  async getAccount(): Promise<Account> {
    const balance = await this.fetchPrivate(`${this.baseUrl}/account/balance`);
    const positions = await this.fetchPrivate(`${this.baseUrl}/account/positions?instType=FUTURES`);

    const balanceDetails = balance.data[0]?.details || [];
    const positionsData = positions.data || [];

    const balances: AccountBalance[] = balanceDetails.map((detail: any) => ({
      asset: detail.ccy,
      balance: detail.bal,
      availableBalance: detail.availBal,
      locked: new Decimal(detail.bal).minus(detail.availBal).toString(),
    }));

    const positionList: Position[] = positionsData.map((pos: any) => ({
      symbol: pos.instId,
      positionSide: pos.posSide === 'long' ? 'LONG' : 'SHORT',
      quantity: pos.pos,
      entryPrice: pos.avgPx,
      markPrice: pos.markPx,
      liquidationPrice: pos.liqPx,
      unrealizedProfit: pos.upl,
      margin: pos.imr,
      marginType: 'cross' as const,
      leverage: 1,
      riskRate: '0',
      updateTime: Date.now(),
    }));

    const totalMarginUsed = positionList.reduce(
      (sum: Decimal, pos: Position) => sum.plus(pos.margin || 0),
      new Decimal(0)
    ).toString();

    return {
      totalBalance: balance.data[0]?.totalEq || '0',
      totalUnrealizedProfit: positionList.reduce(
        (sum: Decimal, pos: Position) => sum.plus(pos.unrealizedProfit || 0),
        new Decimal(0)
      ).toString(),
      totalMarginUsed,
      totalCollateral: balance.data[0]?.totalEq || '0',
      availableBalance: balance.data[0]?.availEq || '0',
      balances,
      positions: positionList,
      timestamp: Date.now(),
      updateTime: Date.now(),
    };
  }

  async getBalance(): Promise<Account['balances']> {
    const account = await this.getAccount();
    return account.balances;
  }

  async getPositions(): Promise<Position[]> {
    const account = await this.getAccount();
    return account.positions;
  }

  async getOrders(_symbol?: string): Promise<Order[]> {
    return [];
  }

  async getOpenOrders(_symbol?: string): Promise<Order[]> {
    return [];
  }

  async getTrades(_symbol?: string): Promise<Trade[]> {
    return [];
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  async placeOrder(params: PlaceOrderParams): Promise<Order> {
    const payload = {
      instId: params.symbol,
      tdMode: 'isolated', // Isolated margin mode
      side: params.side === 'BUY' ? 'buy' : 'sell',
      posSide: 'long',
      ordType: this.mapOrderType(params.type),
      sz: params.quantity,
      px: params.type === 'LIMIT' ? params.price : undefined,
    };

    const response = await this.fetchPrivate(
      `${this.baseUrl}/trade/order`,
      'POST',
      payload
    );

    return {
      orderId: response.data[0].ordId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      price: params.price || '0',
      executedQuantity: '0',
      cumulativeQuoteQuantity: '0',
      status: 'NEW',
      updateTime: Date.now(),
      createTime: Date.now(),
    };
  }

  async cancelOrder(symbol: string, orderId: string | number): Promise<Order> {
    const payload = {
      instId: symbol,
      ordId: orderId,
    };

    const response = await this.fetchPrivate(
      `${this.baseUrl}/trade/cancel-order`,
      'POST',
      payload
    );

    return {
      orderId: response.data[0].ordId,
      symbol,
      side: 'BUY',
      type: 'LIMIT',
      quantity: '0',
      price: '0',
      executedQuantity: '0',
      cumulativeQuoteQuantity: '0',
      status: 'CANCELED',
      updateTime: Date.now(),
      createTime: Date.now(),
    };
  }

  async cancelAllOrders(_symbol: string): Promise<Order[]> {
    // OKX implementation - returns empty list
    return [];
  }

  async modifyOrder(
    _symbol: string,
    _orderId: string | number,
    _params: Partial<PlaceOrderParams>
  ): Promise<Order> {
    throw new Error('Not implemented');
  }

  // ============================================================================
  // WebSocket Subscriptions
  // ============================================================================

  subscribeToKlines(
    symbol: string,
    interval: string,
    callback: (data: KlineData) => void
  ): string {
    const subId = `klines_${symbol}_${interval}`;
    const mockCallback = () => {
      callback({
        symbol,
        open: '0',
        high: '0',
        low: '0',
        close: '0',
        volume: '0',
        quoteVolume: '0',
        trades: 0,
        buyBaseVolume: '0',
        buyQuoteVolume: '0',
        isFinal: true,
        timestamp: Date.now(),
      });
    };
    this.subscriptions.set(subId, mockCallback);
    return subId;
  }

  subscribeToDepth(symbol: string, callback: (data: OrderBook) => void): string {
    const subId = `depth_${symbol}`;
    const mockCallback = () => {
      callback({
        symbol,
        bids: [],
        asks: [],
        timestamp: Date.now(),
        lastUpdateId: 0,
      });
    };
    this.subscriptions.set(subId, mockCallback);
    return subId;
  }

  subscribeToTicker(symbol: string, callback: (data: TickerData) => void): string {
    const subId = `ticker_${symbol}`;
    const mockCallback = () => {
      callback({
        symbol,
        lastPrice: '0',
        priceChange: '0',
        priceChangePercent: '0',
        highPrice: '0',
        lowPrice: '0',
        quoteVolume: '0',
        baseVolume: '0',
        bidPrice: '0',
        bidQuantity: '0',
        askPrice: '0',
        askQuantity: '0',
        timestamp: Date.now(),
      });
    };
    this.subscriptions.set(subId, mockCallback);
    return subId;
  }

  subscribeToTrades(symbol: string, callback: (data: TradeData) => void): string {
    const subId = `trades_${symbol}`;
    const mockCallback = () => {
      callback({
        symbol,
        tradeId: '0',
        price: '0',
        quantity: '0',
        quoteQuantity: '0',
        time: Date.now(),
        isBuyerMaker: false,
      });
    };
    this.subscriptions.set(subId, mockCallback);
    return subId;
  }

  subscribeToMarkPrice(_symbol: string, callback: (data: MarkPriceData) => void): string {
    const subId = `markprice_${_symbol}`;
    callback({
      symbol: _symbol,
      markPrice: '0',
      indexPrice: '0',
      timestamp: Date.now(),
    });
    return subId;
  }

  subscribeToAccount(callback: (data: AccountUpdateEvent) => void): string {
    const subId = `account_${Date.now()}`;
    callback({
      type: 'ACCOUNT_UPDATE',
      balances: [],
      positions: [],
      timestamp: Date.now(),
    });
    return subId;
  }

  subscribeToOrders(callback: (data: OrderUpdateEvent) => void): string {
    const subId = `orders_${Date.now()}`;
    callback({
      type: 'ORDER_TRADE_UPDATE',
      orderId: '0',
      symbol: 'BTCUSDT',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: '0',
      price: '0',
      filledQuantity: '0',
      status: 'NEW',
      timestamp: Date.now(),
      fills: [],
    });
    return subId;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1H',
      '4h': '4H',
      '1d': '1D',
    };
    return intervalMap[interval] || '1m';
  }

  private mapOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      LIMIT: 'limit',
      MARKET: 'market',
      STOP_MARKET: 'stop',
      TAKE_PROFIT_MARKET: 'take-profit',
    };
    return typeMap[type] || 'limit';
  }

  private async fetchPublic(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== '0') throw new Error(data.msg);
    return data;
  }

  private async fetchPrivate(
    url: string,
    method: string = 'GET',
    payload?: any
  ): Promise<any> {
    if (!this.apiKey || !this.apiSecret || !this.passphrase) {
      throw new Error('API credentials not configured');
    }

    const timestamp = new Date().toISOString();
    const options: RequestInit = {
      method,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': 'signature',
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.passphrase,
      },
    };

    if (payload) {
      options.body = JSON.stringify(payload);
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== '0') throw new Error(data.msg);
    return data;
  }

  private connectPublicWebSocket(): void {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => console.log('OKX WS connected');
    this.ws.onerror = (error) => console.error('OKX WS error:', error);
    this.ws.onclose = () => {
      this._connected = false;
      setTimeout(() => this.connectPublicWebSocket(), 3000);
    };
  }

  async ping(): Promise<number> {
    const start = Date.now();
    await this.fetchPublic(`${this.baseUrl}/market/ticker?instId=BTC-USD-SWAP`);
    return Date.now() - start;
  }
}
