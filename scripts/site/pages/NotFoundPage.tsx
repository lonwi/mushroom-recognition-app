import React from 'react';
import type { RouteMeta } from '../routes';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface NotFoundPageProps {
  route: RouteMeta;
  assetPrefix: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ route, assetPrefix }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const t = strings.notFound;
  const homeHref = `${assetPrefix}/`;

  return (
    <article>
      <header>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>
      <p>
        <a href={homeHref}>{t.backHome}</a>
      </p>
    </article>
  );
};
