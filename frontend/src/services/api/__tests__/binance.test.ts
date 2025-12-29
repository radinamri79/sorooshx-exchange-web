import { getBinanceKlines, getBinanceDepth, getBinanceExchangeInfo } from '../binance';

describe('Binance API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBinanceKlines', () => {
    it('should fetch klines data successfully', async () => {
      const mockData = {
        data: [
          [1234567890, '97500', '98000', '97000', '97500', '100'],
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await getBinanceKlines('BTCUSDT', '1h');
      expect(result).toEqual(mockData.data);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(getBinanceKlines('BTCUSDT', '1h')).rejects.toThrow('Network error');
    });

    it('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(getBinanceKlines('BTCUSDT', '1h')).rejects.toThrow();
    });
  });

  describe('getBinanceDepth', () => {
    it('should fetch orderbook depth successfully', async () => {
      const mockData = {
        bids: [['97400', '10.5']],
        asks: [['97500', '12.2']],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await getBinanceDepth('BTCUSDT');
      expect(result).toEqual(mockData);
    });
  });

  describe('getBinanceExchangeInfo', () => {
    it('should fetch exchange info successfully', async () => {
      const mockData = {
        symbols: [
          { symbol: 'BTCUSDT', status: 'TRADING' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await getBinanceExchangeInfo();
      expect(result).toEqual(mockData.symbols);
    });
  });
});
