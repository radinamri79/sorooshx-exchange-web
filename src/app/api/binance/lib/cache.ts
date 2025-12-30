/**
 * Simple in-memory cache for API fallback state
 * Persists across requests within the same server instance
 */

// Track if Binance API is blocked (detected from 451 responses)
let binanceBlocked = false;
let blockDetectedAt: number | null = null;
const BLOCK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes - retry after this time

/**
 * Check if Binance API is known to be blocked
 */
export function isBinanceBlocked(): boolean {
  if (!binanceBlocked) return false;
  
  // Check if cache has expired
  if (blockDetectedAt && Date.now() - blockDetectedAt > BLOCK_CACHE_TTL) {
    binanceBlocked = false;
    blockDetectedAt = null;
    return false;
  }
  
  return true;
}

/**
 * Mark Binance API as blocked
 */
export function markBinanceBlocked(): void {
  if (!binanceBlocked) {
    console.info('Binance API blocked (451), using mock data for subsequent requests');
  }
  binanceBlocked = true;
  blockDetectedAt = Date.now();
}

/**
 * Reset blocked state (for testing or when user enables VPN)
 */
export function resetBinanceBlockedState(): void {
  binanceBlocked = false;
  blockDetectedAt = null;
}
