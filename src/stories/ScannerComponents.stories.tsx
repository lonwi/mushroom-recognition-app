import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StyleSheet, View } from 'react-native';
import { ScannerReticle } from '../components/scanner/ScannerReticle';
import { ScannerControls } from '../components/scanner/ScannerControls';
import { ScannerExamples } from '../components/scanner/ScannerExamples';
import { ScannerPermissionPrompt } from '../components/scanner/ScannerPermissionPrompt';
import { colors } from '../theme/tokens';

const meta: Meta = {
  title: 'Scanner/Components',
};

export default meta;

const styles = StyleSheet.create({
  darkFrame: {
    width: '100%',
    maxWidth: 420,
    height: 380,
    backgroundColor: colors.slate900,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  lightFrame: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 16,
  },
});

export const Reticle: StoryObj = {
  render: () => (
    <View style={styles.darkFrame}>
      <ScannerReticle />
    </View>
  ),
};

export const ControlsIdle: StoryObj = {
  render: () => (
    <View style={styles.darkFrame}>
      <ScannerControls
        isAnalyzing={false}
        onTakePhoto={() => {}}
        onPickGallery={() => {}}
      />
    </View>
  ),
};

export const ControlsAnalyzing: StoryObj = {
  render: () => (
    <View style={styles.darkFrame}>
      <ScannerControls
        isAnalyzing={true}
        onTakePhoto={() => {}}
        onPickGallery={() => {}}
      />
    </View>
  ),
};

export const ExamplesList: StoryObj = {
  render: () => (
    <View style={styles.lightFrame}>
      <ScannerExamples onOpenAtlasSample={() => {}} />
    </View>
  ),
};

export const PermissionPrompt: StoryObj = {
  render: () => (
    <View style={styles.lightFrame}>
      <ScannerPermissionPrompt
        onRequestPermission={() => {}}
        onPickGallery={() => {}}
      />
    </View>
  ),
};
