import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SorooshX Exchange',
  description: 'Professional cryptocurrency futures trading platform',
  keywords: ['crypto', 'trading', 'futures', 'bitcoin', 'exchange'],
  authors: [{ name: 'SorooshX Team' }],
  openGraph: {
    title: 'SorooshX Exchange',
    description: 'Professional cryptocurrency futures trading platform',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SorooshX Exchange',
    description: 'Professional cryptocurrency futures trading platform',
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
