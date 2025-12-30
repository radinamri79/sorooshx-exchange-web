# Vercel Deployment Guide for SorooshX Exchange

This guide provides step-by-step instructions for deploying the SorooshX Exchange frontend to Vercel.

## ✅ Pre-Deployment Checklist

Before deploying to Vercel, ensure the following:

- [x] Build succeeds locally (`npm run build`)
- [x] TypeScript type checking passes (`npm run type-check`)
- [x] No critical errors in code
- [x] `vercel.json` is configured properly
- [x] Environment variables are documented

## 🚀 Deployment Methods

### Method 1: Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import project on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure the project:
     - **Root Directory:** `frontend`
     - **Framework Preset:** Next.js (auto-detected)
     - **Build Command:** `npm run build`
     - **Install Command:** `npm install`

3. **Configure Environment Variables**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   | Variable | Value | Required |
   |----------|-------|----------|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend.com/api/v1` | Optional* |
   | `NEXT_PUBLIC_WS_URL` | `wss://your-backend.com/ws` | Optional* |
   | `NEXT_PUBLIC_BINANCE_WS_URL` | `wss://fstream.binance.com` | Optional |

   > *Optional because the frontend uses multi-source API routes that fetch directly from exchanges. Only needed if you have a custom backend.

4. **Deploy**
   Click "Deploy" and wait for the build to complete.

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Login to Vercel
vercel login

# Deploy (preview)
vercel

# Deploy to production
vercel --prod
```

## 📋 Environment Variables

### Frontend-Only Mode (No Backend)

The SorooshX frontend works standalone without a backend! The multi-source API routes fetch data directly from exchanges:

- **Ticker Data:** Binance → OKX → Bybit → Bitget → CoinGecko
- **Chart Data:** Binance → OKX → Bybit → Bitget
- **Orderbook:** Binance → OKX → Bybit → Bitget

For frontend-only mode, you only need:
```env
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
```

### With Django Backend

If you're connecting to the Django backend for orders/positions:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
```

## 🔧 Vercel Configuration

The `vercel.json` file includes:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "regions": ["fra1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Key Settings:
- **Region:** Frankfurt (fra1) for better access to European exchange endpoints
- **Function Timeout:** 30 seconds for API routes (needed for multi-source fallback)
- **Security Headers:** Configured for XSS protection, CSRF, HSTS

## 🌐 API Routes

The frontend includes Next.js API routes that proxy exchange requests:

| Route | Purpose |
|-------|---------|
| `/api/binance/ticker` | Price and 24h stats |
| `/api/binance/klines` | Chart candlestick data |
| `/api/binance/depth` | Orderbook depth |
| `/api/binance/exchangeInfo` | Trading pairs info |
| `/api/binance/premiumIndex` | Mark price & funding rate |

These routes automatically try multiple exchanges (Binance → OKX → Bybit → Bitget → CoinGecko) to ensure data availability.

## ❗ Important Notes

### Geo-Restrictions
Some regions block Binance API. The multi-source fallback handles this automatically by trying other exchanges.

### WebSocket Connections
- Real-time prices use WebSocket connections to Binance
- If Binance is blocked, the system falls back to polling the API routes

### Build Output
The build uses `output: 'standalone'` for optimal edge deployment.

### CORS
The API routes handle CORS headers automatically. No additional configuration needed.

## 🔍 Troubleshooting

### Build Fails
1. Check for TypeScript errors: `npm run type-check`
2. Check for ESLint errors: `npm run lint`
3. Ensure all dependencies are in `package.json`

### API Routes Timeout
- Increase `maxDuration` in `vercel.json` if needed
- The default 30s should be sufficient for 5-source fallback

### No Market Data
- Check browser console for API errors
- Verify the API routes are accessible: `/api/binance/ticker?symbol=BTCUSDT`
- Check if your region blocks exchange APIs

### WebSocket Disconnects
- This is normal; the client automatically reconnects
- Check the connection status indicator in the UI

## 📊 Post-Deployment

After deployment:

1. **Test the application:**
   - Visit your Vercel URL
   - Check that prices load
   - Verify chart displays candles
   - Confirm orderbook shows bids/asks

2. **Monitor logs:**
   - Go to Vercel Dashboard → Logs
   - Watch for API route errors

3. **Set up custom domain (optional):**
   - Go to Vercel Dashboard → Settings → Domains
   - Add your domain and configure DNS

## 🔗 Related Docs

- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
