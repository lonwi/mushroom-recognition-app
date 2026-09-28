import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LookAlikeAlert } from '../components/LookAlikeAlert';

const meta: Meta<typeof LookAlikeAlert> = {
  title: 'Mushroom/LookAlikeAlert',
  component: LookAlikeAlert,
};

export default meta;
type Story = StoryObj<typeof LookAlikeAlert>;

export const DeadlyConfusionKaniaVsMuchomor: Story = {
  args: {
    risks: [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy (zielonawy)',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Kania posiada ruchomy pierścień, dający się swobodnie przesuwać wzdłuż trzonu',
          'Muchomor sromotnikowy posiada luźną pochwę u podstawy trzonu (kania nie ma pochwy)',
          'Kania ma łuskowaty, wężowy wzór na trzonie (trzon muchomora jest gładki lub marmurkowaty)',
        ],
        fatal: true,
      },
    ],
  },
};

export const InedibleConfusionBorowikVsGoryczak: Story = {
  args: {
    risks: [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy (Szatan)',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Goryczak ma rurki brudnoróżowe, a nie oliwkowo-zielone',
          'Trzon goryczaka ma ciemną, wypukłą siatkę (borowik ma jasną/białą)',
          'Goryczak ma silnie gorzki smak psujący całe danie',
        ],
        fatal: false,
      },
    ],
  },
};

export const SafeSpeciesNoRisks: Story = {
  args: {
    risks: [],
  },
};
