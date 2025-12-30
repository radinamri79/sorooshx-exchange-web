import type { Order, Position, Trade, Wallet } from '@/types/trading';
import type { Session } from '@/services/auth/SessionService';

interface ExportData {
  exportedAt: string;
  version: string;
  session: Session;
  wallet: Wallet;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: ExportData;
}

/**
 * Service for persisting trading data and exporting/importing backups
 */
export class PersistenceService {
  private static readonly MAX_ITEMS = {
    TRADES: 1000,
    ORDERS: 500,
  };

  /**
   * Export all trading data as JSON
   */
  static exportToJSON(
    session: Session,
    wallet: Wallet,
    positions: Position[],
    orders: Order[],
    trades: Trade[]
  ): string {
    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      session,
      wallet,
      positions,
      orders: orders.slice(0, this.MAX_ITEMS.ORDERS), // Keep last 500 orders
      trades: trades.slice(0, this.MAX_ITEMS.TRADES), // Keep last 1000 trades
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export as CSV (for Excel/spreadsheet compatibility)
   */
  static exportTradesAsCSV(trades: Trade[]): string {
    if (trades.length === 0) {
      return 'No trades to export';
    }

    const headers = [
      'ID',
      'Symbol',
      'Side',
      'Price',
      'Quantity',
      'Commission',
      'Realized PnL',
      'Executed At',
    ];

    const rows = trades.map((trade) => [
      trade.id,
      trade.symbol,
      trade.side,
      trade.price,
      trade.quantity,
      trade.commission,
      trade.realizedPnl,
      trade.executedAt,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Export positions as CSV
   */
  static exportPositionsAsCSV(positions: Position[]): string {
    if (positions.length === 0) {
      return 'No positions to export';
    }

    const headers = [
      'ID',
      'Symbol',
      'Side',
      'Quantity',
      'Entry Price',
      'Liquidation Price',
      'Margin',
      'Unrealized PnL',
      'Is Open',
      'Opened At',
    ];

    const rows = positions.map((position) => [
      position.id,
      position.symbol,
      position.side,
      position.quantity,
      position.entryPrice,
      position.liquidationPrice,
      position.margin,
      position.unrealizedPnl,
      position.isOpen,
      position.createdAt,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Import data from JSON export
   */
  static importFromJSON(jsonString: string): ImportResult {
    try {
      const data = JSON.parse(jsonString) as Record<string, unknown>;

      // Validate structure
      if (
        !data.exportedAt ||
        !data.session ||
        !data.wallet ||
        !Array.isArray(data.positions) ||
        !Array.isArray(data.orders) ||
        !Array.isArray(data.trades)
      ) {
        return {
          success: false,
          message: 'Invalid export format: missing required fields',
        };
      }

      // Validate version compatibility
      const version = String(data.version || '1');
      const versionParts = version.split('.');
      const majorVersion = parseInt(versionParts[0] || '1', 10);
      if (majorVersion !== 1) {
        return {
          success: false,
          message: `Incompatible version: ${version}`,
        };
      }

      return {
        success: true,
        message: `Successfully imported data from ${new Date(String(data.exportedAt)).toLocaleString()}`,
        data: data as unknown as ExportData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to parse JSON: ${errorMessage}`,
      };
    }
  }

  /**
   * Download file to user's device
   */
  static downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(type: 'export' | 'trades' | 'positions', extension: string = 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `sorooshx-${type}-${timestamp}.${extension}`;
  }

  /**
   * Calculate statistics from trade history
   */
  static calculateTradeStats(trades: Trade[]) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
      };
    }

    const winningTrades = trades.filter((t) => parseFloat(t.realizedPnl) > 0);
    const losingTrades = trades.filter((t) => parseFloat(t.realizedPnl) < 0);

    const totalPnL = trades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);
    const totalLosses = losingTrades.reduce((sum, t) => sum + parseFloat(t.realizedPnl), 0);

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL,
      averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : 0,
    };
  }

  /**
   * Cleanup old data (keep only last N items)
   */
  static cleanupOldData() {
    try {
      // This would be implemented when using IndexedDB for larger data sets
      // For now, Zustand persist handles this with the keepStorage limit
      return true;
    } catch {
      return false;
    }
  }
}
