import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  INCOMPLETE_LOOKALIKE_BODY,
  INCOMPLETE_LOOKALIKE_TITLE,
  LookAlikeAlert,
} from '../../components/LookAlikeAlert';
import { INCOMPLETE_CARD_LABEL, MISSING_CARD_LABEL } from '../../components/EdibilityBadge';
import { ATLAS_NO_VERDICT_NOTE, MUSHROOMS_DATABASE, NOT_FOR_COLLECTION_NOTE } from '../../data/mushrooms';
import { ConfusionRisk } from '../../types/mushroom';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';

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

  it('does not show the green edible badge for a look-alike that has no finished card', async () => {
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'calocybe_gambosa',
        confusedWithName: 'Gęśnica wiosenna (majówka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: ['Nie czerwienieje'],
        fatal: false,
      },
    ];

    const { getByTestId, getByText, queryByText } = await render(
      <LookAlikeAlert
        risks={risks}
        catalogIds={new Set(['inocybe_erubescens'])}
        onOpenSpecies={() => {}}
      />
    );

    expect(getByTestId('lookalike-unlinked-calocybe_gambosa')).toBeTruthy();
    expect(getByTestId('missing-card-badge-calocybe_gambosa')).toBeTruthy();
    expect(getByText(MISSING_CARD_LABEL)).toBeTruthy();
    expect(getByText(new RegExp(ATLAS_NO_VERDICT_NOTE))).toBeTruthy();
    expect(queryByText(NOT_FOR_COLLECTION_NOTE)).toBeNull();
    expect(queryByText(INCOMPLETE_CARD_LABEL)).toBeNull();
    expect(queryByText('JADALNY')).toBeNull();
  });

  it('never shows a green badge for an entry without catalogIds', async () => {
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'calocybe_gambosa',
        confusedWithName: 'Gęśnica wiosenna (majówka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: ['Nie czerwienieje'],
        fatal: false,
      },
      {
        confusedWithId: 'amanita_excelsa',
        confusedWithName: 'Muchomor twardawy',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: ['Pierścień prążkowany'],
        fatal: false,
      },
    ];

    const { getAllByText, queryByText } = await render(<LookAlikeAlert risks={risks} />);

    expect(getAllByText(MISSING_CARD_LABEL)).toHaveLength(2);
    expect(queryByText('JADALNY')).toBeNull();
    expect(queryByText(INCOMPLETE_CARD_LABEL)).toBeNull();
  });

  it('shows a collection warning only for twardawy and no edibility verdict for the other missing cards', async () => {
    const risks = MUSHROOMS_DATABASE.flatMap((item) => item.confusionRisks).filter((risk) =>
      ['calocybe_gambosa', 'amanita_excelsa'].includes(risk.confusedWithId),
    );

    const { getAllByTestId, queryByText } = await render(<LookAlikeAlert risks={risks} />);

    const gambosa = getAllByTestId('lookalike-unlinked-calocybe_gambosa');
    expect(gambosa.length).toBeGreaterThan(0);
    for (const row of gambosa) {
      expect(row).toHaveTextContent(ATLAS_NO_VERDICT_NOTE, { exact: false });
      expect(row).not.toHaveTextContent(NOT_FOR_COLLECTION_NOTE, { exact: false });
    }
    const excelsa = getAllByTestId('lookalike-unlinked-amanita_excelsa');
    expect(excelsa.length).toBeGreaterThan(1);
    for (const row of excelsa) {
      expect(row).toHaveTextContent(NOT_FOR_COLLECTION_NOTE, { exact: false });
    }
    expect(queryByText('JADALNY')).toBeNull();
    expect(queryByText('NIEJADALNY')).toBeNull();
    expect(queryByText('TRUJĄCY')).toBeNull();
  });

  it('turns the warning red when the open card is deadly even if every twin is edible', async () => {
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: ['Ruchomy pierścień'],
        fatal: false,
      },
    ];

    const { getByText } = await render(
      <LookAlikeAlert
        risks={risks}
        ownStatus="DEADLY_POISONOUS"
        catalogIds={new Set(['macrolepiota_procera'])}
      />
    );

    expect(getByText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!')).toBeTruthy();
    expect(getByText('JADALNY')).toBeTruthy();
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

  it('keeps the deadly warning in English without softening it', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const risks: ConfusionRisk[] = [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: ['Ma pochwę'],
        fatal: true,
      },
    ];

    const screen = await render(
      <LanguageProvider>
        <LookAlikeAlert risks={risks} />
      </LanguageProvider>,
    );

    expect(await screen.findByText(en.lookalike.fatalTitle)).toBeTruthy();
    expect(screen.getByText(en.lookalike.subtitle)).toBeTruthy();
    expect(en.lookalike.fatalTitle).toMatch(/DEADLY/);
    expect(en.lookalike.subtitle).toMatch(/must check/);
    expect(screen.queryByText(/safe to eat/i)).toBeNull();
  });
});
