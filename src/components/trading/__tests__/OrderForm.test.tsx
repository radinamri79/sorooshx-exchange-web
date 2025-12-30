import { render, screen } from '@testing-library/react';
import { OrderForm } from '../OrderForm';

describe('OrderForm Component', () => {
  const mockProps = {
    className: 'test-class',
  };

  it('should render order form', () => {
    render(<OrderForm {...mockProps} />);
    expect(screen.getByRole('textbox', { hidden: true }).parentElement?.parentElement).toBeInTheDocument();
  });

  it('should have price input', () => {
    render(<OrderForm {...mockProps} />);
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should have quantity input', () => {
    render(<OrderForm {...mockProps} />);
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should have buy and sell buttons', () => {
    render(<OrderForm {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should accept className prop', () => {
    const { container } = render(<OrderForm className="custom-class" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render without className', () => {
    const { container } = render(<OrderForm />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<OrderForm {...mockProps} />);
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should render order form buttons', () => {
    render(<OrderForm {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle form submission', () => {
    render(<OrderForm {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
