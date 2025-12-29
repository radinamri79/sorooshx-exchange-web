import { render, screen, fireEvent } from '@testing-library/react';
import { OrdersPanel } from '../OrdersPanel';

describe('OrdersPanel Component', () => {
  const mockOrders = [
    {
      id: '1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      price: '97400.00',
      quantity: '1.5',
      status: 'FILLED',
      timestamp: Date.now(),
    },
    {
      id: '2',
      symbol: 'BTCUSDT',
      side: 'SELL',
      type: 'LIMIT',
      price: '97600.00',
      quantity: '1.0',
      status: 'PENDING',
      timestamp: Date.now(),
    },
  ];

  it('should render orders panel', () => {
    render(<OrdersPanel orders={mockOrders} onCancelOrder={jest.fn()} />);
    expect(screen.getByText(/orders/i)).toBeInTheDocument();
  });

  it('should display all orders', () => {
    render(<OrdersPanel orders={mockOrders} onCancelOrder={jest.fn()} />);
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('97400.00')).toBeInTheDocument();
    expect(screen.getByText('97600.00')).toBeInTheDocument();
  });

  it('should show order status', () => {
    render(<OrdersPanel orders={mockOrders} onCancelOrder={jest.fn()} />);
    expect(screen.getByText('FILLED')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('should show BUY and SELL sides', () => {
    render(<OrdersPanel orders={mockOrders} onCancelOrder={jest.fn()} />);
    const buyElements = screen.getAllByText('BUY');
    const sellElements = screen.getAllByText('SELL');
    expect(buyElements.length).toBeGreaterThan(0);
    expect(sellElements.length).toBeGreaterThan(0);
  });

  it('should call onCancelOrder when cancel button is clicked', () => {
    const handleCancel = jest.fn();
    render(<OrdersPanel orders={mockOrders} onCancelOrder={handleCancel} />);
    
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButtons[0]);

    expect(handleCancel).toHaveBeenCalled();
  });

  it('should display empty state when no orders', () => {
    render(<OrdersPanel orders={[]} onCancelOrder={jest.fn()} />);
    expect(screen.getByText(/no orders/i)).toBeInTheDocument();
  });
});
