import { isUsableCoordinate } from './journalLocation';

export interface MapsLinking {
  openURL(url: string): Promise<unknown>;
}

function formatMapCoordinate(value: number): string {
  return value.toFixed(6);
}

export function mapsUrlForCoordinates(latitude: number, longitude: number, platform: string): string {
  if (!isUsableCoordinate(latitude, longitude)) {
    throw new Error('coordinates are not usable');
  }
  const query = `${formatMapCoordinate(latitude)},${formatMapCoordinate(longitude)}`;
  if (platform === 'ios') {
    return `https://maps.apple.com/?ll=${query}&q=${query}`;
  }
  if (platform === 'android') {
    return `geo:${query}?q=${query}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Opens the spot without canOpenURL. Android 11+ reports geo: as unsupported
 * unless the manifest declares a queries intent, so a failed open falls back
 * to the https maps link instead.
 */
export async function openSpotInMaps(
  latitude: number,
  longitude: number,
  platform: string,
  linking: MapsLinking,
): Promise<void> {
  const primary = mapsUrlForCoordinates(latitude, longitude, platform);
  if (platform === 'android') {
    try {
      await linking.openURL(primary);
      return;
    } catch {
      await linking.openURL(mapsUrlForCoordinates(latitude, longitude, 'web'));
      return;
    }
  }
  await linking.openURL(primary);
}
