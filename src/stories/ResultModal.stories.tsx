import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { ResultModal } from '../components/ResultModal';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { ClassificationResult } from '../services/classifierService';

const meta: Meta<typeof ResultModal> = {
  title: 'Mushroom/ResultModal',
  component: ResultModal,
};

export default meta;
type Story = StoryObj<typeof ResultModal>;

const bolete = MUSHROOMS_DATABASE.find((m) => m.id === 'boletus_edulis')!;
const mockBoleteResult: ClassificationResult = {
  topPredictions: [
    { species: bolete, confidence: 97.4, rank: 1 },
    { species: MUSHROOMS_DATABASE.find((m) => m.id === 'tylopilus_felleus')!, confidence: 2.1, rank: 2 },
  ],
  inferenceTimeMs: 128,
  processedImageUri: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
  hasFatalLookAlikeRisk: false,
  fatalLookAlikes: [],
};

const amanita = MUSHROOMS_DATABASE.find((m) => m.id === 'amanita_phalloides')!;
const mockAmanitaResult: ClassificationResult = {
  topPredictions: [
    { species: amanita, confidence: 99.1, rank: 1 },
    { species: MUSHROOMS_DATABASE.find((m) => m.id === 'macrolepiota_procera')!, confidence: 0.8, rank: 2 },
  ],
  inferenceTimeMs: 135,
  processedImageUri: 'https://images.unsplash.com/photo-1546842931-886c185b4c8c',
  hasFatalLookAlikeRisk: true,
  fatalLookAlikes: amanita.confusionRisks.filter((r) => r.fatal),
};

export const EdibleBoleteResult: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 600 }}>
      <ResultModal visible={true} result={mockBoleteResult} onClose={() => {}} />
    </View>
  ),
};

export const DeadlyAmanitaResult: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 600 }}>
      <ResultModal visible={true} result={mockAmanitaResult} onClose={() => {}} />
    </View>
  ),
};
