import createMiddleware from 'next-intl/middleware';
import {locales} from './i18n';

export default createMiddleware({
  defaultLocale: 'es',
  locales
});

export const config = {
  matcher: ['/', '/(es|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
