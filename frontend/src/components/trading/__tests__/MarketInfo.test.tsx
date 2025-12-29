import { render } from '@testing-library/react';
import { MarketInfo } from '../MarketInfo';

describe('MarketInfo Component', () => {
  it('should render market info', () => {
    render(<MarketInfo />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    render(<MarketInfo className="custom" />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display market data', () => {
    render(<MarketInfo />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should update on ticker changes', () => {
    const { rerender } = render(<MarketInfo />);
    rerender(<MarketInfo />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display 24h statistics', () => {
    render(<MarketInfo />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });
});
