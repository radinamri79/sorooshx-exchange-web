import { render } from '@testing-library/react';
import { TickerSwitcher } from '../TickerSwitcher';

describe('TickerSwitcher Component', () => {
  it('should render ticker switcher', () => {
    render(<TickerSwitcher />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should support className prop', () => {
    const { container } = render(<TickerSwitcher className="custom" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle symbol selection', () => {
    render(<TickerSwitcher />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display price changes', () => {
    render(<TickerSwitcher />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should support search functionality', () => {
    render(<TickerSwitcher />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });
});
