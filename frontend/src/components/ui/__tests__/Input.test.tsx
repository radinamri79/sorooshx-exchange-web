import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should handle value changes', () => {
    render(<Input />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'test' } });
    expect(input.value).toBe('test');
  });

  it('should render with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should render with type attribute', () => {
    render(<Input type="password" />);
    expect(screen.getByDisplayValue('') as HTMLInputElement).toHaveAttribute('type', 'password');
  });

  it('should handle input type for numbers', () => {
    render(<Input type="number" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should handle focus events', () => {
    const handleFocus = jest.fn();
    render(<Input onFocus={handleFocus} />);
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();
  });
});
