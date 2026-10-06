import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AtlasScreen } from '../../screens/AtlasScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';

describe('AtlasScreen RTL Tests', () => {
  it('renders search input and mushroom list', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    expect(getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...')).toBeTruthy();
    expect(getByText('Borowik szlachetny')).toBeTruthy();
  });

  it('filters species by search query', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    const input = getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...');
    await fireEvent.changeText(input, 'Prawdziwek');

    await waitFor(() => {
      expect(getByText('Borowik szlachetny')).toBeTruthy();
      expect(queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
    });
  });

  it('filters deadly poisonous mushrooms', async () => {
    const onSelect = jest.fn();
    const { getByText, getByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.press(getByTestId('filter-status-DEADLY_POISONOUS'));

    await waitFor(() => {
      expect(getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
      expect(queryByText('Borowik szlachetny')).toBeNull();
    });
  });

  it('does not treat a search for szatan as goryczak or as borowik szatański', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.changeText(
      getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...'),
      'szatan'
    );

    await waitFor(() => {
      expect(getByTestId('atlas-szatan-notice')).toBeTruthy();
      expect(queryByText('Goryczak żółciowy')).toBeNull();
      expect(queryByText(/Borowik szatański \(Rubroboletus satanas\) nie jest opisany/)).toBeTruthy();
    });
  });

  it('shows a no-photo state for look-alikes that have no picture', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByTestId, queryByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.changeText(
      getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...'),
      'Gołąbek zielonawy'
    );

    await waitFor(() => {
      expect(getByTestId('atlas-photo-missing-russula_virescens')).toBeTruthy();
      expect(queryByTestId('atlas-photo-russula_virescens')).toBeNull();
      expect(getByTestId('incomplete-card-badge-russula_virescens')).toBeTruthy();
      expect(queryByText('JADALNY')).toBeNull();
    });
  });

  it('states the real card count and that the atlas is not a complete key', async () => {
    const { getByTestId } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    const { MUSHROOMS_DATABASE } = require('../../data/mushrooms');
    const notice = getByTestId('atlas-scope-notice').props.children as string;
    expect(notice).toContain(String(MUSHROOMS_DATABASE.length));
    expect(notice).toContain('nie jest kompletny klucz');
    expect(notice).toContain('Sanepidzie');
    expect(getByTestId('atlas-result-count').props.children).toBe(
      `Pasujące karty: ${MUSHROOMS_DATABASE.length}`
    );
  });

  it('filters by inedible, poisonous, gills and spines, and combines them', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('filter-status-INEDIBLE'));
    await waitFor(() => {
      expect(screen.getByText('Goryczak żółciowy')).toBeTruthy();
      expect(screen.queryByText('Czubajnik czerwieniejący')).toBeNull();
      expect(screen.queryByText('Borowik szlachetny')).toBeNull();
      expect(screen.queryByText('W kuchni')).toBeNull();
    });

    await fireEvent.press(screen.getByTestId('filter-status-POISONOUS'));
    await waitFor(() => {
      expect(screen.getByText('Muchomor czerwony')).toBeTruthy();
      expect(screen.getByText('Czubajnik czerwieniejący')).toBeTruthy();
      expect(screen.queryByText('Goryczak żółciowy')).toBeNull();
      expect(screen.queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
    });

    await fireEvent.press(screen.getByTestId('filter-status-ALL'));
    await fireEvent.press(screen.getByTestId('filter-hymenophore-SPINES'));
    await waitFor(() => {
      expect(screen.getByText('Kolczak obłączasty')).toBeTruthy();
      expect(screen.queryByText('Borowik szlachetny')).toBeNull();
      expect(screen.getByTestId('atlas-result-count').props.children).toBe('Pasujące karty: 1');
    });

    await fireEvent.press(screen.getByTestId('filter-status-DEADLY_POISONOUS'));
    await waitFor(() => {
      expect(screen.getByTestId('atlas-empty')).toBeTruthy();
      expect(screen.getByText('Brak kart')).toBeTruthy();
      expect(screen.getByText(/Brak karty nie oznacza, że grzyb jest jadalny/)).toBeTruthy();
      expect(screen.getByTestId('atlas-result-count').props.children).toBe('Pasujące karty: 0');
      expect(screen.queryByText('Kolczak obłączasty')).toBeNull();
    });
  });

  it('puts unfinished edible cards on the incomplete chip, not the edible one', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    expect(screen.getByText(/Karta niepełna \(4\)/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filter-status-EDIBLE'));
    await waitFor(() => {
      expect(screen.getByText('Borowik szlachetny')).toBeTruthy();
      expect(screen.queryByText('Gołąbek zielonawy')).toBeNull();
      expect(screen.queryByText('Kolczak obłączasty')).toBeNull();
      expect(screen.queryByText('JADALNY')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('filter-status-INCOMPLETE'));
    await waitFor(() => {
      expect(screen.getByText('Gołąbek zielonawy')).toBeTruthy();
      expect(screen.getByText('Kolczak obłączasty')).toBeTruthy();
      expect(screen.getByText('Smardz jadalny')).toBeTruthy();
      expect(screen.getByText('Pieczarka polna')).toBeTruthy();
      expect(screen.queryByText('Borowik szlachetny')).toBeNull();
      expect(screen.queryByText('JADALNY')).toBeNull();
      expect(screen.getByTestId('atlas-result-count').props.children).toBe('Pasujące karty: 4');
    });
  });

  it('searches by Latin name', async () => {
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.changeText(
      getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...'),
      'Amanita virosa'
    );

    await waitFor(() => {
      expect(getByText('Muchomor jadowity')).toBeTruthy();
      expect(queryByText('Borowik szlachetny')).toBeNull();
    });
  });
});
