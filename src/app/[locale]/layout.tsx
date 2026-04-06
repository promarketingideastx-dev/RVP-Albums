import {NextIntlClientProvider} from 'next-intl';

import {ThemeProvider} from 'next-themes';
import '../globals.css';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'RVP Albums',
  description: 'Pro Photography Albums Editor',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RVP Albums',
  },
  icons: {
    icon: '/icon-192x192.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthProvider } from '@/context/AuthContext';

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = locale === 'es' ? esMessages : enMessages;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-white dark:bg-neutral-950">
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              {children}
            </ThemeProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
