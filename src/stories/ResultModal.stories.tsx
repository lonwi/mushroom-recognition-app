import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { ResultModal } from '../components/ResultModal';
import { ClassificationResult } from '../services/classifierService';

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
