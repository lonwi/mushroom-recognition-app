export const Accuracy = { Balanced: 3, High: 4, Low: 1 };
export const getForegroundPermissionsAsync = async () => ({ status: 'granted' });
export const requestForegroundPermissionsAsync = async () => ({ status: 'granted' });
export const getCurrentPositionAsync = async () => ({
  coords: { latitude: 52.2297, longitude: 21.0122 },
});

export default {
  Accuracy,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
};
