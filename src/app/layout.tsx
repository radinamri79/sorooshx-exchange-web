import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SorooshX - Crypto Futures Trading Platform',
  description: 'Professional cryptocurrency futures trading platform with advanced charting, real-time data, and secure trading',
  keywords: ['crypto', 'trading', 'futures', 'bitcoin', 'exchange', 'BTC', 'USDT', 'leverage trading'],
  authors: [{ name: 'SorooshX Team' }],
  icons: {
    icon: [
      { url: '/sorooshx-logo-web.png', type: 'image/png' },
    ],
    apple: '/sorooshx-logo-web.png',
    shortcut: '/sorooshx-logo-web.png',
  },
  openGraph: {
    title: 'SorooshX - Crypto Futures Trading Platform',
    description: 'Professional cryptocurrency futures trading platform with advanced charting and real-time data',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'fa_IR',
    images: [
      {
        url: '/sorooshx-logo-web.png',
        width: 1200,
        height: 630,
        alt: 'SorooshX Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SorooshX - Crypto Futures Trading Platform',
    description: 'Professional cryptocurrency futures trading platform',
    images: ['/sorooshx-logo-web.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
