import * as Location from 'expo-location';

export interface FindCoordinates {
  latitude: number;
  longitude: number;
}

const POSITION_TIMEOUT_MS = 12000;

export function isUsableCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Reads a foreground fix only after permission is granted.
 * Denial, timeout, and a missing fix all return null — never a placeholder coordinate.
 */
export async function readFindLocation(): Promise<FindCoordinates | null> {
  let permission: { status: string };
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    return null;
  }
  if (permission.status !== 'granted') {
    return null;
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );
    const { latitude, longitude } = position.coords;
    if (!isUsableCoordinate(latitude, longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
