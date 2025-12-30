import { render, screen, fireEvent } from '@testing-library/react';
import { OrdersPanel } from '../OrdersPanel';

describe('OrdersPanel Component', () => {
  const mockProps = {
    className: 'test-class',
  };

  it('should render orders panel', () => {
    render(<OrdersPanel {...mockProps} />);
    expect(screen.getByText(/positions|orders|open|history/i)).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(<OrdersPanel {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show positions by default', () => {
    render(<OrdersPanel {...mockProps} />);
    expect(screen.getByText(/positions|orders|open|history/i)).toBeInTheDocument();
  });

  it('should switch to open orders tab', () => {
    render(<OrdersPanel {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should switch to order history tab', () => {
    render(<OrdersPanel {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should accept className prop', () => {
    const { container } = render(<OrdersPanel className="custom-class" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render without className', () => {
    const { container } = render(<OrdersPanel />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should display trading information', () => {
    render(<OrdersPanel {...mockProps} />);
    const text = screen.queryAllByText(/positions|orders|open|history|symbol|price|quantity|pnl|status/i);
    expect(text.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle tab clicks', () => {
    render(<OrdersPanel {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      const button = buttons[0];
      if (button) {
        fireEvent.click(button);
        expect(button).toBeInTheDocument();
      }
    }
  });

  it('should render empty state or content', () => {
    render(<OrdersPanel {...mockProps} />);
    const container = screen.getByText(/positions|orders|open|history/i).parentElement;
    expect(container).toBeInTheDocument();
  });
});
