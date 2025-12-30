import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Decimal from 'decimal.js';

/**
 * Merge class names with Tailwind CSS class conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number with locale-aware formatting (always Western numerals)
 */
export function formatNumber(
  value: number | string | Decimal,
  options: {
    decimals?: number;
    minDecimals?: number;
    compact?: boolean;
    showSign?: boolean;
  } = {}
): string {
  const { decimals = 2, minDecimals, compact = false, showSign = false } = options;

  const num = typeof value === 'string' ? parseFloat(value) : value instanceof Decimal ? value.toNumber() : value;

  if (isNaN(num)) return '--';

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals ?? 0,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
    signDisplay: showSign ? 'exceptZero' : 'auto',
  });

  return formatter.format(num);
}

/**
 * Format price with appropriate decimal places based on value
 */
export function formatPrice(value: number | string | Decimal, pricePrecision = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value instanceof Decimal ? value.toNumber() : value;

  if (isNaN(num)) return '--';

  return formatNumber(num, {
    decimals: pricePrecision,
    minDecimals: pricePrecision,
  });
}

/**
 * Format percentage with sign
 */
export function formatPercentage(value: number | string, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '--';

  const formatted = formatNumber(Math.abs(num), {
    decimals,
    minDecimals: decimals,
  });

  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}${formatted}%`;
}

/**
 * Format currency amount
 */
export function formatCurrency(
  value: number | string | Decimal,
  currency = 'USDT',
  decimals = 2
): string {
  return `${formatNumber(value, { decimals })} ${currency}`;
}

/**
 * Format large volume numbers compactly
 */
export function formatVolume(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '--';

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return formatNumber(num, { decimals: 2 });
}

/**
 * Format time remaining (e.g., for funding countdown)
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get session key from localStorage
 */
export function getSessionKey(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionKey = localStorage.getItem('sorooshx_session_key');
  if (!sessionKey) {
    sessionKey = generateId();
    localStorage.setItem('sorooshx_session_key', sessionKey);
  }
  return sessionKey;
}
