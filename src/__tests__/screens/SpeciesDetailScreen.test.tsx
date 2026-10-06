import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SpeciesDetailScreen } from '../../screens/SpeciesDetailScreen';
import { MUSHROOMS_DATABASE, showsKitchenSection } from '../../data/mushrooms';

function species(id: string) {
  const match = MUSHROOMS_DATABASE.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing species ${id}`);
  }
  return match;
}

describe('SpeciesDetailScreen safety notices', () => {
  it('keeps the olszówka warning and does not treat the rydz mix-up as an all-clear', async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = await render(
      <SpeciesDetailScreen
        species={species('paxillus_involutus')}
        onBack={() => {}}
        onOpenLookAlike={() => {}}
      />
    );

    expect(queryByTestId('lookalike-incomplete')).toBeNull();
    expect(getByTestId('lookalike-link-lactarius_deliciosus')).toBeTruthy();
    expect(queryByText(/Brak niebezpiecznych sobowtórów/)).toBeNull();
    expect(getByTestId('species-warning-notes')).toBeTruthy();
    expect(getByText(/NIGDY NIE ZBIERAJ OLSZÓWEK/)).toBeTruthy();
    expect(queryByTestId('fatal-lookalike-banner')).toBeNull();
    expect(queryByText('W kuchni')).toBeNull();
    expect(getByTestId('species-use-toxic')).toBeTruthy();
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
    const { getByTestId, queryByTestId, getByText, queryByText } = await render(
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
    expect(getByTestId('incomplete-card-banner')).toBeTruthy();
    expect(getByTestId('incomplete-card-badge')).toBeTruthy();
    expect(queryByText('JADALNY')).toBeNull();
    expect(getByTestId('species-use-neutral')).toBeTruthy();
    expect(getByText('Znaczenie w literaturze')).toBeTruthy();
    expect(queryByText('W kuchni')).toBeNull();
  });

  it('does not present the other unfinished edible cards as a kitchen recommendation', async () => {
    for (const id of ['agaricus_campestris', 'morchella_esculenta']) {
      const screen = await render(<SpeciesDetailScreen species={species(id)} onBack={() => {}} />);
      expect(screen.getByTestId('species-use-neutral')).toBeTruthy();
      expect(screen.getByText('Znaczenie w literaturze')).toBeTruthy();
      expect(screen.queryByText('W kuchni')).toBeNull();
      expect(screen.queryByText('JADALNY')).toBeNull();
    }
  });

  it('keeps a finished edible card on the green badge', async () => {
    const { getByText, getByTestId, queryByTestId } = await render(
      <SpeciesDetailScreen species={species('boletus_edulis')} onBack={() => {}} />
    );

    expect(getByText('JADALNY')).toBeTruthy();
    expect(queryByTestId('incomplete-card-banner')).toBeNull();
    expect(queryByTestId('incomplete-card-badge')).toBeNull();
    expect(getByText('W kuchni')).toBeTruthy();
    expect(queryByTestId('species-use-neutral')).toBeNull();
    expect(getByTestId('species-use-edible')).toBeTruthy();
  });

  it('does not show the green kitchen section for inedible, poisonous or deadly cards', async () => {
    const blocked = MUSHROOMS_DATABASE.filter((item) => !showsKitchenSection(item));
    expect(blocked.some((item) => item.id === 'chlorophyllum_rhacodes')).toBe(true);
    expect(blocked.some((item) => item.id === 'tylopilus_felleus')).toBe(true);

    for (const item of blocked) {
      const screen = await render(<SpeciesDetailScreen species={item} onBack={() => {}} />);
      expect(screen.queryByText('W kuchni')).toBeNull();
      expect(screen.queryByTestId('species-use-edible')).toBeNull();
      if (item.status === 'INEDIBLE') {
        expect(screen.getByTestId('species-use-inedible')).toBeTruthy();
        expect(screen.getByText('Nie do jedzenia')).toBeTruthy();
        expect(screen.getByText('NIEJADALNY')).toBeTruthy();
      }
      if (item.id === 'chlorophyllum_rhacodes') {
        expect(screen.getByTestId('species-use-toxic')).toBeTruthy();
        expect(screen.getByText('TRUJĄCY')).toBeTruthy();
        expect(screen.queryByText('Nie do jedzenia')).toBeNull();
        expect(screen.queryByText('NIEJADALNY')).toBeNull();
      }
    }
  });

  it('keeps the green kitchen section on a finished edible species', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <SpeciesDetailScreen species={species('macrolepiota_procera')} onBack={() => {}} />
    );

    expect(getByTestId('species-use-edible')).toBeTruthy();
    expect(getByText('W kuchni')).toBeTruthy();
    expect(queryByText('Znaczenie w literaturze')).toBeNull();
  });

  it('shows the incomplete badge on look-alike rows that point at unfinished edible cards', async () => {
    const { getByTestId, getByText } = await render(
      <SpeciesDetailScreen species={species('amanita_phalloides')} onBack={() => {}} />
    );

    expect(getByTestId('incomplete-card-badge-russula_virescens')).toBeTruthy();
    expect(getByTestId('incomplete-card-badge-agaricus_campestris')).toBeTruthy();
    expect(getByTestId('lookalike-status-macrolepiota_procera')).toBeTruthy();
    expect(getByText('JADALNY')).toBeTruthy();
  });
});
