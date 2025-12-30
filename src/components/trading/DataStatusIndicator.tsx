'use client';

import { useState, useEffect } from 'react';
import { binanceWS, ConnectionStatus } from '@/services/websocket/binance';
import { dataSourceManager, formatDataAge, getStalenessLevel } from '@/services/dataSourceManager';

interface DataStatusIndicatorProps {
  /** Whether to show extended status info */
  extended?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * DataStatusIndicator - Shows users the current data connection status
 * 
 * States:
 * - LIVE: Green dot - Real-time data from WebSocket
 * - CACHED: Yellow dot - Showing cached data with age
 * - API: Blue dot - Data from REST API (not real-time)
 * - UNAVAILABLE: Red dot - No data available
 */
export function DataStatusIndicator({ extended = false, className = '' }: DataStatusIndicatorProps) {
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('disconnected');
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  
  useEffect(() => {
    // Subscribe to WebSocket status changes
    const unsubscribe = binanceWS.onStatusChange((status) => {
      setWsStatus(status);
    });
    
    // Poll for data source status every 5 seconds
    const statusInterval = setInterval(() => {
      const status = dataSourceManager.getStatus();
      setDataSource(status.currentSource);
      setLastUpdate(status.lastSuccessfulFetch);
    }, 5000);
    
    // Initial status
    const status = dataSourceManager.getStatus();
    setDataSource(status.currentSource);
    setLastUpdate(status.lastSuccessfulFetch);
    
    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);
  
  // Determine display state
  let statusText: string;
  let statusColor: string;
  let pulseAnimation: boolean = false;
  
  switch (wsStatus) {
    case 'connected':
      statusText = 'LIVE';
      statusColor = 'bg-green-500';
      pulseAnimation = true;
      break;
    case 'connecting':
    case 'reconnecting':
      statusText = 'CONNECTING';
      statusColor = 'bg-yellow-500';
      pulseAnimation = true;
      break;
    case 'unavailable':
      // Check if we have cached data
      if (lastUpdate) {
        const age = Date.now() - lastUpdate;
        const staleness = getStalenessLevel(age);
        statusText = `CACHED (${formatDataAge(lastUpdate)})`;
        statusColor = staleness === 'stale' ? 'bg-red-500' : 'bg-yellow-500';
      } else {
        statusText = 'UNAVAILABLE';
        statusColor = 'bg-red-500';
      }
      break;
    case 'disconnected':
    default:
      if (lastUpdate && Date.now() - lastUpdate < 60000) {
        statusText = 'API';
        statusColor = 'bg-blue-500';
      } else if (lastUpdate) {
        statusText = `CACHED (${formatDataAge(lastUpdate)})`;
        statusColor = 'bg-yellow-500';
      } else {
        statusText = 'OFFLINE';
        statusColor = 'bg-gray-500';
      }
      break;
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status dot */}
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        {pulseAnimation && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${statusColor} animate-ping opacity-75`} />
        )}
      </div>
      
      {/* Status text */}
      <span className="text-xs text-neutral-400 font-medium">
        {statusText}
      </span>
      
      {/* Extended info */}
      {extended && dataSource && wsStatus === 'connected' && (
        <span className="text-xs text-neutral-500">
          via {dataSource}
        </span>
      )}
    </div>
  );
}

/**
 * DataUnavailableMessage - Full message when data is unavailable
 * Shows a card with retry option
 */
export function DataUnavailableMessage({ 
  onRetry,
  className = '' 
}: { 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <svg 
          className="w-6 h-6 text-red-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">
        Live Data Unavailable
      </h3>
      
      <p className="text-sm text-neutral-400 text-center mb-4 max-w-sm">
        Unable to connect to market data sources. This may be due to network restrictions in your region.
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[#c9a962] text-black rounded-lg font-medium hover:bg-[#d4b872] transition-colors"
        >
          Retry Connection
        </button>
      )}
      
      <p className="text-xs text-neutral-500 mt-4">
        Try using a VPN or check your network connection
      </p>
    </div>
  );
}

/**
 * CachedDataBanner - Shows a banner when displaying cached data
 */
export function CachedDataBanner({ 
  lastUpdate,
  className = '' 
}: { 
  lastUpdate: number;
  className?: string;
}) {
  const age = formatDataAge(lastUpdate);
  const staleness = getStalenessLevel(Date.now() - lastUpdate);
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      staleness === 'stale' 
        ? 'bg-red-500/10 border border-red-500/20' 
        : 'bg-yellow-500/10 border border-yellow-500/20'
    } ${className}`}>
      <svg 
        className={`w-4 h-4 ${staleness === 'stale' ? 'text-red-500' : 'text-yellow-500'}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      
      <span className={`text-xs ${staleness === 'stale' ? 'text-red-400' : 'text-yellow-400'}`}>
        Showing cached data from {age} ago
        {staleness === 'stale' && ' - may be outdated'}
      </span>
    </div>
  );
}

export default DataStatusIndicator;
