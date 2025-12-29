import { render, screen, fireEvent } from '@testing-library/react';
import { OrderForm } from '../OrderForm';

describe('OrderForm Component', () => {
  const mockProps = {
    symbol: 'BTCUSDT',
    currentPrice: '97500',
    onSubmit: jest.fn(),
  };

  it('should render order form', () => {
    render(<OrderForm {...mockProps} />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('should have price input', () => {
    render(<OrderForm {...mockProps} />);
    const priceInput = screen.getByPlaceholderText(/price/i);
    expect(priceInput).toBeInTheDocument();
  });

  it('should have quantity input', () => {
    render(<OrderForm {...mockProps} />);
    const quantityInput = screen.getByPlaceholderText(/quantity|amount/i);
    expect(quantityInput).toBeInTheDocument();
  });

  it('should have buy and sell buttons', () => {
    render(<OrderForm {...mockProps} />);
    expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sell/i })).toBeInTheDocument();
  });

  it('should update price from current market price', () => {
    render(<OrderForm {...mockProps} />);
    const priceInput = screen.getByPlaceholderText(/price/i) as HTMLInputElement;
    expect(priceInput.value).toBe('97500');
  });

  it('should call onSubmit with BUY order', () => {
    render(<OrderForm {...mockProps} />);
    
    const priceInput = screen.getByPlaceholderText(/price/i);
    const quantityInput = screen.getByPlaceholderText(/quantity|amount/i);
    
    fireEvent.change(priceInput, { target: { value: '97400' } });
    fireEvent.change(quantityInput, { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    expect(mockProps.onSubmit).toHaveBeenCalled();
  });

  it('should call onSubmit with SELL order', () => {
    render(<OrderForm {...mockProps} />);
    
    const priceInput = screen.getByPlaceholderText(/price/i);
    const quantityInput = screen.getByPlaceholderText(/quantity|amount/i);
    
    fireEvent.change(priceInput, { target: { value: '97600' } });
    fireEvent.change(quantityInput, { target: { value: '1.0' } });
    fireEvent.click(screen.getByRole('button', { name: /sell/i }));

    expect(mockProps.onSubmit).toHaveBeenCalled();
  });
});
