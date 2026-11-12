import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import LookAlikeRoute from '@/app/look-alikes/[pair-id]';
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

describe('LookAlikeRoute', () => {
  it('renders null when pair-id is missing', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { toJSON } = await render(<LookAlikeRoute />);
    expect(toJSON()).toBeNull();
  });

  it('renders LookAlikeComparisonScreen with given pairId', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ 'pair-id': 'non_existent_pair' });
    setSpeciesDb({
      exec: () => {},
      run: () => {},
      all: () => [],
    });

    await render(<LookAlikeRoute />);
    expect(screen.getByText('Nie znaleziono pary sobowtórów')).toBeTruthy();
  });
});
