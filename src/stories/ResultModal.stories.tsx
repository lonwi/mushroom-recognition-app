import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { ResultModal } from '../components/ResultModal';
import type { ClassificationResult } from '../services/classifierService';

const meta: Meta<typeof ResultModal> = {
  title: 'Mushroom/ResultModal',
  component: ResultModal,
};

export default meta;
type Story = StoryObj<typeof ResultModal>;

const unavailableResult: ClassificationResult = {
  status: 'unavailable',
  reason: 'model_missing',
  processedImageUri: 'file://camera/capture.jpg',
};

export const RecognitionUnavailable: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 600 }}>
      <ResultModal visible={true} result={unavailableResult} onClose={() => {}} />
    </View>
  ),
};

const rejectedResult: ClassificationResult = {
  status: 'rejected',
  reason: 'not_a_mushroom',
  processedImageUri: 'file://camera/cat.jpg',
  inferenceTimeMs: 30,
};

export const NotAMushroom: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 600 }}>
      <ResultModal visible={true} result={rejectedResult} onClose={() => {}} />
    </View>
  ),
};

const dangerousResult: ClassificationResult = {
  status: 'candidates',
  processedImageUri: 'file://camera/capture.jpg',
  inferenceTimeMs: 40,
  expertVerificationRequired: true,
  warningReasons: ['dangerous_genus', 'low_confidence'],
  top3: [
    {
      id: 'amanita_phalloides',
      namePl: 'Muchomor sromotnikowy (zielonawy)',
      nameLatin: 'Amanita phalloides',
      genus: 'Amanita',
      confidence: 0.41,
      rank: 1,
    },
    {
      id: 'amanita_citrina',
      namePl: 'Muchomor cytrynowy',
      nameLatin: 'Amanita citrina',
      genus: 'Amanita',
      confidence: 0.33,
      rank: 2,
    },
    {
      id: 'macrolepiota_procera',
      namePl: 'Czubajka kania',
      nameLatin: 'Macrolepiota procera',
      genus: 'Macrolepiota',
      confidence: 0.12,
      rank: 3,
    },
  ],
};

export const DangerousGenusWarning: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 700 }}>
      <ResultModal visible={true} result={dangerousResult} onClose={() => {}} onOpenAtlasSpecies={() => {}} />
    </View>
  ),
};
