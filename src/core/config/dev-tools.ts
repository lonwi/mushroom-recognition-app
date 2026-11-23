/**
 * Spike'e deweloperskie (dekoder, FTS5 i stylowanie) w tej paczce.
 *
 * Czytane przy wywołaniu. Literał `process.env.EXPO_PUBLIC_DEV_TOOLS` jest
 * obowiązkowy: Expo wstawia wartość przy bundlowaniu i nie rusza odczytu
 * przez zmienną pośrednią. W release `__DEV__` jest fałszem, więc ekrany
 * zostają tylko przy wartości `1` (profile EAS development i preview).
 */
export function devToolsEnabled(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';
}
