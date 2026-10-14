import React from 'react';
import { View } from 'react-native-web';

export function CameraView(props) {
  return React.createElement(View, props);
}

export function useCameraPermissions() {
  return [{ granted: true, status: 'granted' }, async () => ({ granted: true, status: 'granted' })];
}
