import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AtlasScreen } from '../../screens/AtlasScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';

describe('AtlasScreen RTL Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders search input and mushroom list', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    expect(getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...')).toBeTruthy();
    expect(getByText('Prawdziwki')).toBeTruthy();
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
      expect(getByText('Prawdziwki')).toBeTruthy();
      expect(queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
    });
  });

  it('filters deadly poisonous mushrooms', async () => {
    const onSelect = jest.fn();
    const { getByText, getAllByText, getByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.press(getByTestId('filter-status-DEADLY_POISONOUS'));

    await waitFor(() => {
      expect(getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
      expect(queryByText('Prawdziwki')).toBeNull();
      expect(getAllByText('☠ Sobowtór!').length).toBeGreaterThan(0);
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
    const { getByPlaceholderText, getByTestId, getByText, queryByTestId, queryByText } = await render(
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
      expect(getByText('Brak zdjęcia')).toBeTruthy();
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
      expect(screen.queryByText('Prawdziwki')).toBeNull();
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
      expect(screen.queryByText('Prawdziwki')).toBeNull();
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

    expect(screen.getByText(/Karta niepełna \(14\)/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filter-status-EDIBLE'));
    await waitFor(() => {
      expect(screen.getByText('Prawdziwki')).toBeTruthy();
      expect(screen.queryByText('Gołąbek zielonawy')).toBeNull();
      expect(screen.queryByText('Kolczak obłączasty')).toBeNull();
      expect(screen.getAllByText('JADALNY').length).toBeGreaterThan(0);
    });

    await fireEvent.press(screen.getByTestId('filter-status-INCOMPLETE'));
    await waitFor(() => {
      expect(screen.getByText('Gołąbek zielonawy')).toBeTruthy();
      expect(screen.getByText('Kolczak obłączasty')).toBeTruthy();
      expect(screen.getByText('Smardz jadalny')).toBeTruthy();
      expect(screen.getByText('Pieczarka polna')).toBeTruthy();
      expect(screen.queryByText('Prawdziwki')).toBeNull();
      expect(screen.queryAllByText('JADALNY')).toHaveLength(0);
      expect(screen.getByTestId('atlas-result-count').props.children).toBe('Pasujące karty: 14');
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
      expect(queryByText('Prawdziwki')).toBeNull();
    });
  });

  it('keeps Polish list labels and does not show the source-language note', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    expect(screen.getByText('Prawdziwki')).toBeTruthy();
    expect(screen.getByTestId('atlas-months-boletus_edulis').props.children).toBe('📅 6 - 11 mies.');
    expect(screen.queryByTestId('atlas-source-language-note')).toBeNull();
    expect(screen.queryByText(en.cards.sourceLanguageNote)).toBeNull();
    expect(pl.atlas.monthRange).toBe('{start} - {end} mies.');

    await fireEvent.press(screen.getByTestId('filter-status-DEADLY_POISONOUS'));
    await waitFor(() => {
      expect(screen.getAllByText('☠ Sobowtór!').length).toBeGreaterThan(0);
      expect(screen.queryByText('☠ Look-alike!')).toBeNull();
      expect(screen.queryByTestId('atlas-source-language-note')).toBeNull();
    });
  });

  it('shows English list labels, English months, and the Polish source-text note', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    expect(await screen.findByTestId('atlas-source-language-note')).toBeTruthy();
    expect(screen.getByText(en.cards.sourceLanguageNote)).toBeTruthy();
    expect(screen.getByText(/source text in Polish/)).toBeTruthy();
    expect(screen.getByText(/look-alike differences/)).toBeTruthy();
    expect(screen.getByText(/morphology/)).toBeTruthy();
    expect(screen.queryByText(pl.cards.sourceLanguageNote)).toBeNull();
    expect(screen.getByTestId('atlas-months-boletus_edulis').props.children).toBe('📅 months 6–11');
    expect(screen.queryByText(/mies\./)).toBeNull();
    expect(screen.getByText('Prawdziwki')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByPlaceholderText(en.atlas.searchPlaceholder),
      'Gołąbek zielonawy'
    );
    await waitFor(() => {
      expect(screen.getByText('No photo')).toBeTruthy();
      expect(screen.queryByText('Brak zdjęcia')).toBeNull();
    });

    await fireEvent.changeText(screen.getByPlaceholderText(en.atlas.searchPlaceholder), '');
    await fireEvent.press(screen.getByTestId('filter-status-DEADLY_POISONOUS'));
    await waitFor(() => {
      expect(screen.getAllByText('☠ Look-alike!').length).toBeGreaterThan(0);
      expect(screen.queryByText('☠ Sobowtór!')).toBeNull();
      expect(screen.getByTestId('atlas-source-language-note')).toBeTruthy();
    });
  });
});
