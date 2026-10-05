import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  INCOMPLETE_LOOKALIKE_BODY,
  INCOMPLETE_LOOKALIKE_TITLE,
  LookAlikeAlert,
} from '../../components/LookAlikeAlert';
import { INCOMPLETE_CARD_LABEL } from '../../components/EdibilityBadge';
import { ConfusionRisk } from '../../types/mushroom';

describe('LookAlikeAlert RTL Component Tests', () => {
  it('does not treat an empty list as an all-clear', async () => {
    const { getByTestId, getByText, queryByText } = await render(<LookAlikeAlert risks={[]} />);

    expect(getByTestId('lookalike-incomplete')).toBeTruthy();
    expect(getByText(INCOMPLETE_LOOKALIKE_TITLE)).toBeTruthy();
    expect(getByText(INCOMPLETE_LOOKALIKE_BODY)).toBeTruthy();
    expect(queryByText(/Brak niebezpiecznych sobowtórów/)).toBeNull();
    expect(queryByText(/nie posiada w Polsce/)).toBeNull();
  });

  it('shows a sourced clearance only when the data states one explicitly', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <LookAlikeAlert risks={[]} noDangerousLookAlikesSource="Atlas X, wyd. 2, s. 10" />
    );

    expect(getByTestId('lookalike-sourced-clearance')).toBeTruthy();
    expect(getByText(/Atlas X, wyd. 2, s. 10/)).toBeTruthy();
    expect(getByText(/potwierdź oznaczenie u grzyboznawcy/)).toBeTruthy();
    expect(queryByTestId('lookalike-incomplete')).toBeNull();
    expect(queryByTestId('lookalike-sourced-clearance')).toBeTruthy();
  });

  it('ignores a sourced clearance when look-alikes are actually listed', async () => {
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: ['Goryczak ma gorzki smak i ciemną siateczkę'],
        fatal: false,
      },
    ];

    const { getByText, queryByTestId } = await render(
      <LookAlikeAlert risks={risks} noDangerousLookAlikesSource="nie powinno się pokazać" />
    );

    expect(getByText('Uwaga na możliwe pomyłki')).toBeTruthy();
    expect(queryByTestId('lookalike-sourced-clearance')).toBeNull();
    expect(queryByTestId('lookalike-incomplete')).toBeNull();
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

  it('links a look-alike only when that id has a card', async () => {
    const onOpenSpecies = jest.fn();
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: ['Ma pochwę'],
        fatal: true,
      },
      {
        confusedWithId: 'not_in_atlas',
        confusedWithName: 'Gatunek bez karty',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: ['Brak karty'],
        fatal: false,
      },
    ];

    const { getByTestId, queryByTestId } = await render(
      <LookAlikeAlert
        risks={risks}
        catalogIds={new Set(['amanita_phalloides'])}
        onOpenSpecies={onOpenSpecies}
      />
    );

    fireEvent.press(getByTestId('lookalike-link-amanita_phalloides'));
    expect(onOpenSpecies).toHaveBeenCalledWith('amanita_phalloides');
    expect(queryByTestId('lookalike-link-not_in_atlas')).toBeNull();
    expect(getByTestId('lookalike-unlinked-not_in_atlas')).toBeTruthy();
  });

  it('replaces the green edible badge when the look-alike card is incomplete', async () => {
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'russula_virescens',
        confusedWithName: 'Gołąbek zielonawy',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: ['Brak pierścienia i pochwy'],
        fatal: true,
      },
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: ['Ruchomy pierścień'],
        fatal: true,
      },
    ];

    const { getByTestId, getAllByText, queryByTestId } = await render(<LookAlikeAlert risks={risks} />);

    expect(getByTestId('incomplete-card-badge-russula_virescens')).toBeTruthy();
    expect(getAllByText(INCOMPLETE_CARD_LABEL)).toHaveLength(1);
    expect(getAllByText('JADALNY')).toHaveLength(1);
    expect(queryByTestId('incomplete-card-badge-macrolepiota_procera')).toBeNull();
  });
});
