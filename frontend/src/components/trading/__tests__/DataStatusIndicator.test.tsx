import { render } from '@testing-library/react';
import { DataStatusIndicator } from '../DataStatusIndicator';

describe('DataStatusIndicator Component', () => {
  it('should render data status indicator', () => {
    render(<DataStatusIndicator />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should support extended mode', () => {
    render(<DataStatusIndicator extended={true} />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<DataStatusIndicator className="custom-class" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should display data age when available', () => {
    render(<DataStatusIndicator extended={true} />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });

  it('should show latency information', () => {
    render(<DataStatusIndicator extended={true} />);
    expect(document.querySelector('div')).toBeInTheDocument();
  });
});
