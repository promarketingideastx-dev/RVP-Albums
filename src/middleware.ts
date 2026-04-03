import createMiddleware from 'next-intl/middleware';
import {locales} from './i18n';

export default createMiddleware({
  defaultLocale: 'en',
  locales
});

export const config = {
  matcher: ['/', '/(es|en)/:path*']
};
