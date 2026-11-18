import React from 'react';
import type { RouteMeta } from '../routes';
import { DataSafetyTable } from '../components/DataSafetyTable';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface PrivacyPageProps {
  route: RouteMeta;
  assetPrefix: string;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ route, assetPrefix }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const t = strings.privacy;
  const isPl = route.locale === 'pl';
  const dataDeletionHref = isPl
    ? `${assetPrefix}/usuniecie-danych/`
    : `${assetPrefix}/en/data-deletion/`;

  return (
    <article>
      <header>
        <h1>{t.title}</h1>
        <p className="badge">{t.effectiveDate}</p>
        <p className="lead">{t.lead}</p>
      </header>

      <section aria-labelledby="admin-heading">
        <h2 id="admin-heading">{t.adminTitle}</h2>
        <p>{t.adminDesc}</p>
      </section>

      <section aria-labelledby="collection-heading">
        <h2 id="collection-heading">{t.dataCollectionTitle}</h2>
        <p>{t.dataCollectionDesc}</p>
        <ul className="list-styled">
          {t.dataCollectionPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="permissions-heading">
        <h2 id="permissions-heading">{t.permissionsTitle}</h2>
        <p>{t.permissionsDesc}</p>
        <ul className="list-styled">
          <li>{t.permissionCamera}</li>
          <li>{t.permissionStorage}</li>
        </ul>
      </section>

      <section aria-labelledby="diagnostics-heading">
        <h2 id="diagnostics-heading">{t.diagnosticsTitle}</h2>
        <p>{t.diagnosticsDesc}</p>
      </section>

      <section aria-labelledby="datasafety-heading">
        <h2 id="datasafety-heading">{t.dataSafetyTitle}</h2>
        <p>{t.dataSafetyLead}</p>
        <DataSafetyTable locale={route.locale} />
        <p>
          <a href={dataDeletionHref}>{t.dataDeletionLinkText}</a>
        </p>
      </section>
    </article>
  );
};
