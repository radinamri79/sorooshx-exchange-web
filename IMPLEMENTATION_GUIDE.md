# SorooshX Exchange - Implementation Guide

## Overview
This is a professional futures trading platform built with Next.js and Django, featuring a Bitget-like interface with TradingView professional charts.

## Current Implementation Status

### ✅ Completed Features

#### 1. **Professional Trading Chart**
- **Component**: `TradingViewWidget.tsx`
- **Source**: Official TradingView Advanced Chart widget
- **Features**:
  - Real-time candlestick charts
  - Left-side drawing toolbar with:
    - Trend lines (horizontal, vertical, diagonal)
    - Fibonacci retracements and extensions
    - Geometric shapes (rectangles, triangles, circles)
    - Text annotations
    - Measurement tools
  - Top toolbar with:
    - 7 timeframes (1m, 5m, 15m, 1h, 4h, 1d, 1w)
    - Chart type selector (candlestick, line, bar, etc.)
    - 100+ technical indicators
    - Volume display
    - Legend and crosshair
  - Dark theme matching brand colors
  - Symbol sync with market store

#### 2. **Market Data Display**
- **Component**: `MarketInfo.tsx`
- **Real-time updates via Binance WebSocket**:
  - Last price
  - 24h price change & percentage
  - 24h high/low
  - 24h volume (BTC & USDT)
  - Funding rate & countdown (for perpetuals)
  - Open interest

#### 3. **Order Book**
- **Component**: `Orderbook.tsx`
- **Features**:
  - Real-time bid/ask data from Binance
  - Depth visualization with colored bars
  - Clickable rows to set price in order form
  - Configurable max rows display
  - Spread display with percentage

#### 4. **Trading Interface**
- **Component**: `OrderForm.tsx`
- **Features**:
  - Order type selection (Limit, Market, Stop Limit, Stop Market)
  - Buy/Sell toggle
  - Leverage selection (1-125x) with slider
  - Quantity presets (25%, 50%, 75%, 100%)
  - Manual price & quantity input
  - Order value calculation
  - Margin requirement display
  - Risk/reward indicators

#### 5. **Professional Layout** (Matching Bitget)
- **Component**: `TradingPageClient.tsx`
- **Layout Structure**:
  ```
  ┌─────────────────────────────────────────────────────┐
  │  Logo | Ticker Switcher | Market Info Stats        │
  ├──────────────────────────┬──────────────────────────┤
  │                          │  Order Book              │
  │   TradingView Chart      │  (Bids/Asks)             │
  │  (with left toolbar)     ├──────────────────────────┤
  │                          │  Order Form              │
  │                          │  (Buy/Sell)              │
  ├──────────────────────────┤                          │
  │  Orders & Positions      │                          │
  │  (Positions/History/etc) │                          │
  └──────────────────────────┴──────────────────────────┘
  ```
- **Responsive**: Mobile, Tablet, and Desktop layouts

#### 6. **Backend API Integration**
- **Endpoints**:
  ```
  POST   /api/v1/users/guest/               - Create guest session
  GET    /api/v1/trading/symbols/            - List trading pairs
  GET    /api/v1/trading/wallet/             - Get user wallet
  GET    /api/v1/trading/orders/             - List orders
  POST   /api/v1/trading/orders/             - Create order
  DELETE /api/v1/trading/orders/{id}/        - Cancel order
  GET    /api/v1/trading/positions/          - List positions
  GET    /api/v1/trading/trades/             - List trades
  ```

#### 7. **Data Sources**
- **Binance WebSocket** (Primary):
  - Real-time tickers (24h stats)
  - Order book depth
  - Kline/candlestick data
  - Trade history
- **Fallback Sources**:
  - OKX, Bybit, Bitget, CoinGecko

#### 8. **State Management**
- **Zustand stores**:
  - `useMarketStore`: Current symbol, tickers, market data
  - `useOrderbookStore`: Bid/ask orders
  - `useTradeStore`: User orders, positions, wallet
  - `useChartStore`: Technical indicators, drawing tools (future)

### 🔄 Architecture

#### Frontend Stack
```
Next.js 15.5           - React framework with server components
React 19              - UI library
TradingView Widgets   - Professional charting library
Zustand 5.0           - State management
Tailwind CSS 4.0      - Styling
TypeScript 5.7        - Type safety
Lucide React          - Icon library
Radix UI              - Accessible components
```

#### Backend Stack
```
Django 5.2            - Python web framework
Django REST Framework - REST API
SQLite (Dev)          - Database
Decimal               - Precise financial calculations
Binance API           - Market data
```

### 📊 Component Hierarchy

```
TradingPageClient
├── Header
│   ├── Logo
│   ├── TickerSwitcher
│   └── MarketInfo
├── Main Content (3-column layout)
│   ├── Left (flex-1)
│   │   ├── TradingChart
│   │   │   └── TradingViewWidget
│   │   └── OrdersPanel
│   └── Right (w-[560px])
│       ├── Orderbook
│       └── OrderForm
└── Mobile/Tablet Tabs (responsive)
```

### 🔌 Integration Points

#### 1. **Real-time Data Flow**
```
Binance WebSocket
    ↓
binanceWS.subscribe()
    ↓
useMarketStore (Zustand)
    ↓
Components re-render
```

#### 2. **Order Creation Flow**
```
User fills OrderForm
    ↓
Validates with Zod schema
    ↓
Calls TradingService.create_order()
    ↓
Backend: POST /api/v1/trading/orders/
    ↓
Returns Order with ID
    ↓
Updates useTradeStore
    ↓
Displays in OrdersPanel
```

#### 3. **Chart Symbol Sync**
```
TickerSwitcher onChange
    ↓
useMarketStore.setCurrentSymbol()
    ↓
TradingViewWidget re-renders
    ↓
formatSymbolForTradingView(symbol)
    ↓
TradingView loads new symbol
```

### 🚀 Running the Application

#### Development Mode
```bash
# Frontend (Next.js dev server)
cd frontend
npm install
npm run dev

# Backend (Django dev server - in another terminal)
cd backend
python manage.py migrate
python manage.py runserver

# App will be available at http://localhost:3000
```

#### Production Build
```bash
# Frontend build
cd frontend
npm run build
npm start

# Backend (Gunicorn/uWSGI)
cd backend
gunicorn config.wsgi
```

### 🔧 Configuration

#### Environment Variables

**.env.local** (Frontend):
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
```

**.env** (Backend):
```
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
SECRET_KEY=your-secret-key
```

### 📦 Key Files Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── trading/
│   │   │   ├── TradingChart.tsx           ← Main chart component
│   │   │   ├── TradingViewWidget.tsx      ← TradingView embed
│   │   │   ├── TradingPageClient.tsx      ← Main page layout
│   │   │   ├── OrderForm.tsx              ← Trade form
│   │   │   ├── Orderbook.tsx              ← Order book display
│   │   │   ├── MarketInfo.tsx             ← Market stats
│   │   │   └── index.ts                   ← Exports
│   │   └── ui/                            ← Reusable components
│   ├── stores/
│   │   ├── useMarketStore.ts              ← Market data state
│   │   ├── useOrderbookStore.ts           ← Order book state
│   │   ├── useTradeStore.ts               ← Trade state
│   │   └── useChartStore.ts               ← Chart settings state
│   ├── services/
│   │   ├── websocket.ts                   ← Binance WS
│   │   ├── api/
│   │   │   ├── index.ts                   ← API client
│   │   │   └── binance.ts                 ← Binance API
│   │   └── dataSourceManager.ts           ← Fallback data sources
│   ├── types/
│   │   └── index.ts                       ← TypeScript types
│   └── lib/
│       └── utils.ts                       ← Utility functions

backend/
├── apps/
│   ├── trading/
│   │   ├── models.py                      ← Order, Position, Trade
│   │   ├── views.py                       ← API endpoints
│   │   ├── serializers.py                 ← Data serialization
│   │   ├── services.py                    ← Business logic
│   │   └── urls.py                        ← URL routing
│   └── users/
│       ├── models.py                      ← User, Guest
│       └── views.py                       ← Auth endpoints
├── config/
│   ├── settings.py                        ← Django settings
│   ├── urls.py                            ← Main routing
│   └── wsgi.py                            ← WSGI config
└── manage.py                              ← Django CLI
```

### 🧪 Testing Checklist

#### Chart Display
- [ ] TradingView widget loads without errors
- [ ] Left toolbar with drawing tools visible
- [ ] Top toolbar with timeframes and indicators visible
- [ ] Chart updates when symbol changes
- [ ] Zoom/pan works smoothly
- [ ] Grid and volume toggle works

#### Market Data
- [ ] MarketInfo updates in real-time
- [ ] 24h stats display correctly
- [ ] Funding rate shows for perpetuals
- [ ] WebSocket reconnects on disconnect

#### Order Book
- [ ] Bids show in green color
- [ ] Asks show in red color
- [ ] Depth bars visualize correctly
- [ ] Clicking row sets price in form
- [ ] Updates in real-time

#### Trading Form
- [ ] Buy/Sell toggle works
- [ ] Order type selector works
- [ ] Leverage slider updates values
- [ ] Quantity presets (25%, 50%, 75%, 100%) work
- [ ] Manual price input works
- [ ] Order value calculation is correct
- [ ] Margin requirement shows
- [ ] Form validation works

#### Backend Integration
- [ ] Create guest session: `POST /api/v1/users/guest/`
- [ ] Create order: `POST /api/v1/trading/orders/`
- [ ] Cancel order: `DELETE /api/v1/trading/orders/{id}/`
- [ ] Get wallet: `GET /api/v1/trading/wallet/`
- [ ] List orders: `GET /api/v1/trading/orders/`

#### Responsive Design
- [ ] Mobile layout (< 768px): Tab-based navigation
- [ ] Tablet layout (768px-1024px): 2 columns
- [ ] Desktop layout (> 1024px): 3 columns with chart in center

### 🐛 Known Limitations

1. **No Real Money**: Demo trading only with mock wallet (10,000 USDT)
2. **Guest Sessions**: Uses session keys, not persistent authentication
3. **No Order History**: Orders reset on session refresh
4. **Binance Data Only**: Uses Binance for market data
5. **No Advanced Features Yet**:
   - Copy trading
   - Automated bots
   - API trading
   - Advanced alerts

### 🚧 Future Enhancements

1. **User Authentication**
   - Real user accounts with persistent data
   - Portfolio tracking
   - Trading history

2. **Advanced Charts**
   - Custom indicators
   - Strategy backtesting
   - Alert system

3. **Order Types**
   - More advanced order types
   - Bracket orders
   - OCO (One Cancels Other)

4. **Risk Management**
   - Position sizing recommendations
   - Risk/reward calculator
   - Stop loss/take profit automation

5. **Mobile App**
   - React Native version
   - iOS/Android apps

### 📞 Support & Documentation

- **TradingView Widgets**: https://www.tradingview.com/widget-docs/
- **Binance API**: https://binance-docs.github.io/apidocs/
- **Next.js Docs**: https://nextjs.org/docs
- **Django Docs**: https://docs.djangoproject.com/

### 📄 License

Proprietary - SorooshX Exchange
