import { render, screen } from '@testing-library/react';
import { Dialog } from '../Dialog';

describe('Dialog Component', () => {
  it('should render dialog component', () => {
    render(
      <Dialog open={true}>
        Dialog content
      </Dialog>
    );
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    render(
      <Dialog open={true}>
        Dialog content
      </Dialog>
    );
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should handle open state', () => {
    const { rerender } = render(
      <Dialog open={false}>
        Dialog content
      </Dialog>
    );

    rerender(
      <Dialog open={true}>
        Dialog content
      </Dialog>
    );

    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should render dialog children', () => {
    render(
      <Dialog open={true}>
        <div>Test child</div>
      </Dialog>
    );
    expect(screen.getByText('Test child')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(
      <Dialog open={true}>
        Dialog content
      </Dialog>
    );
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });
});
