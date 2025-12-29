import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from '../Dialog';

describe('Dialog Component', () => {
  it('should not render content when closed', () => {
    const { queryByText } = render(
      <Dialog open={false}>
        <Dialog.Content>Dialog content</Dialog.Content>
      </Dialog>
    );
    expect(queryByText('Dialog content')).not.toBeInTheDocument();
  });

  it('should render content when open', () => {
    render(
      <Dialog open={true}>
        <Dialog.Content>Dialog content</Dialog.Content>
      </Dialog>
    );
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should call onOpenChange when dialog state changes', () => {
    const handleOpenChange = jest.fn();
    const { rerender } = render(
      <Dialog open={false} onOpenChange={handleOpenChange}>
        <Dialog.Content>Dialog content</Dialog.Content>
      </Dialog>
    );

    rerender(
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <Dialog.Content>Dialog content</Dialog.Content>
      </Dialog>
    );

    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('should render dialog trigger', () => {
    render(
      <Dialog open={false}>
        <Dialog.Trigger>Open Dialog</Dialog.Trigger>
        <Dialog.Content>Dialog content</Dialog.Content>
      </Dialog>
    );
    expect(screen.getByText('Open Dialog')).toBeInTheDocument();
  });

  it('should render dialog with title and description', () => {
    render(
      <Dialog open={true}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
            <Dialog.Description>Dialog description</Dialog.Description>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog>
    );
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog description')).toBeInTheDocument();
  });
});
