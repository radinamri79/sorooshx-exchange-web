/**
 * Order Form Types - Comprehensive type definitions for advanced order placement
 */

export type OrderFormType = 'LIMIT' | 'MARKET' | 'TRIGGER' | 'TRAILING_STOP';
export type OrderSide = 'LONG' | 'SHORT';
export type OrderAction = 'OPEN' | 'CLOSE';
export type MarginMode = 'ISOLATED' | 'CROSS';

export interface TPSLConfig {
  enabled: boolean;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  advancedMode?: boolean;
}

export interface OrderFormState {
  // Position and side
  action: OrderAction;
  side: OrderSide;
  marginMode: MarginMode;

  // Order type and pricing
  orderType: OrderFormType;
  price?: string;
  triggerPrice?: string;
  trailingAmount?: string;
  quantity: string;
  quantityPercent: number; // 0-100

  // TP/SL
  tpsl: TPSLConfig;

  // Post-only and reduce-only
  postOnly: boolean;
  reduceOnly: boolean;

  // Additional options
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
}

export interface OrderFormErrors {
  price?: string;
  quantity?: string;
  triggerPrice?: string;
  trailingAmount?: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  general?: string;
}

export interface OrderFormValidation {
  isValid: boolean;
  errors: OrderFormErrors;
  warnings: string[];
}

export interface OrderCostEstimate {
  cost: string; // in USDT
  maxQuantity: string;
  estimatedPnL?: string;
  estimatedPnLPercent?: string;
  maintenanceMargin: string;
  liquidationPrice?: string;
}

export interface OrderFormUIState {
  showAdvancedTP: boolean;
  showLeverageModal: boolean;
  showUnitSettingsModal: boolean;
  isSubmitting: boolean;
  successMessage?: string;
  errorMessage?: string;
}
