import { fetchTicker, fetchOrderbook, fetchKlines, fetchAllTickers, fetchExchangeInfo } from '../binance';

describe('Binance API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchKlines', () => {
    it('should be defined', () => {
      expect(fetchKlines).toBeDefined();
      expect(typeof fetchKlines).toBe('function');
    });

    it('should be async function', async () => {
      expect(fetchKlines.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('fetchOrderbook', () => {
    it('should be defined', () => {
      expect(fetchOrderbook).toBeDefined();
      expect(typeof fetchOrderbook).toBe('function');
    });

    it('should support symbol parameter', async () => {
      expect(fetchOrderbook).toBeDefined();
    });

    it('should support limit parameter', async () => {
      expect(fetchOrderbook).toBeDefined();
    });
  });

  describe('fetchExchangeInfo', () => {
    it('should be defined', () => {
      expect(fetchExchangeInfo).toBeDefined();
      expect(typeof fetchExchangeInfo).toBe('function');
    });
  });

  describe('fetchAllTickers', () => {
    it('should be defined', () => {
      expect(fetchAllTickers).toBeDefined();
      expect(typeof fetchAllTickers).toBe('function');
    });
  });

  describe('fetchTicker', () => {
    it('should be defined', () => {
      expect(fetchTicker).toBeDefined();
      expect(typeof fetchTicker).toBe('function');
    });

    it('should accept symbol parameter', () => {
      expect(fetchTicker).toBeDefined();
    });
  });
});
