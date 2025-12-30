import { render, fireEvent } from '@testing-library/react';
import { Slider } from '../Slider';

describe('Slider Component', () => {
  it('should render slider', () => {
    const { container } = render(<Slider />);
    expect(container.querySelector('[role="slider"]')).toBeInTheDocument();
  });

  it('should accept min and max props', () => {
    const { container } = render(<Slider min={0} max={100} />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('should handle value changes', () => {
    const handleChange = jest.fn();
    const { container } = render(
      <Slider min={0} max={100} onValueChange={handleChange} />
    );
    const slider = container.querySelector('[role="slider"]') as HTMLElement;
    
    if (slider) {
      fireEvent.change(slider, { target: { value: '50' } });
    }

    expect(handleChange).toHaveBeenCalled();
  });

  it('should have default value', () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('should be disabled when disabled prop is true', () => {
    const { container } = render(<Slider disabled />);
    const slider = container.querySelector('[role="slider"]');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
  });
});
