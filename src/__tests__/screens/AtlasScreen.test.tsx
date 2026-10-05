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
    fireEvent.changeText(input, 'Prawdziwek');

    await waitFor(() => {
      expect(getByText('Borowik szlachetny')).toBeTruthy();
      expect(queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
    });
  });

  it('filters deadly poisonous mushrooms', async () => {
    const onSelect = jest.fn();
    const { getByText, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    const deadlyFilterBtn = getByText('☠ Śmiertelne');
    fireEvent.press(deadlyFilterBtn);

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

    fireEvent.changeText(
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

    fireEvent.changeText(
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
});
