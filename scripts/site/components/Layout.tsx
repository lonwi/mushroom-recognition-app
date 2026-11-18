import React from 'react';
import type { RouteMeta } from '../routes';
import { Header } from './Header';
import { Footer } from './Footer';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface LayoutProps {
  route: RouteMeta;
  title: string;
  description: string;
  assetPrefix: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  route,
  title,
  description,
  assetPrefix,
  children,
}) => {
  const strings = route.locale === 'pl' ? pl : en;

  return (
    <html lang={route.locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'"
        />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#1B382B" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#121614" media="(prefers-color-scheme: dark)" />
        <title>{title}</title>
        <link rel="icon" href={`${assetPrefix}/icon.svg`} type="image/svg+xml" />
        <link rel="stylesheet" href={`${assetPrefix}/css/site.css`} />
        <link rel="canonical" href={route.canonicalPath} />
        {route.alternate && (
          <link rel="alternate" hrefLang={route.alternate.locale} href={route.alternate.path} />
        )}
      </head>
      <body>
        <a className="skip" href="#tresc">
          {strings.common.skipToContent}
        </a>
        <Header route={route} assetPrefix={assetPrefix} />
        <main id="tresc" className="wrap page">
          {children}
        </main>
        <Footer route={route} assetPrefix={assetPrefix} />
      </body>
    </html>
  );
};
