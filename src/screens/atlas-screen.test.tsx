import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';
import { setSpeciesDb } from '@/infra/db/species-db';
import { settingsStore } from '@/infra/settings/use-settings-store';
import AtlasScreen from '@/screens/atlas';

const mockDb: SpeciesSql = {
  exec: () => {},
  run: () => {},
  all: <T extends Record<string, SqlValue>>(sql: string, params: readonly SqlValue[] = []): T[] => {
    // Check if query is looking for 'brak'
    const paramsStr = JSON.stringify(params);
    if (paramsStr.includes('brak')) {
      return [] as T[];
    }

    // Default mock list
    return [
      {
        id: 'boletus_edulis',
        latin_name: 'Boletus edulis',
        genus: 'Boletus',
        edibility: 'EDIBLE',
        status_disputed: 0,
        in_model: 1,
        incomplete_card: 0,
        hymenophore: 'TUBES',
        months_json: '[6,7,8,9,10,11]',
        name: 'Borowik szlachetny',
        warning: '',
        photo_file: 'boletus_edulis.webp',
        photo_license: 'cc-by',
        photo_author: 'Jan Kowalski',
      },
      {
        id: 'amanita_phalloides',
        latin_name: 'Amanita phalloides',
        genus: 'Amanita',
        edibility: 'DEADLY_POISONOUS',
        status_disputed: 0,
        in_model: 1,
        incomplete_card: 0,
        hymenophore: 'GILLS',
        months_json: '[7,8,9,10]',
        name: 'Muchomor sromotnikowy',
        warning: 'Śmiertelnie trujący',
        photo_file: 'amanita_phalloides.webp',
        photo_license: 'cc0',
        photo_author: 'Anna Nowak',
      },
    ] as unknown as T[];
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  settingsStore.getState().setTheme('light');
  settingsStore.getState().setEnglishEnabled(false);
  setSpeciesDb(mockDb);
});

afterAll(() => {
  setSpeciesDb(null);
});

describe('AtlasScreen', () => {
  it('renders search input and species cards', async () => {
    await render(<AtlasScreen />);

    expect(screen.getByPlaceholderText(/szukaj/i)).toBeTruthy();
    expect(screen.getByText('Borowik szlachetny')).toBeTruthy();
    expect(screen.getByText('Muchomor sromotnikowy')).toBeTruthy();
    expect(screen.getByText('Jadalny')).toBeTruthy();
    expect(screen.getByText('Śmiertelnie trujący')).toBeTruthy();
  });

  it('navigates to species detail screen on card press', async () => {
    await render(<AtlasScreen />);

    fireEvent.press(screen.getByText('Borowik szlachetny'));
    expect(router.push).toHaveBeenCalledWith('/species/boletus_edulis');
  });

  it('toggles filter chips when pressed', async () => {
    await render(<AtlasScreen />);

    const edibleChip = screen.getByRole('button', { name: 'Jadalne' });
    expect(edibleChip.props.accessibilityState.selected).toBe(false);

    fireEvent.press(edibleChip);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Jadalne' }).props.accessibilityState.selected,
      ).toBe(true);
    });

    const allChip = screen.getByRole('button', { name: 'Wszystkie' });
    fireEvent.press(allChip);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Jadalne' }).props.accessibilityState.selected,
      ).toBe(false);
    });
  });

  it('updates search query on typing and clears with clear button', async () => {
    await render(<AtlasScreen />);

    const input = screen.getByPlaceholderText(/szukaj/i);
    fireEvent.changeText(input, 'borowik');
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/szukaj/i).props.value).toBe('borowik');
    });

    const clearButton = screen.getByRole('button', { name: 'Wyczyść wyszukiwanie' });
    fireEvent.press(clearButton);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/szukaj/i).props.value).toBe('');
    });
  });

  it('shows empty state when no species match', async () => {
    await render(<AtlasScreen />);

    const input = screen.getByPlaceholderText(/szukaj/i);
    fireEvent.changeText(input, 'brak');

    expect(await screen.findByText('Brak wyników')).toBeTruthy();
    expect(screen.getByText(/nie znaleziono grzybów/i)).toBeTruthy();
  });
});
