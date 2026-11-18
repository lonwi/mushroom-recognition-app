import React from 'react';
import type { RouteMeta } from '../routes';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface HeaderProps {
  route: RouteMeta;
  assetPrefix: string;
}

export const Header: React.FC<HeaderProps> = ({ route, assetPrefix }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const isPl = route.locale === 'pl';

  const homeHref = isPl ? `${assetPrefix}/` : `${assetPrefix}/en/`;
  const privacyHref = isPl ? `${assetPrefix}/prywatnosc/` : `${assetPrefix}/en/privacy/`;
  const dataDeletionHref = isPl
    ? `${assetPrefix}/usuniecie-danych/`
    : `${assetPrefix}/en/data-deletion/`;
  const licensesHref = isPl ? `${assetPrefix}/licencje/` : `${assetPrefix}/en/licenses/`;

  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brand" href={homeHref}>
          <img src={`${assetPrefix}/icon.svg`} width={40} height={40} alt="" />
          <span>{strings.common.appName}</span>
        </a>
        <nav className="nav" aria-label={isPl ? 'Nawigacja główna' : 'Main navigation'}>
          <a href={homeHref} aria-current={route.id === 'home' ? 'page' : undefined}>
            {strings.nav.home}
          </a>
          <a href={privacyHref} aria-current={route.id === 'privacy' ? 'page' : undefined}>
            {strings.nav.privacy}
          </a>
          <a
            href={dataDeletionHref}
            aria-current={route.id === 'data-deletion' ? 'page' : undefined}
          >
            {strings.nav.dataDeletion}
          </a>
          <a href={licensesHref} aria-current={route.id === 'licenses' ? 'page' : undefined}>
            {strings.nav.licenses}
          </a>
          {/* Per D-05: EN nie jest linkowane z nawigacji PL. Natomiast z EN można wrócić do PL */}
          {!isPl && (
            <a href={`${assetPrefix}/`} lang="pl" hrefLang="pl">
              Polski
            </a>
          )}
        </nav>
      </div>
    </header>
  );
};
