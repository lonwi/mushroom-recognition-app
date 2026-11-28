/**
 * Profil EAS wbudowany w paczkę. Literał musi zostać, żeby Expo go wstawił.
 */
export function buildProfileName(): string {
  const value = process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
  if (typeof value === 'string' && value.length > 0) return value;
  return __DEV__ ? 'dev' : 'unknown';
}
