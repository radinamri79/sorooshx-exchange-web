'use client';

import { useCallback, useRef, useState } from 'react';
import { Download, Upload, BarChart3, AlertCircle, Check } from 'lucide-react';
import { useTradeStore } from '@/stores/useTradeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { PersistenceService } from '@/services/persistence/PersistenceService';
import { cn } from '@/lib/utils';
import type { Order, Position, Trade, Wallet } from '@/types/trading';

interface DataExportProps {
  className?: string;
}

export function DataExport({ className }: DataExportProps) {
  const { session } = useAuthStore();
  const { wallet, positions, orders, trades } = useTradeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExportJSON = useCallback(() => {
    try {
      if (!session) {
        setExportMessage({ type: 'error', text: 'Session not initialized' });
        return;
      }

      const jsonData = PersistenceService.exportToJSON(
        session,
        wallet as Wallet,
        positions as Position[],
        orders as Order[],
        trades as Trade[]
      );

      const filename = PersistenceService.generateFilename('export', 'json');
      PersistenceService.downloadFile(jsonData, filename, 'application/json');

      setExportMessage({
        type: 'success',
        text: `Exported ${positions.length} positions, ${orders.length} orders, ${trades.length} trades`,
      });

      setTimeout(() => setExportMessage(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportMessage({ type: 'error', text: `Export failed: ${errorMessage}` });
    }
  }, [session, wallet, positions, orders, trades]);

  const handleExportTradesCSV = useCallback(() => {
    try {
      const csvData = PersistenceService.exportTradesAsCSV(trades);
      const filename = PersistenceService.generateFilename('trades', 'csv');
      PersistenceService.downloadFile(csvData, filename, 'text/csv');

      setExportMessage({
        type: 'success',
        text: `Exported ${trades.length} trades as CSV`,
      });

      setTimeout(() => setExportMessage(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportMessage({ type: 'error', text: `Export failed: ${errorMessage}` });
    }
  }, [trades]);

  const handleExportPositionsCSV = useCallback(() => {
    try {
      const csvData = PersistenceService.exportPositionsAsCSV(positions);
      const filename = PersistenceService.generateFilename('positions', 'csv');
      PersistenceService.downloadFile(csvData, filename, 'text/csv');

      setExportMessage({
        type: 'success',
        text: `Exported ${positions.length} positions as CSV`,
      });

      setTimeout(() => setExportMessage(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportMessage({ type: 'error', text: `Export failed: ${errorMessage}` });
    }
  }, [positions]);

  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const result = PersistenceService.importFromJSON(content);

        if (result.success && result.data) {
          setImportMessage({
            type: 'success',
            text: result.message,
          });

          // Note: To actually import, you would dispatch actions to update the stores
          // This is a placeholder for the import functionality
          console.log('Import data:', result.data);
        } else {
          setImportMessage({
            type: 'error',
            text: result.message,
          });
        }

        setTimeout(() => setImportMessage(null), 3000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setImportMessage({ type: 'error', text: `Import failed: ${errorMessage}` });
      }
    };

    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Calculate stats
  const stats = PersistenceService.calculateTradeStats(trades);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Export Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-[#f5f5f5] flex items-center gap-2">
          <Download className="w-4 h-4 text-[#ed7620]" />
          Export Data
        </h3>

        {exportMessage && (
          <div
            className={cn(
              'flex items-start gap-2 p-2 rounded text-xs',
              exportMessage.type === 'success'
                ? 'bg-green-900/20 border border-green-600/50 text-green-400'
                : 'bg-red-900/20 border border-red-600/50 text-red-400'
            )}
          >
            {exportMessage.type === 'success' ? (
              <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span>{exportMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExportJSON}
            className="py-1.5 px-2 text-[9px] font-medium rounded bg-[#17181b] text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#1e1f23] border border-[#2a2a2d] transition-colors"
          >
            Full Backup
          </button>
          <button
            onClick={handleExportTradesCSV}
            className="py-1.5 px-2 text-[9px] font-medium rounded bg-[#17181b] text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#1e1f23] border border-[#2a2a2d] transition-colors"
          >
            Trades CSV
          </button>
          <button
            onClick={handleExportPositionsCSV}
            className="py-1.5 px-2 text-[9px] font-medium rounded bg-[#17181b] text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#1e1f23] border border-[#2a2a2d] transition-colors"
          >
            Positions CSV
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-[#f5f5f5] flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#ed7620]" />
          Import Data
        </h3>

        {importMessage && (
          <div
            className={cn(
              'flex items-start gap-2 p-2 rounded text-xs',
              importMessage.type === 'success'
                ? 'bg-green-900/20 border border-green-600/50 text-green-400'
                : 'bg-red-900/20 border border-red-600/50 text-red-400'
            )}
          >
            {importMessage.type === 'success' ? (
              <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span>{importMessage.text}</span>
          </div>
        )}

        <button
          onClick={handleImportClick}
          className="w-full py-1.5 px-2 text-[9px] font-medium rounded bg-[#17181b] text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#1e1f23] border border-[#2a2a2d] transition-colors"
        >
          Import Backup
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          className="hidden"
        />
      </div>

      {/* Statistics Section */}
      {trades.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[#f5f5f5] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#ed7620]" />
            Trade Statistics
          </h3>

          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="p-2 rounded bg-[#17181b] border border-[#2a2a2d]">
              <div className="text-[#6b6b6b] mb-1">Total Trades</div>
              <div className="text-[#f5f5f5] font-semibold">{stats.totalTrades}</div>
            </div>

            <div className="p-2 rounded bg-[#17181b] border border-[#2a2a2d]">
              <div className="text-[#6b6b6b] mb-1">Win Rate</div>
              <div className={cn('font-semibold', stats.winRate > 50 ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                {stats.winRate.toFixed(1)}%
              </div>
            </div>

            <div className="p-2 rounded bg-[#17181b] border border-[#2a2a2d]">
              <div className="text-[#6b6b6b] mb-1">Total PnL</div>
              <div className={cn('font-semibold', stats.totalPnL >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)} USDT
              </div>
            </div>

            <div className="p-2 rounded bg-[#17181b] border border-[#2a2a2d]">
              <div className="text-[#6b6b6b] mb-1">Profit Factor</div>
              <div className="text-[#f5f5f5] font-semibold">{stats.profitFactor.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
