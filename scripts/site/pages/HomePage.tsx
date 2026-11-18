import React from 'react';
import type { RouteMeta } from '../routes';
import { SafetyBanner } from '../components/SafetyBanner';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface HomePageProps {
  route: RouteMeta;
}

export const HomePage: React.FC<HomePageProps> = ({ route }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const t = strings.home;

  return (
    <article>
      <header className="hero">
        <span className="badge">{strings.common.previewBadge}</span>
        <h1>{t.heroTitle}</h1>
        <p className="lead">{t.heroLead}</p>
        <p>{t.statusNotice}</p>
      </header>

      <SafetyBanner locale={route.locale} />

      <section aria-labelledby="pillars-heading">
        <h2 id="pillars-heading">{t.pillarsTitle}</h2>
        <div className="grid grid-3">
          <article className="card">
            <h3>{t.scannerTitle}</h3>
            <p>{t.scannerDesc}</p>
          </article>
          <article className="card">
            <h3>{t.atlasTitle}</h3>
            <p>{t.atlasDesc}</p>
          </article>
          <article className="card">
            <h3>{t.helpTitle}</h3>
            <p>{t.helpDesc}</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">{t.offlineFirstTitle}</h2>
        <p>{t.offlineFirstDesc}</p>
      </section>
    </article>
  );
};
