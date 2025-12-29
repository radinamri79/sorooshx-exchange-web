import { render, screen } from '@testing-library/react';
import { DataStatusIndicator } from '../DataStatusIndicator';

describe('DataStatusIndicator Component', () => {
  it('should render with healthy status', () => {
    render(<DataStatusIndicator status="healthy" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render with warning status', () => {
    render(<DataStatusIndicator status="warning" />);
    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('warning'));
  });

  it('should render with error status', () => {
    render(<DataStatusIndicator status="error" />);
    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
  });

  it('should display source name', () => {
    render(<DataStatusIndicator status="healthy" source="Binance" />);
    expect(screen.getByText('Binance')).toBeInTheDocument();
  });

  it('should display latency information', () => {
    render(<DataStatusIndicator status="healthy" latency="150ms" />);
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });
});
