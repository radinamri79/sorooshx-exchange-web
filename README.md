# SorooshX Exchange

A professional cryptocurrency futures trading platform built with Django (backend) and Next.js (frontend) in a monorepo architecture.

![SorooshX Trading Platform](https://via.placeholder.com/1200x630/0b0e11/f0b90b?text=SorooshX+Futures+Trading)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Local Development](#-local-development)
- [Docker Deployment](#-docker-deployment)
- [Production Deployment](#-production-deployment)
- [Vercel Deployment](#-vercel-deployment)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Contributing](#-contributing)

## ✨ Features

### Trading Interface
- **Professional Bitget-like Layout**: 3-column responsive design with chart in center
- **Real-time TradingView Charts**: 
  - Official TradingView Advanced Chart widget
  - Left-side drawing toolbar (fibonacci, trend lines, shapes, text)
  - Top toolbar with timeframes (1m-1w), chart types, and 100+ indicators
  - Real-time candlestick data from Binance
- **Real-time Market Data**: Live prices, funding rates, 24h stats via WebSocket
- **Order Book**: Real-time bid/ask depth with visualization
- **Trading Form**: Leverage (1-125x), order types, quantity presets
- **Order Management**: Create, cancel, view active orders and positions
- **Multi-Source Fallback**: Binance → OKX → Bybit → Bitget → CoinGecko
- **Responsive Design**: Desktop (3-col), Tablet (2-col), Mobile (tabs)

### Order Management
- **Order Types**: Limit and Market orders
- **Leverage**: 1x to 125x with slider/quick buttons
- **Margin Modes**: Cross and Isolated margin
- **Position Management**: Real-time P&L, TP/SL settings

### Data Integrity & Reliability
- **Zero Mock Data**: Only real market data or clearly marked cached/unavailable states
- **Intelligent Fallback**: Seamless switching between 5 data sources
- **Smart Caching**: Real data cached with localStorage for offline fallback
- **Status Indicators**: Users always know if data is LIVE, CACHED, or UNAVAILABLE
- **Geo-Bypass**: Works even when primary exchanges are geo-blocked

### User Experience
- **Dark Theme**: Professional trading interface with dark backgrounds
- **Multi-language**: English (LTR) and Persian (RTL) support
- **Guest Sessions**: Trade without registration, upgrade anytime
- **Real-time Updates**: WebSocket-powered live data streams

## 🏗️ Architecture

```
sorooshx-exchange-web/
├── backend/                 # Django REST API + WebSocket
│   ├── apps/
│   │   ├── trading/        # Orders, Positions, Wallet
│   │   └── users/          # Authentication, Guest Sessions
│   ├── config/             # Django settings (base, dev, prod)
│   ├── Dockerfile          # Multi-stage Docker build
│   └── entrypoint.sh       # Container startup script
├── frontend/               # Next.js 15 + TypeScript
│   ├── src/
│   │   ├── app/           # App Router pages (i18n routes)
│   │   ├── components/    # React components (trading, ui)
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API & WebSocket services
│   │   └── lib/           # Utilities and helpers
│   ├── messages/          # i18n translations (en, fa)
│   ├── Dockerfile         # Multi-stage Docker build
│   └── vercel.json        # Vercel deployment config
├── docker-compose.yml      # Unified dev/prod environment
├── package.json            # Root scripts
└── .env.example           # Environment template
```

## 📦 Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | 4.0 | Utility-first styling |
| Zustand | 5.0 | State management |
| TradingView | - | Lightweight Charts |
| next-intl | 4.1 | Internationalization |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Django | 5.0 | Web framework |
| Django REST Framework | 3.15 | REST API |
| Django Channels | 4.0 | WebSocket support |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Cache & Channel layers |
| Daphne | - | ASGI server |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Vercel | Frontend deployment |

## 🔧 Prerequisites

- **Node.js** 20+ (with npm)
- **Python** 3.12+
- **Docker** & Docker Compose
- **PostgreSQL** 16+ (if running locally)
- **Redis** 7+ (if running locally)

## 🚀 Local Development

### Option 1: Full Local Setup

1. **Clone the repository:**
```bash
git clone https://github.com/sorooshx/sorooshx-exchange-web.git
cd sorooshx-exchange-web
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure services:**
```bash
docker-compose up -d db redis
```

4. **Set up the backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # Optional: create admin user
cd ..
```

5. **Set up the frontend:**
```bash
cd frontend
npm install
cd ..
```

6. **Start development servers:**
```bash
# Terminal 1 - Backend
cd backend && source .venv/bin/activate && python manage.py runserver

# Terminal 2 - Frontend
cd frontend && npm run dev
```

7. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Django Admin: http://localhost:8000/admin

### Option 2: Using Root npm Scripts

```bash
# Install all dependencies
npm install

# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend
npm run dev:backend
```

## 🐳 Docker Deployment

### Development with Docker

```bash
# Start all services (db, redis, backend, frontend)
docker-compose up --build

# Start in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production with Docker

1. **Update environment for production:**
```bash
# Edit .env with production values:
nano .env

# Set these values:
BACKEND_TARGET=production
FRONTEND_TARGET=runner
DEBUG=False
NODE_ENV=production
SECRET_KEY=your-super-secret-key-here
POSTGRES_PASSWORD=secure-password-here
```

2. **Build and start:**
```bash
docker-compose up -d --build
```

3. **The entrypoint script automatically runs:**
   - Database migrations
   - Static file collection
   - Server startup

## ☁️ Cloud Deployment

### Backend Deployment (Railway/Render)

**Railway.app:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Frontend Deployment (Vercel)

## 🔺 Vercel Deployment

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sorooshx/sorooshx-exchange-web&root-directory=frontend)

### Manual Deployment

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy from frontend directory:**
```bash
cd frontend
vercel
```

4. **Configure environment variables in Vercel Dashboard:**
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com/ws
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
```

5. **Deploy to production:**
```bash
vercel --prod
```

### Vercel Project Settings

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Output Directory:** `.next`
- **Root Directory:** `frontend`

### Custom Domain Setup

1. Go to your Vercel project settings
2. Navigate to **Domains**
3. Add your custom domain
4. Configure DNS records as shown by Vercel

## 🔐 Environment Variables

### Backend (.env)
```bash
# Django
DEBUG=False
SECRET_KEY=your-super-secret-key-min-50-chars
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com

# Database
POSTGRES_USER=sorooshx
POSTGRES_PASSWORD=secure-password
POSTGRES_DB=sorooshx_exchange
DATABASE_URL=postgres://user:pass@host:5432/db

# Redis
REDIS_URL=redis://:password@host:6379/0
REDIS_PASSWORD=secure-redis-password
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com/ws
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
```

### Generating Secret Key
```python
# Run this command to generate a Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 📚 API Documentation

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/trading/symbols/` | List trading pairs |
| GET | `/api/v1/trading/positions/` | Get user positions |
| GET | `/api/v1/trading/positions/{id}/` | Get single position |
| POST | `/api/v1/trading/orders/` | Create order |
| GET | `/api/v1/trading/orders/` | List orders |
| DELETE | `/api/v1/trading/orders/{id}/` | Cancel order |
| GET | `/api/v1/trading/wallet/` | Get wallet balance |
| POST | `/api/v1/users/guest-session/` | Create guest session |
| POST | `/api/v1/users/register/` | Register account |
| POST | `/api/v1/users/login/` | Login |

### Multi-Source Data

The platform automatically fetches real market data from multiple sources with intelligent fallback:

**WebSocket Sources (Real-time):**
1. Binance (`wss://stream.binance.com:9443`)
2. OKX (`wss://ws.okx.com:8443/ws/v5/public`)
3. Bybit (`wss://stream.bybit.com/v5/public/spot`)

**REST API Fallback:**
4. Bitget (REST API)
5. CoinGecko (Last resort, always available)

See [MULTI_SOURCE_DATA.md](./MULTI_SOURCE_DATA.md) for detailed documentation.

### WebSocket Streams (Binance)

```javascript
// Ticker stream
const ticker = new WebSocket('wss://fstream.binance.com/ws/btcusdt@ticker');

// Orderbook depth
const depth = new WebSocket('wss://fstream.binance.com/ws/btcusdt@depth@100ms');

// Kline/Candlestick
const kline = new WebSocket('wss://fstream.binance.com/ws/btcusdt@kline_1m');

// Trades
const trades = new WebSocket('wss://fstream.binance.com/ws/btcusdt@trade');
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend

# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Backend Tests
```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=apps

# Run specific test file
pytest apps/trading/tests/test_orders.py
```

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start frontend + backend
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Build
npm run build            # Build frontend for production

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run all tests
npm run test:frontend    # Run frontend tests
npm run test:backend     # Run backend tests

# Database
npm run db:migrate       # Run Django migrations
npm run db:makemigrations # Create new migrations

# Docker
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Frontend: ESLint + Prettier
- Backend: Black + isort + flake8

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Binance API](https://binance-docs.github.io/apidocs/) for market data
- [TradingView](https://tradingview.github.io/lightweight-charts/) for charting library
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [next-intl](https://next-intl-docs.vercel.app/) for internationalization

---

Built with ❤️ by the SorooshX Team
