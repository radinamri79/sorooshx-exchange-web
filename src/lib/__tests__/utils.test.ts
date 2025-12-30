import {
  formatNumber,
  formatPrice,
  formatPercentage,
  formatCurrency,
  formatVolume,
  formatTimeRemaining,
  debounce,
  generateId,
  safeJsonParse,
} from '../utils';

describe('formatNumber', () => {
  it('should format number with default options', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
  });

  it('should format number with custom decimals', () => {
    expect(formatNumber(1234.567, { decimals: 4 })).toBe('1,234.567');
  });

  it('should handle string input', () => {
    expect(formatNumber('1234.567')).toBe('1,234.57');
  });

  it('should return -- for NaN', () => {
    expect(formatNumber(NaN)).toBe('--');
    expect(formatNumber('invalid')).toBe('--');
  });

  it('should format with sign when showSign is true', () => {
    expect(formatNumber(100, { showSign: true })).toBe('+100');
    expect(formatNumber(-100, { showSign: true })).toBe('-100');
  });
});

describe('formatPrice', () => {
  it('should format price with 2 decimals by default', () => {
    expect(formatPrice(95432.63)).toBe('95,432.63');
  });

  it('should format price with custom precision', () => {
    expect(formatPrice(95432.63, 4)).toBe('95,432.6300');
  });

  it('should handle string input', () => {
    expect(formatPrice('95432.63')).toBe('95,432.63');
  });

  it('should return -- for invalid input', () => {
    expect(formatPrice('invalid')).toBe('--');
  });
});

describe('formatPercentage', () => {
  it('should format positive percentage with + sign', () => {
    expect(formatPercentage(5.25)).toBe('+5.25%');
  });

  it('should format negative percentage with - sign', () => {
    expect(formatPercentage(-5.25)).toBe('-5.25%');
  });

  it('should format zero without sign', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });

  it('should handle string input', () => {
    expect(formatPercentage('5.25')).toBe('+5.25%');
  });
});

describe('formatCurrency', () => {
  it('should format with USDT by default', () => {
    expect(formatCurrency(1000)).toBe('1,000 USDT');
  });

  it('should format with custom currency', () => {
    expect(formatCurrency(1000, 'BTC')).toBe('1,000 BTC');
  });

  it('should format with custom decimals', () => {
    expect(formatCurrency(1000.1234, 'USDT', 4)).toBe('1,000.1234 USDT');
  });
});

describe('formatVolume', () => {
  it('should format billions', () => {
    expect(formatVolume(1500000000)).toBe('1.50B');
  });

  it('should format millions', () => {
    expect(formatVolume(1500000)).toBe('1.50M');
  });

  it('should format thousands', () => {
    expect(formatVolume(1500)).toBe('1.50K');
  });

  it('should format small numbers', () => {
    expect(formatVolume(150)).toBe('150');
  });
});

describe('formatTimeRemaining', () => {
  it('should format hours:minutes:seconds', () => {
    const ms = 3661000; // 1 hour, 1 minute, 1 second
    expect(formatTimeRemaining(ms)).toBe('01:01:01');
  });

  it('should return 00:00:00 for zero or negative', () => {
    expect(formatTimeRemaining(0)).toBe('00:00:00');
    expect(formatTimeRemaining(-1000)).toBe('00:00:00');
  });
});

describe('debounce', () => {
  jest.useFakeTimers();

  it('should debounce function calls', () => {
    const fn = jest.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate string IDs', () => {
    expect(typeof generateId()).toBe('string');
  });
});

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse('{"key": "value"}', {})).toEqual({ key: 'value' });
  });

  it('should return fallback for invalid JSON', () => {
    expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
  });
});
