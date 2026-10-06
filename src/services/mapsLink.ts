import { isUsableCoordinate } from './journalLocation';

export interface MapsLinking {
  openURL(url: string): Promise<unknown>;
}

export function mapsUrlForCoordinates(latitude: number, longitude: number, platform: string): string {
  if (!isUsableCoordinate(latitude, longitude)) {
    throw new Error('coordinates are not usable');
  }
  if (platform === 'ios') {
    return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${latitude},${longitude}`;
  }
  if (platform === 'android') {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
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
