import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';
import { setSpeciesDb } from '@/infra/db/species-db';
import { settingsStore } from '@/infra/settings/use-settings-store';
import { LookAlikeComparisonScreen } from '@/screens/look-alike-comparison';

function createMockDb(pairOverrides: Partial<Record<string, unknown>> = {}): SpeciesSql {
  return {
    exec: () => {},
    run: () => {},
    all: <T extends Record<string, SqlValue>>(
      sql: string,
      params: readonly SqlValue[] = [],
    ): T[] => {
      const paramId = params[params.length - 1] as string;

      if (paramId === 'non_existent_pair') {
        return [] as T[];
      }

      if (sql.includes('FROM look_alike_pairs')) {
        return [
          {
            id: 'pair_boletus_tylopilus',
            species_id: 'boletus_edulis',
            lookalike_species_id: 'tylopilus_felleus',
            fatal: 1,
            review_status: 'reviewed',
            pair_group: 'boletus',
            traits: 'Goryczak ma ciemną siateczkę i gorzki smak.',
            ...pairOverrides,
          },
        ] as unknown as T[];
      }

      if (sql.includes('FROM species s')) {
        const id = paramId;
        if (id === 'boletus_edulis') {
          return [
            {
              id: 'boletus_edulis',
              latin_name: 'Boletus edulis',
              edibility: 'EDIBLE',
              status_disputed: 0,
              hymenophore: 'TUBES',
              name: 'Borowik szlachetny',
              cap: 'Brązowy, poduchowaty',
              hymenophore_desc: 'Rurki białe do oliwkowych',
              stem: 'Biała siateczka na jasnym tle',
              flesh: 'Biały, niezmienny',
              habitat: 'Lasy iglaste i mieszane',
              taste: 'Łagodny, orzechowy',
              photo_file: 'boletus.webp',
              photo_license: 'CC-BY',
              photo_author: 'Jan Kowalski',
            },
          ] as unknown as T[];
        }

        if (id === 'tylopilus_felleus') {
          return [
            {
              id: 'tylopilus_felleus',
              latin_name: 'Tylopilus felleus',
              edibility: 'INEDIBLE',
              status_disputed: 0,
              hymenophore: 'TUBES',
              name: 'Goryczak żółciowy',
              cap: 'Jasnobrązowy',
              hymenophore_desc: 'Rurki różowiejące',
              stem: 'Ciemna, wypukła siateczka',
              flesh: 'Białaworóżowy',
              habitat: 'Lasy iglaste, kwaśne gleby',
              taste: 'Bardzo gorzki',
              photo_file: 'tylopilus.webp',
              photo_license: 'CC-BY',
              photo_author: 'Anna Nowak',
            },
          ] as unknown as T[];
        }
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

afterEach(() => {
  cleanup();
});

afterAll(() => {
  setSpeciesDb(null);
});

describe('LookAlikeComparisonScreen', () => {
  it('renders 50/50 side-by-side header with both species, photos, and edibility badges', async () => {
    await render(<LookAlikeComparisonScreen pairId="pair_boletus_tylopilus" />);

    expect(screen.getByText('Porównanie sobowtórów')).toBeTruthy();
    expect(screen.getByText('Borowik szlachetny')).toBeTruthy();
    expect(screen.getByText('Boletus edulis')).toBeTruthy();
    expect(screen.getByText('Goryczak żółciowy')).toBeTruthy();
    expect(screen.getByText('Tylopilus felleus')).toBeTruthy();

    expect(screen.getByTestId('source-species-card')).toBeTruthy();
    expect(screen.getByTestId('lookalike-species-card')).toBeTruthy();
  });

  it('renders fatal danger banner when pair is marked as fatal', async () => {
    await render(<LookAlikeComparisonScreen pairId="pair_boletus_tylopilus" />);

    expect(screen.getByTestId('fatal-warning-banner')).toBeTruthy();
    expect(screen.getByText('Śmiertelnie niebezpieczna pomyłka!')).toBeTruthy();
  });

  it('renders key differentiating traits section', async () => {
    await render(<LookAlikeComparisonScreen pairId="pair_boletus_tylopilus" />);

    expect(screen.getByText('Kluczowe cechy różnicujące')).toBeTruthy();
    expect(screen.getByText('Goryczak ma ciemną siateczkę i gorzki smak.')).toBeTruthy();
  });

  it('renders side-by-side comparative feature cells', async () => {
    await render(<LookAlikeComparisonScreen pairId="pair_boletus_tylopilus" />);

    expect(screen.getByText('Kapelusz')).toBeTruthy();
    expect(screen.getByText('Brązowy, poduchowaty')).toBeTruthy();
    expect(screen.getByText('Jasnobrązowy')).toBeTruthy();

    expect(screen.getByText('Trzon')).toBeTruthy();
    expect(screen.getByText('Biała siateczka na jasnym tle')).toBeTruthy();
    expect(screen.getByText('Ciemna, wypukła siateczka')).toBeTruthy();

    expect(screen.getByText('Zapach i smak')).toBeTruthy();
    expect(screen.getByText('Łagodny, orzechowy')).toBeTruthy();
    expect(screen.getByText('Bardzo gorzki')).toBeTruthy();
  });

  it('navigates to species profiles on button press', async () => {
    await render(<LookAlikeComparisonScreen pairId="pair_boletus_tylopilus" />);

    const sourceButton = screen.getByRole('button', {
      name: 'Karta gatunku: Borowik szlachetny',
    });
    fireEvent.press(sourceButton);
    expect(router.push).toHaveBeenCalledWith('/species/boletus_edulis');
  });

  it('renders not found state when pair does not exist', async () => {
    await render(<LookAlikeComparisonScreen pairId="non_existent_pair" />);

    expect(screen.getByText('Nie znaleziono pary sobowtórów')).toBeTruthy();
    const backButton = screen.getByRole('button', { name: 'Wróć' });
    fireEvent.press(backButton);
    expect(router.back).toHaveBeenCalled();
  });

  it('renders correctly in highContrast theme', async () => {
    settingsStore.getState().setTheme('highContrast');
    await render(<LookAlikeComparisonScreen pairId="pair_boletus_tylopilus" />);
    expect(screen.getByText('Porównanie sobowtórów')).toBeTruthy();
  });
});
