import { render, screen } from '@testing-library/react';
import { TradingChart } from '../TradingChart';

describe('TradingChart Component', () => {
  const mockChartProps = {
    symbol: 'BTCUSDT',
    interval: '1h',
    data: [
      { time: 1234567890, open: 97000, high: 98000, low: 96000, close: 97500, volume: 50000 },
      { time: 1234571490, open: 97500, high: 97800, low: 97200, close: 97600, volume: 45000 },
    ],
  };

  it('should render trading chart', () => {
    render(<TradingChart {...mockChartProps} />);
    expect(screen.getByText(/chart|trading/i)).toBeInTheDocument();
  });

  it('should display symbol', () => {
    render(<TradingChart {...mockChartProps} />);
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
  });

  it('should display interval', () => {
    render(<TradingChart {...mockChartProps} />);
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('should render with empty data', () => {
    render(<TradingChart {...mockChartProps} data={[]} />);
    expect(screen.getByText(/chart|trading/i)).toBeInTheDocument();
  });
});
