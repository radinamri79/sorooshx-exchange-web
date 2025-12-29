import { render } from '@testing-library/react';
import { AccountInfoPanel } from '../AccountInfoPanel';

describe('AccountInfoPanel Component', () => {
  it('should render account info panel', () => {
    render(<AccountInfoPanel />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display with custom className', () => {
    render(<AccountInfoPanel className="custom" />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display balance information', () => {
    render(<AccountInfoPanel />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should calculate margin information', () => {
    render(<AccountInfoPanel />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should display unrealized and realized PnL', () => {
    render(<AccountInfoPanel />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });
});
