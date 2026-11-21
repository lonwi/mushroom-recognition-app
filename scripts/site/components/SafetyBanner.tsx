import React from 'react';
import type { SiteLocale } from '../routes';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';
import { emergencyContacts } from '../../../src/core/safety/emergency-contacts';

interface SafetyBannerProps {
  locale: SiteLocale;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ locale }) => {
  const strings = locale === 'pl' ? pl : en;

  // Pobieramy wyłącznie zweryfikowane kontakty ze źródła prawdy (Q19)
  const verifiedContacts = emergencyContacts.filter((c) => c.verified && c.phone.trim().length > 0);

  return (
    <section className="safety" aria-labelledby="safety-heading">
      <h2 id="safety-heading">{strings.safety.title}</h2>
      <p>
        <strong>{strings.safety.lead}</strong>
      </p>
      <p>{strings.safety.neverEat}</p>
      <p>{strings.safety.poisonSuspected}</p>

      {verifiedContacts.length > 0 && (
        <p>
          {locale === 'pl' ? 'Zweryfikowane numery alarmowe: ' : 'Verified emergency numbers: '}
          {verifiedContacts.map((contact, index) => (
            <React.Fragment key={contact.id}>
              {index > 0 && ', '}
              <a href={`tel:${contact.phone.replace(/\D/g, '')}`}>{contact.phone}</a>
            </React.Fragment>
          ))}
        </p>
      )}

      <p>{strings.safety.sanepidFree}</p>
      <p>
        {strings.safety.gisSourceLabel}{' '}
        <a href={strings.safety.gisSourceUrl} target="_blank" rel="noopener noreferrer">
          {strings.safety.gisSourceName}
        </a>
      </p>
      <p>
        <em>{strings.safety.noVerdictNotice}</em>
      </p>
    </section>
  );
};
