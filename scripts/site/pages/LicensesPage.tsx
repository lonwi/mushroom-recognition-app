import React from 'react';
import type { RouteMeta } from '../routes';
import { loadPhotoAttributions } from '../attribution';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface LicensesPageProps {
  route: RouteMeta;
}

export const LicensesPage: React.FC<LicensesPageProps> = ({ route }) => {
  const strings = route.locale === 'pl' ? pl : en;
  const t = strings.licenses;
  const attributions = loadPhotoAttributions();

  return (
    <article>
      <header>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>

      <section aria-labelledby="code-heading">
        <h2 id="code-heading">{t.codeTitle}</h2>
        <p>{t.codeKerasDesc}</p>
        <p>{t.codeAppDesc}</p>
      </section>

      <section aria-labelledby="weights-heading">
        <h2 id="weights-heading">{t.modelWeightsTitle}</h2>
        <p>{t.modelWeightsDesc}</p>
      </section>

      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading">{t.photosTitle}</h2>
        <p>{t.photosDesc}</p>
        <ul className="list-styled">
          {t.photoLicensesList.map((lic, index) => (
            <li key={index}>{lic}</li>
          ))}
        </ul>
        <p>{t.photosAttributionNote}</p>

        {attributions.length === 0 ? (
          <p>
            <em>{t.emptyAttributionsNotice}</em>
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{route.locale === 'pl' ? 'Gatunek' : 'Species'}</th>
                  <th scope="col">{route.locale === 'pl' ? 'Autor' : 'Author'}</th>
                  <th scope="col">{route.locale === 'pl' ? 'Licencja' : 'License'}</th>
                  <th scope="col">{route.locale === 'pl' ? 'Źródło' : 'Source'}</th>
                </tr>
              </thead>
              <tbody>
                {attributions.map((item, idx) => (
                  <tr key={`${item.speciesId}-${item.author}-${idx}`}>
                    <td>
                      <em>{item.speciesId}</em>
                    </td>
                    <td>{item.author}</td>
                    <td>
                      <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">
                        {item.license.toUpperCase()}
                      </a>
                    </td>
                    <td>
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {item.source}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
};
