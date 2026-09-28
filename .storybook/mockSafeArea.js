import React from 'react';
import { View } from 'react-native-web';

export const SafeAreaView = ({ style, children, ...props }) => {
  return React.createElement(View, { style, ...props }, children);
};

export const SafeAreaProvider = ({ children }) => children;
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const SafeAreaInsetsContext = React.createContext({ top: 0, bottom: 0, left: 0, right: 0 });
export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export default {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
  SafeAreaInsetsContext,
  initialWindowMetrics,
};
