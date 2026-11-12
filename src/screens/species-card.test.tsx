import { fireEvent, render, screen } from '@testing-library/react-native';

import type { SpeciesListItem } from '@/core/db/species-search';
import { SpeciesCard } from '@/screens/species-card';

const baseItem: SpeciesListItem = {
  id: 'boletus_edulis',
  name: 'Borowik szlachetny',
  latinName: 'Boletus edulis',
  genus: 'Boletus',
  edibility: 'EDIBLE',
  statusDisputed: false,
  inModel: true,
  incompleteCard: false,
  hymenophore: 'TUBES',
  warning: '',
  months: [6, 7, 8, 9, 10, 11],
  habitat: 'Lasy iglaste',
  primaryPhoto: {
    file: 'boletus.jpg',
    license: 'cc-by',
    author: 'Jan Kowalski',
  },
};

describe('SpeciesCard', () => {
  it('renders species name, latin name, habitat, and photo', async () => {
    const onPress = jest.fn();
    await render(<SpeciesCard item={baseItem} onPress={onPress} edibilityLabel="Jadalny" />);

    expect(screen.getByText('Borowik szlachetny')).toBeTruthy();
    expect(screen.getByText('Boletus edulis')).toBeTruthy();
    expect(screen.getByText(/Lasy iglaste/)).toBeTruthy();
    expect(screen.getByText('Jadalny')).toBeTruthy();
  });

  it('renders botanical illustration plate fallback when photo is absent', async () => {
    const itemWithoutPhoto: SpeciesListItem = {
      ...baseItem,
      primaryPhoto: null,
    };
    await render(
      <SpeciesCard item={itemWithoutPhoto} onPress={jest.fn()} edibilityLabel="Jadalny" />,
    );

    expect(screen.getByText(/rycina botaniczna/i)).toBeTruthy();
  });

  it('triggers onPress with species ID when pressed', async () => {
    const onPress = jest.fn();
    await render(<SpeciesCard item={baseItem} onPress={onPress} edibilityLabel="Jadalny" />);

    fireEvent.press(screen.getByTestId('species-card-boletus_edulis'));
    expect(onPress).toHaveBeenCalledWith('boletus_edulis');
  });

  it('renders deadly poisonous species with distinct styling', async () => {
    const deadlyItem: SpeciesListItem = {
      ...baseItem,
      id: 'amanita_phalloides',
      name: 'Muchomor sromotnikowy',
      latinName: 'Amanita phalloides',
      edibility: 'DEADLY_POISONOUS',
      months: [1],
    };
    await render(
      <SpeciesCard
        item={deadlyItem}
        onPress={jest.fn()}
        edibilityLabel="ŚMIERTELNIE TRUJĄCY"
        theme="light"
      />,
    );

    expect(screen.getByText('Muchomor sromotnikowy')).toBeTruthy();
    expect(screen.getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();
  });
});
