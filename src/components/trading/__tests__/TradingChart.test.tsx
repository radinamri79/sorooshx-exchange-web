import { render } from '@testing-library/react';
import { TradingChart } from '../TradingChart';

describe('TradingChart Component', () => {
  it('should render trading chart', () => {
    const { container } = render(<TradingChart />);
    expect(container).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<TradingChart className="custom-class" />);
    const chart = container.querySelector('.custom-class');
    expect(chart).toBeInTheDocument();
  });

  it('should render with flex-col layout', () => {
    const { container } = render(<TradingChart />);
    const chart = container.firstChild;
    expect(chart).toHaveClass('flex-col');
  });
});
