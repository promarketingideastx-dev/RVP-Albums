import {NextIntlClientProvider} from 'next-intl';

import {ThemeProvider} from 'next-themes';
import '../globals.css';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';

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
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
