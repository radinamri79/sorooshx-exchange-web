'use client';

import { useState } from 'react';
import { useChartStore } from '@/stores/useChartStore';
import { useMarketStore } from '@/stores/useMarketStore';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PriceAlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceAlertsModal({ open, onOpenChange }: PriceAlertsModalProps) {
  const { alerts, addAlert, removeAlert } = useChartStore();
  const { getCurrentTicker } = useMarketStore();
  const currentTicker = getCurrentTicker();
  const currentPrice = currentTicker ? parseFloat(currentTicker.c) : 0;

  const [newPrice, setNewPrice] = useState<string>('');
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');

  const handleAddAlert = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;

    addAlert(price, newCondition);
    setNewPrice('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0e27] border-[#1e2329] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Price Alerts</DialogTitle>
          <DialogDescription className="text-[#848e9c]">
            Get notified when price reaches your target levels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Price Display */}
          <div className="p-3 rounded bg-[#1a1a2e] border border-[#1e2329]">
            <p className="text-xs text-[#848e9c] mb-1">Current Price</p>
            <p className="text-lg font-semibold text-white">${currentPrice.toFixed(2)}</p>
          </div>

          {/* Add New Alert */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Add New Alert</p>

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Target price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded bg-[#1a1a2e] border border-[#1e2329] text-white placeholder-[#848e9c]"
                step="0.01"
              />
              <Select value={newCondition} onValueChange={(value: any) => setNewCondition(value)}>
                <SelectTrigger className="w-24 bg-[#1a1a2e] border-[#1e2329] text-[#848e9c]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#1e2329]">
                  <SelectItem value="above" className="text-[#848e9c]">
                    Above
                  </SelectItem>
                  <SelectItem value="below" className="text-[#848e9c]">
                    Below
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddAlert}
              disabled={!newPrice}
              className="w-full bg-[#ed7620] hover:bg-[#ff8c42] text-white text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
          </div>

          {/* Alerts List */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Active Alerts ({alerts.length})</p>

            {alerts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-[#848e9c]">No alerts set yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-2 rounded border ${
                      alert.triggered
                        ? 'bg-[#ed7620]/10 border-[#ed7620]'
                        : 'bg-[#1a1a2e] border-[#1e2329]'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        Alert when price goes {alert.condition} ${alert.price.toFixed(2)}
                      </p>
                      {alert.triggered && (
                        <p className="text-xs text-[#ed7620] mt-0.5">✓ Triggered</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAlert(alert.id)}
                      className="text-[#848e9c] hover:text-white hover:bg-[#1e2329]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
