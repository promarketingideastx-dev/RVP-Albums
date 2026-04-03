import {getRequestConfig} from 'next-intl/server';
import enMessages from './messages/en.json';
import esMessages from './messages/es.json';

export const locales = ['en', 'es'];

export default getRequestConfig(async ({locale}) => {
  // Graceful fallback for Vercel Edge Serverless
  let activeLocale = locale || 'en';
  if (!locales.includes(activeLocale as string)) activeLocale = 'en';

  const messages = activeLocale === 'es' ? esMessages : enMessages;

  return {
    locale: activeLocale as string,
    messages
  };
});
