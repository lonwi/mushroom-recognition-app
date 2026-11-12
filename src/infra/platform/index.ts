import { Platform } from 'react-native';

/**
 * Jedyny szew `Platform.OS` (D-02, Q13).
 * Ekrany nie rozgałęziają się na Androida. Tu ląduje przyszłe odmontowanie kamery po utracie fokusu.
 */
export function platformName(): string {
  if (Platform.OS === 'android') return 'android';
  return Platform.OS;
}

export function isPlatformWeb(): boolean {
  return Platform.OS === 'web';
}
