import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalScreen } from '../screens/JournalScreen';
import { SIGHTINGS_STORAGE_KEY } from '../services/storageService';
import type { SightingRecord } from '../types/mushroom';

const entries: SightingRecord[] = [
  {
    id: 'sighting_unclear',
    timestamp: 1_720_000_000_000,
    recognition: { status: 'rejected', reason: 'unclear' },
  },
  {
    id: 'sighting_spot',
    timestamp: 1_720_000_100_000,
    photoFile: 'sighting_spot.jpg',
    latitude: 49.12345,
    longitude: 20.54321,
    notes: 'stary dukt',
    recognition: {
      status: 'candidates',
      expertVerificationRequired: true,
      warningReasons: ['low_confidence'],
      top3: [
        {
          id: 'boletus_edulis',
          namePl: 'Borowik szlachetny',
          nameLatin: 'Boletus edulis',
          confidence: 0.5735153692074483,
          rank: 1,
        },
      ],
    },
  },
];

function SeededJournal() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const seed = async () => {
      const existing = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(entries));
      }
      if (active) setReady(true);
    };
    void seed();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  return <JournalScreen onOpenAtlasSpecies={() => undefined} />;
}

const meta: Meta<typeof JournalScreen> = {
  title: 'Mushroom/JournalScreen',
  component: JournalScreen,
};

export default meta;
type Story = StoryObj<typeof JournalScreen>;

export const SavedFinds: Story = {
  render: () => <SeededJournal />,
};
