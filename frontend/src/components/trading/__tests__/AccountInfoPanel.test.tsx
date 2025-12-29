import { render, screen } from '@testing-library/react';
import { AccountInfoPanel } from '../AccountInfoPanel';

describe('AccountInfoPanel Component', () => {
  const mockAccountInfo = {
    totalBalance: '50000.00',
    availableBalance: '35000.00',
    unrealizedPnL: '2500.00',
    unrealizedPnLPercent: '5.26',
    realizedPnL: '1500.00',
  };

  it('should render account info panel', () => {
    render(<AccountInfoPanel {...mockAccountInfo} />);
    expect(screen.getByText(/account/i)).toBeInTheDocument();
  });

  it('should display total balance', () => {
    render(<AccountInfoPanel {...mockAccountInfo} />);
    expect(screen.getByText('50000.00')).toBeInTheDocument();
  });

  it('should display available balance', () => {
    render(<AccountInfoPanel {...mockAccountInfo} />);
    expect(screen.getByText('35000.00')).toBeInTheDocument();
  });

  it('should display unrealized PnL', () => {
    render(<AccountInfoPanel {...mockAccountInfo} />);
    expect(screen.getByText(/unrealized/i)).toBeInTheDocument();
    expect(screen.getByText('+2500.00')).toBeInTheDocument();
  });

  it('should display realized PnL', () => {
    render(<AccountInfoPanel {...mockAccountInfo} />);
    expect(screen.getByText(/realized/i)).toBeInTheDocument();
    expect(screen.getByText('+1500.00')).toBeInTheDocument();
  });
});
