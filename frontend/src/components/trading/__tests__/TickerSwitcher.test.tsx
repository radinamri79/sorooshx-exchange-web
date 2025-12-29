import { render, screen, fireEvent } from '@testing-library/react';
import { TickerSwitcher } from '../TickerSwitcher';

describe('TickerSwitcher Component', () => {
  const mockTickers = {
    BTCUSDT: {
      symbol: 'BTCUSDT',
      lastPrice: '97500.00',
      priceChangePercent: '2.5',
      volume: '50000',
    },
    ETHUSDT: {
      symbol: 'ETHUSDT',
      lastPrice: '3500.00',
      priceChangePercent: '-1.2',
      volume: '300000',
    },
  };

  it('should render ticker buttons', () => {
    render(
      <TickerSwitcher 
        tickers={mockTickers}
        selectedSymbol="BTCUSDT"
        onSymbolChange={jest.fn()}
      />
    );
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
  });

  it('should highlight selected ticker', () => {
    const { container } = render(
      <TickerSwitcher 
        tickers={mockTickers}
        selectedSymbol="BTCUSDT"
        onSymbolChange={jest.fn()}
      />
    );
    const btcButton = screen.getByText('BTCUSDT').closest('button');
    expect(btcButton?.className).toContain('selected');
  });

  it('should call onSymbolChange when ticker is clicked', () => {
    const handleChange = jest.fn();
    render(
      <TickerSwitcher 
        tickers={mockTickers}
        selectedSymbol="BTCUSDT"
        onSymbolChange={handleChange}
      />
    );

    fireEvent.click(screen.getByText('ETHUSDT'));
    expect(handleChange).toHaveBeenCalledWith('ETHUSDT');
  });

  it('should display price change percentage', () => {
    render(
      <TickerSwitcher 
        tickers={mockTickers}
        selectedSymbol="BTCUSDT"
        onSymbolChange={jest.fn()}
      />
    );
    expect(screen.getByText('2.5%')).toBeInTheDocument();
    expect(screen.getByText('-1.2%')).toBeInTheDocument();
  });
});
