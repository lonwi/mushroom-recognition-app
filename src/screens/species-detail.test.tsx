import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';
import { setSpeciesDb } from '@/infra/db/species-db';
import { settingsStore } from '@/infra/settings/use-settings-store';
import { SpeciesDetailScreen } from '@/screens/species-detail';
import { greenEdibilityTokens } from '@/ui/tokens';

function createMockDb(speciesOverrides: Partial<Record<string, unknown>> = {}): SpeciesSql {
  return {
    exec: () => {},
    run: () => {},
    all: <T extends Record<string, SqlValue>>(
      sql: string,
      params: readonly SqlValue[] = [],
    ): T[] => {
      const id = params[0] as string;

      if (id === 'non_existent') {
        return [] as T[];
      }

      if (sql.includes('FROM species WHERE id = ?')) {
        return [
          {
            id: 'boletus_edulis',
            latin_name: 'Boletus edulis',
            genus: 'Boletus',
            family: 'Boletaceae',
            edibility: 'EDIBLE',
            status_disputed: 0,
            in_model: 1,
            incomplete_card: 0,
            content_version: '1.0.0',
            hymenophore: 'TUBES',
            months_json: '[6,7,8,9,10,11]',
            high_stakes: 0,
            card_origin: 'curated',
            incomplete_fields: '[]',
            ...speciesOverrides,
          },
        ] as unknown as T[];
      }

      if (sql.includes('FROM species_texts WHERE species_id = ?')) {
        return [
          {
            name: 'Borowik szlachetny',
            warning: '',
            note: 'Bardzo smaczny grzyb jadalny.',
            cap: 'Brązowy, wypukły do poduchowatego',
            hymenophore: 'Rurki białe, potem oliwkowożółte',
            stem: 'Gruby, z białą siateczką',
            flesh: 'Biały, niezmienny',
            habitat: 'Lasy iglaste i liściaste',
            taste: 'Łagodny, orzechowy',
            nicknames: '["prawdziwek"]',
          },
        ] as unknown as T[];
      }

      if (sql.includes('FROM species_photos')) {
        return [
          {
            id: 'photo_1',
            file: 'boletus_edulis_1.webp',
            license: 'CC-BY 4.0',
            license_url: 'https://creativecommons.org/licenses/by/4.0/',
            author: 'Jan Kowalski',
            source: 'Wikimedia',
            source_url: 'https://example.com',
            feature_tag: 'cap',
          },
        ] as unknown as T[];
      }

      if (sql.includes('FROM look_alike_pairs')) {
        return [
          {
            pair_id: 'pair_boletus_tylopilus',
            lookalike_id: 'tylopilus_felleus',
            lookalike_name: 'Goryczak żółciowy',
            lookalike_latin: 'Tylopilus felleus',
            lookalike_edibility: 'INEDIBLE',
            fatal: 0,
            review_status: 'reviewed',
            traits: 'Różowiejące rurki i bardzo gorzki smak.',
          },
          {
            pair_id: 'pair_boletus_rubroboletus',
            lookalike_id: 'rubroboletus_satanas',
            lookalike_name: 'Borowik szatański',
            lookalike_latin: 'Rubroboletus satanas',
            lookalike_edibility: 'POISONOUS',
            fatal: 1,
            review_status: 'reviewed',
            traits: 'Czerwony trzon i siniejący miąższ.',
          },
        ] as unknown as T[];
      }

      if (sql.includes('FROM uncovered_look_alikes')) {
        return [
          {
            uncovered_id: 'uncovered_1',
            lookalike_id: 'caloboletus_calopus',
            lookalike_name: 'Borowik żółtopory',
            lookalike_latin: 'Caloboletus calopus',
            lookalike_edibility: 'INEDIBLE',
            warning: 'Gorzki grzyb niejadalny, niesklasyfikowany w modelu aparatu.',
            fatal: 0,
          },
        ] as unknown as T[];
      }

      if (sql.includes('FROM generated_images')) {
        return [
          {
            id: 'boletus_edulis__section',
            feature: 'przekroj',
            kind: 'rycina',
            file: 'boletus_edulis/section.png',
            label: 'Przekrój podłużny owocnika',
            review_status: 'accepted',
          },
        ] as unknown as T[];
      }

      return [] as T[];
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  settingsStore.getState().setTheme('light');
  settingsStore.getState().setEnglishEnabled(false);
  setSpeciesDb(createMockDb());
});

afterAll(() => {
  setSpeciesDb(null);
});

describe('SpeciesDetailScreen', () => {
  it('renders species header, morphology, and photo gallery with attribution', async () => {
    await render(<SpeciesDetailScreen id="boletus_edulis" />);

    expect(screen.getByText('Borowik szlachetny')).toBeTruthy();
    expect(screen.getByText('Boletus edulis')).toBeTruthy();
    expect(screen.getByText(/Rodzaj: Boletus/)).toBeTruthy();
    expect(screen.getByText(/Rodzina: Boletaceae/)).toBeTruthy();
    expect(screen.getByText(/Inne nazwy: prawdziwek/)).toBeTruthy();

    // Morphology
    expect(screen.getByText('Brązowy, wypukły do poduchowatego')).toBeTruthy();
    expect(screen.getByText('Gruby, z białą siateczką')).toBeTruthy();
    expect(screen.getByText('VI, VII, VIII, IX, X, XI')).toBeTruthy();

    // Photo gallery strictly shows photos with attribution
    expect(screen.getByText('Fot. Jan Kowalski')).toBeTruthy();
    expect(screen.getByText('Licencja: CC-BY 4.0')).toBeTruthy();
    expect(screen.getAllByTestId('photo-card').length).toBe(1);
  });

  it('does NOT render green edibility badge for incompleteCard even if status is EDIBLE', async () => {
    setSpeciesDb(
      createMockDb({
        edibility: 'EDIBLE',
        incomplete_card: 1,
      }),
    );

    await render(<SpeciesDetailScreen id="boletus_edulis" />);

    const badgeText = screen.getByText('Jadalny');
    expect(badgeText).toBeTruthy();

    // Safety rule: incompleteCard must not have the green token
    expect(badgeText.props.style?.color).not.toBe(greenEdibilityTokens.edible);

    // Incomplete card warning is displayed
    expect(screen.getByText('Niekompletna karta')).toBeTruthy();
  });

  it('displays not in model warning when in_model is false', async () => {
    setSpeciesDb(
      createMockDb({
        in_model: 0,
      }),
    );

    await render(<SpeciesDetailScreen id="boletus_edulis" />);

    expect(screen.getAllByText('Nierozpoznawany przez skaner').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Aparat skanera nie rozpoznaje jeszcze tego gatunku w terenie.'),
    ).toBeTruthy();
  });

  it('displays anatomy diagrams with visible illustration badge, distinct from photo gallery', async () => {
    await render(<SpeciesDetailScreen id="boletus_edulis" />);

    const illustrationCards = screen.getAllByTestId('illustration-card');
    expect(illustrationCards.length).toBe(1);

    expect(screen.getByText('ilustracja')).toBeTruthy();
    expect(screen.getByText('przekroj')).toBeTruthy();
    expect(screen.getByText('Przekrój podłużny owocnika')).toBeTruthy();

    const photoCards = screen.getAllByTestId('photo-card');
    expect(photoCards.length).toBe(1);
  });

  it('renders look-alikes with fatal indicators and compare button', async () => {
    await render(<SpeciesDetailScreen id="boletus_edulis" />);

    expect(screen.getAllByText('Goryczak żółciowy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tylopilus felleus')).toBeTruthy();
    expect(screen.getByText(/Różowiejące rurki i bardzo gorzki smak/)).toBeTruthy();

    // Fatal lookalike has danger notice
    expect(screen.getAllByText('Borowik szatański').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Śmiertelnie niebezpieczna pomyłka!')).toBeTruthy();

    // Compare 50/50 button navigates to compare screen
    const compareButton = screen.getByRole('button', {
      name: 'Porównaj 50/50: Goryczak żółciowy',
    });
    fireEvent.press(compareButton);
    expect(router.push).toHaveBeenCalledWith('/look-alikes/pair_boletus_tylopilus');
  });

  it('renders uncovered dangerous look-alikes section', async () => {
    await render(<SpeciesDetailScreen id="boletus_edulis" />);

    expect(screen.getByText('Groźne sobowtóry spoza modelu')).toBeTruthy();
    expect(screen.getByText('Borowik żółtopory')).toBeTruthy();
    expect(
      screen.getByText('Gorzki grzyb niejadalny, niesklasyfikowany w modelu aparatu.'),
    ).toBeTruthy();
  });

  it('renders not found state when species does not exist', async () => {
    await render(<SpeciesDetailScreen id="non_existent" />);

    expect(screen.getByText('Nie znaleziono gatunku')).toBeTruthy();
    expect(screen.getByText('Wybrany gatunek nie istnieje w bazie atlasu.')).toBeTruthy();

    const backButton = screen.getByRole('button', { name: 'Wróć do atlasu' });
    fireEvent.press(backButton);
    expect(router.back).toHaveBeenCalled();
  });

  it('renders correctly in highContrast theme', async () => {
    settingsStore.getState().setTheme('highContrast');
    await render(<SpeciesDetailScreen id="boletus_edulis" />);
    expect(screen.getByText('Borowik szlachetny')).toBeTruthy();
  });
});
