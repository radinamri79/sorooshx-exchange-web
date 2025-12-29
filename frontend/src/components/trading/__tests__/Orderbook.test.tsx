import { render, screen } from '@testing-library/react';
import { Orderbook } from '../Orderbook';

describe('Orderbook Component', () => {
  const mockOrderbook = {
    bids: [
      ['97400.00', '10.5'],
      ['97300.00', '20.3'],
      ['97200.00', '15.8'],
    ],
    asks: [
      ['97500.00', '12.2'],
      ['97600.00', '18.5'],
      ['97700.00', '25.0'],
    ],
  };

  it('should render bids section', () => {
    render(<Orderbook {...mockOrderbook} />);
    expect(screen.getByText('97400.00')).toBeInTheDocument();
  });

  it('should render asks section', () => {
    render(<Orderbook {...mockOrderbook} />);
    expect(screen.getByText('97500.00')).toBeInTheDocument();
  });

  it('should display bid quantities', () => {
    render(<Orderbook {...mockOrderbook} />);
    expect(screen.getByText('10.5')).toBeInTheDocument();
  });

  it('should display ask quantities', () => {
    render(<Orderbook {...mockOrderbook} />);
    expect(screen.getByText('12.2')).toBeInTheDocument();
  });

  it('should display spread', () => {
    render(<Orderbook {...mockOrderbook} />);
    expect(screen.getByText(/spread/i)).toBeInTheDocument();
  });

  it('should handle empty orderbook', () => {
    render(<Orderbook bids={[]} asks={[]} />);
    expect(screen.queryByText('97400.00')).not.toBeInTheDocument();
  });
});
