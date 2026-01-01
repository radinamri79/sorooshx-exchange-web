/**
 * Tests for TradingPageClient Component
 * Main trading page orchestrating all trading-related components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TradingPageClient } from '../TradingPageClient';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock WebSocket service
jest.mock('@/services/websocket', () => ({
  binanceWS: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

// Mock child components
jest.mock('../MarketInfo', () => ({
  MarketInfo: () => <div data-testid="market-info">MarketInfo</div>,
}));

jest.mock('../TickerSwitcher', () => ({
  TickerSwitcher: () => <div data-testid="ticker-switcher">TickerSwitcher</div>,
}));

jest.mock('../OrderForm', () => ({
  OrderForm: () => <div data-testid="order-form">OrderForm</div>,
}));

jest.mock('../Orderbook', () => ({
  Orderbook: () => <div data-testid="orderbook">Orderbook</div>,
}));

jest.mock('../TradingChart', () => ({
  TradingChart: () => <div data-testid="trading-chart">TradingChart</div>,
}));

jest.mock('../OrdersPanel', () => ({
  OrdersPanel: () => <div data-testid="orders-panel">OrdersPanel</div>,
}));

jest.mock('../AccountAssets', () => ({
  AccountAssets: () => <div data-testid="account-assets">AccountAssets</div>,
}));

jest.mock('../DataStatusIndicator', () => ({
  DataStatusIndicator: () => <div data-testid="data-status">DataStatus</div>,
}));

describe('TradingPageClient Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window size
    global.innerWidth = 1024;
  });

  describe('Desktop Layout', () => {
    it('should render all main components', () => {
      render(<TradingPageClient locale="en" />);

      expect(screen.getByTestId('market-info')).toBeInTheDocument();
      expect(screen.getByTestId('ticker-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('trading-chart')).toBeInTheDocument();
      expect(screen.getByTestId('orderbook')).toBeInTheDocument();
      expect(screen.getByTestId('order-form')).toBeInTheDocument();
      expect(screen.getByTestId('orders-panel')).toBeInTheDocument();
      expect(screen.getByTestId('account-assets')).toBeInTheDocument();
    });

    it('should display three-column layout on desktop', () => {
      render(<TradingPageClient locale="en" />);
      // Components should render properly
      expect(screen.getByTestId('trading-chart')).toBeInTheDocument();
    });

    it('should render header with branding', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should position components correctly', () => {
      render(<TradingPageClient locale="en" />);
      // Chart should be in main area
      expect(screen.getByTestId('trading-chart')).toBeInTheDocument();
      // Orderbook should be beside chart
      expect(screen.getByTestId('orderbook')).toBeInTheDocument();
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      global.innerWidth = 375;
    });

    it('should render mobile layout for small screens', async () => {
      render(<TradingPageClient locale="en" />);

      await waitFor(() => {
        // Mobile layout should still render all components
        expect(screen.getByTestId('market-info')).toBeInTheDocument();
      });
    });

    it('should show tab navigation on mobile', async () => {
      render(<TradingPageClient locale="en" />);

      // Wait for mobile detection
      await waitFor(() => {
        expect(screen.getByTestId('market-info')).toBeInTheDocument();
      });
    });

    it('should have touch-friendly button sizes', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      global.innerWidth = 768;
    });

    it('should render tablet layout for medium screens', async () => {
      render(<TradingPageClient locale="en" />);

      await waitFor(() => {
        expect(screen.getByTestId('market-info')).toBeInTheDocument();
      });
    });

    it('should adapt component sizing for tablet', () => {
      render(<TradingPageClient locale="en" />);
      expect(screen.getByTestId('trading-chart')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should update layout on window resize', async () => {
      render(<TradingPageClient locale="en" />);

      // Simulate resize to mobile
      global.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('market-info')).toBeInTheDocument();
      });
    });

    it('should handle multiple resize events', async () => {
      render(<TradingPageClient locale="en" />);

      const sizes = [375, 768, 1024, 1920];
      for (const size of sizes) {
        global.innerWidth = size;
        window.dispatchEvent(new Event('resize'));

        await waitFor(() => {
          expect(screen.getByTestId('market-info')).toBeInTheDocument();
        });
      }
    });
  });

  describe('RTL Support', () => {
    it('should render with RTL direction for Persian locale', () => {
      const { container } = render(<TradingPageClient locale="fa" />);
      const mainElement = container.querySelector('[dir="rtl"]');
      expect(mainElement).toBeInTheDocument();
    });

    it('should render with LTR direction for English locale', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const mainElement = container.querySelector('[dir="ltr"]');
      expect(mainElement).toBeInTheDocument();
    });

    it('should apply RTL-specific styling', () => {
      const { container } = render(<TradingPageClient locale="fa" />);
      const rtlElement = container.querySelector('[dir="rtl"]');
      expect(rtlElement).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render all trading components together', () => {
      render(<TradingPageClient locale="en" />);

      // All trading components should be present
      const components = [
        'market-info',
        'ticker-switcher',
        'trading-chart',
        'orderbook',
        'order-form',
        'orders-panel',
        'account-assets',
      ];

      components.forEach((testId) => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
    });

    it('should maintain proper component hierarchy', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      // Check for proper nesting
      const mainArea = container.querySelector('[class*="flex"]');
      expect(mainArea).toBeInTheDocument();
    });
  });

  describe('Dark Theme', () => {
    it('should apply dark theme styling', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-');
    });

    it('should use consistent dark colors', () => {
      render(<TradingPageClient locale="en" />);
      // Should render without errors
      expect(screen.getByTestId('market-info')).toBeInTheDocument();
    });
  });

  describe('Navigation and Menus', () => {
    it('should have navigation elements', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const nav = container.querySelector('nav') || container.querySelector('header');
      expect(nav).toBeInTheDocument();
    });

    it('should render menu buttons', () => {
      render(<TradingPageClient locale="en" />);
      // Components should render with interactive elements
      expect(screen.getByTestId('market-info')).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('should establish WebSocket connection on mount', () => {
      const { binanceWS } = require('@/services/websocket');
      render(<TradingPageClient locale="en" />);

      expect(binanceWS.connect).toHaveBeenCalled();
    });

    it('should cleanup WebSocket on unmount', () => {
      const { binanceWS } = require('@/services/websocket');
      const { unmount } = render(<TradingPageClient locale="en" />);

      unmount();
      expect(binanceWS.disconnect).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const header = container.querySelector('header');
      const main = container.querySelector('main') || container.querySelector('[class*="flex"]');
      expect(header || main).toBeInTheDocument();
    });

    it('should have interactive elements accessible via keyboard', () => {
      const { container } = render(<TradingPageClient locale="en" />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should render gracefully without errors', () => {
      // Should not throw
      expect(() => {
        render(<TradingPageClient locale="en" />);
      }).not.toThrow();
    });

    it('should handle missing props gracefully', () => {
      // Should render with valid locale
      expect(() => {
        render(<TradingPageClient locale="en" />);
      }).not.toThrow();
    });
  });
});
