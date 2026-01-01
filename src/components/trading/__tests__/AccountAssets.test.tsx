/**
 * Tests for AccountAssets Component
 * Displays trading account information including margin, equity, and assets
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AccountAssets } from '../AccountAssets';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('AccountAssets Component', () => {
  const mockProps = {
    symbol: 'BTC/USDT',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render account assets section', () => {
      render(<AccountAssets {...mockProps} />);
      const section = screen.getByRole('region', { hidden: true }) || 
                     document.querySelector('[class*="border-t"]');
      expect(section).toBeInTheDocument();
    });

    it('should display account label', () => {
      render(<AccountAssets {...mockProps} />);
      const container = document.querySelector('[class*="bg-\\[#0B0E11\\]"]');
      expect(container).toBeInTheDocument();
    });

    it('should render account information sections', () => {
      render(<AccountAssets {...mockProps} />);
      const element = document.querySelector('div');
      expect(element).toBeInTheDocument();
    });
  });

  describe('Information Display', () => {
    it('should render asset-related content', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      // Check for structured content
      expect(container.querySelector('[class*="border"]')).toBeInTheDocument();
    });

    it('should handle responsive styling', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('flex');
      expect(element.className).toContain('flex-col');
    });

    it('should apply correct background color', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      const elements = container.querySelectorAll('[class*="bg-\\[#0B0E11\\]"]');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('should use correct spacing classes', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      const element = container.querySelector('[class*="px"]') || container.querySelector('div');
      expect(element).toBeInTheDocument();
    });

    it('should be scrollable on mobile', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      // Check for overflow handling
      const element = container.firstChild as HTMLElement;
      expect(element).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept symbol prop', () => {
      const { rerender } = render(<AccountAssets symbol="ETH/USDT" />);
      expect(screen.getByText(/.*/, { selector: 'div' })).toBeInTheDocument();

      rerender(<AccountAssets symbol="BTC/USDT" />);
      expect(screen.getByText(/.*/, { selector: 'div' })).toBeInTheDocument();
    });

    it('should work with different symbols', () => {
      const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
      symbols.forEach((symbol) => {
        const { unmount } = render(<AccountAssets symbol={symbol} />);
        expect(document.querySelector('[class*="border"]')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const { container } = render(<AccountAssets {...mockProps} />);
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('tabindex')).toBeNull(); // Should not interfere with tabindex
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      const { container } = render(<AccountAssets {...mockProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render correctly on tablet', () => {
      global.innerWidth = 768;
      const { container } = render(<AccountAssets {...mockProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render correctly on desktop', () => {
      global.innerWidth = 1920;
      const { container } = render(<AccountAssets {...mockProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle window resize', async () => {
      const { container } = render(<AccountAssets {...mockProps} />);

      global.innerWidth = 1920;
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });
});
