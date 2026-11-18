import React from 'react';
import type { RouteMeta } from '../routes';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface DataDeletionPageProps {
  route: RouteMeta;
}

export const DataDeletionPage: React.FC<DataDeletionPageProps> = ({ route }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const t = strings.dataDeletion;

  return (
    <article>
      <header>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>

      <section aria-labelledby="remote-data-heading">
        <h2 id="remote-data-heading">{t.noRemoteDataTitle}</h2>
        <p>{t.noRemoteDataDesc}</p>
      </section>

      <section aria-labelledby="how-to-delete-heading">
        <h2 id="how-to-delete-heading">{t.howToDeleteTitle}</h2>
        <p>{t.howToDeleteDesc}</p>
        <ul className="list-styled">
          <li>{t.stepClearData}</li>
          <li>{t.stepUninstall}</li>
        </ul>
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">{route.locale === 'pl' ? 'Kontakt' : 'Contact'}</h2>
        <p>
          {t.contactQuestion}{' '}
          <a href={`mailto:${strings.common.contactEmail}`}>{strings.common.contactEmail}</a>.
        </p>
      </section>
    </article>
  );
};
