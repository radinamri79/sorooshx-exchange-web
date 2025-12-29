import { render, screen } from '@testing-library/react';
import { MarketInfo } from '../MarketInfo';

describe('MarketInfo Component', () => {
  const mockMarketInfo = {
    symbol: 'BTCUSDT',
    lastPrice: '97500.00',
    priceChange: '2500.00',
    priceChangePercent: '2.63',
    highPrice: '98000.00',
    lowPrice: '95000.00',
    volume: '50000',
    quoteVolume: '4875000000',
  };

  it('should render market info', () => {
    render(<MarketInfo {...mockMarketInfo} />);
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('97500.00')).toBeInTheDocument();
  });

  it('should display price change', () => {
    render(<MarketInfo {...mockMarketInfo} />);
    expect(screen.getByText('+2500.00')).toBeInTheDocument();
  });

  it('should display price change percentage', () => {
    render(<MarketInfo {...mockMarketInfo} />);
    expect(screen.getByText('+2.63%')).toBeInTheDocument();
  });

  it('should display 24h high and low', () => {
    render(<MarketInfo {...mockMarketInfo} />);
    expect(screen.getByText('98000.00')).toBeInTheDocument();
    expect(screen.getByText('95000.00')).toBeInTheDocument();
  });

  it('should display volume information', () => {
    render(<MarketInfo {...mockMarketInfo} />);
    expect(screen.getByText(/volume/i)).toBeInTheDocument();
  });
});
