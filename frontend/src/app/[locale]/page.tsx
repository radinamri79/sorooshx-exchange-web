import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Redirect to default futures page
  redirect(`/${locale}/futures/BTCUSDT`);
}
