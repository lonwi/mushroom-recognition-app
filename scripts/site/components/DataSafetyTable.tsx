import React from 'react';
import type { SiteLocale } from '../routes';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

interface DataSafetyTableProps {
  locale: SiteLocale;
}

export const DataSafetyTable: React.FC<DataSafetyTableProps> = ({ locale }) => {
  const strings = locale === 'pl' ? pl : en;
  const t = strings.privacy.dataSafetyTable;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{t.category}</th>
            <th scope="col">{t.collected}</th>
            <th scope="col">{t.shared}</th>
            <th scope="col">{t.purpose}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t.rowPersonal}</th>
            <td>{t.no}</td>
            <td>{t.noSharing}</td>
            <td>—</td>
          </tr>
          <tr>
            <th scope="row">{t.rowPhotos}</th>
            <td>{t.no}</td>
            <td>{t.noSharing}</td>
            <td>{t.localOnly}</td>
          </tr>
          <tr>
            <th scope="row">{t.rowLocation}</th>
            <td>{t.no}</td>
            <td>{t.noSharing}</td>
            <td>—</td>
          </tr>
          <tr>
            <th scope="row">{t.rowDiagnostics}</th>
            <td>{t.no}</td>
            <td>{t.noSharing}</td>
            <td>{t.optInShare}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
