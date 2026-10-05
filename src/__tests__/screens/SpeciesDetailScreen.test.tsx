import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SpeciesDetailScreen } from '../../screens/SpeciesDetailScreen';
import { MUSHROOMS_DATABASE } from '../../data/mushrooms';

function species(id: string) {
  const match = MUSHROOMS_DATABASE.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing species ${id}`);
  }
  return match;
}

describe('SpeciesDetailScreen safety notices', () => {
  it('shows an incomplete look-alike notice for krowiak and keeps the warning', async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = await render(
      <SpeciesDetailScreen species={species('paxillus_involutus')} onBack={() => {}} />
    );

    expect(getByTestId('lookalike-incomplete')).toBeTruthy();
    expect(getByText('Informacja o sobowtórach jest niepełna')).toBeTruthy();
    expect(queryByText(/Brak niebezpiecznych sobowtórów/)).toBeNull();
    expect(getByTestId('species-warning-notes')).toBeTruthy();
    expect(getByText(/NIGDY NIE ZBIERAJ OLSZÓWEK/)).toBeTruthy();
    expect(queryByTestId('fatal-lookalike-banner')).toBeNull();
  });

  it('shows the same incomplete notice for muchomor czerwony', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <SpeciesDetailScreen species={species('amanita_muscaria')} onBack={() => {}} />
    );

    expect(getByTestId('lookalike-incomplete')).toBeTruthy();
    expect(queryByText(/Brak niebezpiecznych sobowtórów/)).toBeNull();
    expect(getByTestId('species-warning-notes')).toBeTruthy();
    expect(getByText(/nie próbuj usuwać toksyn w domu/)).toBeTruthy();
  });

  it('shows fatal look-alike risk and warning notes for kania', async () => {
    const { getByTestId, getByText } = await render(
      <SpeciesDetailScreen species={species('macrolepiota_procera')} onBack={() => {}} />
    );

    expect(getByTestId('fatal-lookalike-banner')).toBeTruthy();
    expect(getByText('Śmiertelnie groźny sobowtór w tej karcie')).toBeTruthy();
    expect(getByTestId('species-warning-notes')).toBeTruthy();
    expect(getByText(/śmiertelnymi muchomorami/)).toBeTruthy();
    expect(getByText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!')).toBeTruthy();
  });

  it('opens a real look-alike card and does not link a missing id', async () => {
    const onOpenLookAlike = jest.fn();
    const screen = await render(
      <SpeciesDetailScreen
        species={species('macrolepiota_procera')}
        onBack={() => {}}
        onOpenLookAlike={onOpenLookAlike}
      />
    );

    fireEvent.press(screen.getByTestId('lookalike-link-amanita_phalloides'));
    expect(onOpenLookAlike).toHaveBeenCalledWith('amanita_phalloides');
    expect(screen.queryByText(/Brak karty w atlasie/)).toBeNull();
  });

  it('shows a no-photo state and a do-not-eat warning for a minimal card', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <SpeciesDetailScreen
        species={species('russula_virescens')}
        onBack={() => {}}
        onOpenLookAlike={() => {}}
      />
    );

    expect(getByTestId('species-photo-missing')).toBeTruthy();
    expect(queryByTestId('species-photo')).toBeNull();
    expect(getByTestId('fatal-lookalike-banner')).toBeTruthy();
    expect(getByText(/NIE JEDZ NA PODSTAWIE TEJ KARTY/)).toBeTruthy();
    expect(getByTestId('lookalike-link-amanita_phalloides')).toBeTruthy();
  });
});
