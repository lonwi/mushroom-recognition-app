export type SiteLocale = 'pl' | 'en';

type RouteId = 'home' | 'privacy' | 'data-deletion' | 'licenses' | 'not-found';

export interface RouteMeta {
  id: RouteId;
  locale: SiteLocale;
  path: string;
  outputFile: string;
  canonicalPath: string;
  alternate?: {
    locale: SiteLocale;
    path: string;
  };
}

export const routes: readonly RouteMeta[] = [
  // Strony w języku polskim (PL)
  {
    id: 'home',
    locale: 'pl',
    path: '/',
    outputFile: 'index.html',
    canonicalPath: './',
  },
  {
    id: 'privacy',
    locale: 'pl',
    path: '/prywatnosc/',
    outputFile: 'prywatnosc/index.html',
    canonicalPath: './',
  },
  {
    id: 'data-deletion',
    locale: 'pl',
    path: '/usuniecie-danych/',
    outputFile: 'usuniecie-danych/index.html',
    canonicalPath: './',
  },
  {
    id: 'licenses',
    locale: 'pl',
    path: '/licencje/',
    outputFile: 'licencje/index.html',
    canonicalPath: './',
  },

  // Strony w języku angielskim (EN) - wygenerowane, niepodlinkowane w nawigacji PL (D-05)
  {
    id: 'home',
    locale: 'en',
    path: '/en/',
    outputFile: 'en/index.html',
    canonicalPath: './',
    alternate: {
      locale: 'pl',
      path: '../',
    },
  },
  {
    id: 'privacy',
    locale: 'en',
    path: '/en/privacy/',
    outputFile: 'en/privacy/index.html',
    canonicalPath: './',
    alternate: {
      locale: 'pl',
      path: '../../prywatnosc/',
    },
  },
  {
    id: 'data-deletion',
    locale: 'en',
    path: '/en/data-deletion/',
    outputFile: 'en/data-deletion/index.html',
    canonicalPath: './',
    alternate: {
      locale: 'pl',
      path: '../../usuniecie-danych/',
    },
  },
  {
    id: 'licenses',
    locale: 'en',
    path: '/en/licenses/',
    outputFile: 'en/licenses/index.html',
    canonicalPath: './',
    alternate: {
      locale: 'pl',
      path: '../../licencje/',
    },
  },

  // Strona 404
  {
    id: 'not-found',
    locale: 'pl',
    path: '/404.html',
    outputFile: '404.html',
    canonicalPath: './404.html',
  },
] as const;
