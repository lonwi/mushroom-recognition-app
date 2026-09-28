import React from 'react';
import { render } from '@testing-library/react-native';
import { LookAlikeAlert } from '../../components/LookAlikeAlert';
import { ConfusionRisk } from '../../types/mushroom';

describe('LookAlikeAlert RTL Component Tests', () => {
  it('renders safe container when no look-alikes exist', async () => {
    const { getByText } = await render(<LookAlikeAlert risks={[]} />);
    expect(getByText('✓ Brak niebezpiecznych sobowtórów')).toBeTruthy();
  });

  it('renders fatal warning card for dangerous look-alikes', async () => {
    const deadlyRisks: ConfusionRisk[] = [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Kania ma pierścień ruchomy (muchomor ma przyrośnięty)',
          'Muchomor ma wyraźną pochwę w ziemi (kania nie ma)',
        ],
        fatal: true,
      },
    ];

    const { getByText } = await render(<LookAlikeAlert risks={deadlyRisks} />);
    expect(getByText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!')).toBeTruthy();
    expect(getByText('Można pomylić z: Muchomor sromotnikowy')).toBeTruthy();
    expect(getByText('Kania ma pierścień ruchomy (muchomor ma przyrośnięty)')).toBeTruthy();
    expect(getByText('Muchomor ma wyraźną pochwę w ziemi (kania nie ma)')).toBeTruthy();
  });

  it('renders warning card for non-fatal inedible look-alikes', async () => {
    const inedibleRisks: ConfusionRisk[] = [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: ['Goryczak ma gorzki smak i ciemną siateczkę'],
        fatal: false,
      },
    ];

    const { getByText } = await render(<LookAlikeAlert risks={inedibleRisks} />);
    expect(getByText('Uwaga na możliwe pomyłki')).toBeTruthy();
    expect(getByText('Można pomylić z: Goryczak żółciowy')).toBeTruthy();
  });
});
