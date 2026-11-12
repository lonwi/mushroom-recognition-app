import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import SpeciesRoute from '@/app/species/[id]';
import { setSpeciesDb } from '@/infra/db/species-db';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

afterAll(() => {
  setSpeciesDb(null);
});

describe('SpeciesRoute', () => {
  it('renders null when id is missing', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { toJSON } = await render(<SpeciesRoute />);
    expect(toJSON()).toBeNull();
  });

  it('renders SpeciesDetailScreen with given id', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'non_existent' });
    setSpeciesDb({
      exec: () => {},
      run: () => {},
      all: () => [],
    });

    await render(<SpeciesRoute />);
    expect(screen.getByText('Nie znaleziono gatunku')).toBeTruthy();
  });
});
