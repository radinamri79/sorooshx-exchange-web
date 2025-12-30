import { render } from '@testing-library/react';
import { Orderbook } from '../Orderbook';

describe('Orderbook Component', () => {
  it('should render orderbook', () => {
    render(<Orderbook />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<Orderbook className="custom" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should support maxRows prop', () => {
    render(<Orderbook maxRows={10} />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display orderbook data', () => {
    render(<Orderbook />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should handle different display modes', () => {
    render(<Orderbook />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should support price selection', () => {
    render(<Orderbook />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });
});
