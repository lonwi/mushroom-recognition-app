import { isUsableCoordinate } from './journalLocation';

export interface MapsLinking {
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<unknown>;
}

export function mapsUrlForCoordinates(latitude: number, longitude: number, platform: string): string {
  if (!isUsableCoordinate(latitude, longitude)) {
    throw new Error('coordinates are not usable');
  }
  if (platform === 'ios') {
    return `http://maps.apple.com/?ll=${latitude},${longitude}&q=${latitude},${longitude}`;
  }
  if (platform === 'android') {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export async function openSpotInMaps(
  latitude: number,
  longitude: number,
  platform: string,
  linking: MapsLinking,
): Promise<void> {
  const primary = mapsUrlForCoordinates(latitude, longitude, platform);
  const fallback = mapsUrlForCoordinates(latitude, longitude, 'web');
  let url = primary;
  if (primary !== fallback) {
    try {
      const supported = await linking.canOpenURL(primary);
      if (!supported) url = fallback;
    } catch {
      url = fallback;
    }
  }
  await linking.openURL(url);
}
