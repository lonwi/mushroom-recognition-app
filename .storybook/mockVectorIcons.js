import React from 'react';
import { Text, StyleSheet } from 'react-native-web';

const MockIcon = ({ name, size = 16, color = '#000', style }) => {
  const flattened = StyleSheet.flatten([{ fontSize: size, color }, style]);
  return React.createElement(Text, { style: flattened }, '🍄');
};

export const Ionicons = MockIcon;
export const Feather = MockIcon;
export const MaterialCommunityIcons = MockIcon;
export default MockIcon;
