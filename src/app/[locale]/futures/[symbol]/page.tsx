import { TradingPageClient } from '@/components/trading/TradingPageClient';
import { setRequestLocale } from 'next-intl/server';

interface FuturesPageProps {
  params: Promise<{
    locale: string;
    symbol: string;
  }>;
}

export async function generateMetadata({ params }: FuturesPageProps) {
  const { symbol } = await params;
  const symbolUpper = symbol.toUpperCase();
  const baseAsset = symbolUpper.replace('USDT', '');

  return {
    title: `${baseAsset}/USDT Perpetual | SorooshX`,
    description: `Trade ${baseAsset}/USDT perpetual futures with up to 125x leverage on SorooshX`,
  };
}

export default async function FuturesPage({ params }: FuturesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TradingPageClient locale={locale} />;
}
