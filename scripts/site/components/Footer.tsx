import React from 'react';
import type { RouteMeta } from '../routes';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface FooterProps {
  route: RouteMeta;
  assetPrefix: string;
}

export const Footer: React.FC<FooterProps> = ({ route, assetPrefix }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const isPl = route.locale === 'pl';

  const privacyHref = isPl ? `${assetPrefix}/prywatnosc/` : `${assetPrefix}/en/privacy/`;
  const dataDeletionHref = isPl
    ? `${assetPrefix}/usuniecie-danych/`
    : `${assetPrefix}/en/data-deletion/`;
  const licensesHref = isPl ? `${assetPrefix}/licencje/` : `${assetPrefix}/en/licenses/`;

  return (
    <footer className="site-footer">
      <div className="wrap">
        <p className="footer-safety">
          {strings.safety.lead} {strings.safety.neverEat}
        </p>
        <ul className="footer-links">
          <li>
            <a href={privacyHref}>{strings.nav.privacy}</a>
          </li>
          <li>
            <a href={dataDeletionHref}>{strings.nav.dataDeletion}</a>
          </li>
          <li>
            <a href={licensesHref}>{strings.nav.licenses}</a>
          </li>
          <li>
            <a href={strings.common.repoUrl} target="_blank" rel="noopener noreferrer">
              {isPl ? 'Kod źródłowy' : 'Source Code'}
            </a>
          </li>
          <li>
            <a href={strings.common.issuesUrl} target="_blank" rel="noopener noreferrer">
              {isPl ? 'Zgłoszenia' : 'Issues'}
            </a>
          </li>
          <li>
            <a href={`mailto:${strings.common.contactEmail}`}>{strings.common.contactEmail}</a>
          </li>
        </ul>
        <p className="copyright">{strings.common.copyright}</p>
      </div>
    </footer>
  );
};
