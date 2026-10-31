import { Alert, Linking } from 'react-native';
import { EMERGENCY_CALLS, toTelUrl } from '../data/safetyRules';

const CALL_112_LABEL = 'safetyGuide.call112Title';

/** The 112 entry from the safety screen. The number stays in `safetyRules.ts`. */
export function emergency112Call(): (typeof EMERGENCY_CALLS)[number] | undefined {
  return EMERGENCY_CALLS.find((call) => call.titleKey === CALL_112_LABEL);
}

/**
 * Same dial path as the safety screen: `toTelUrl`, then `Linking.openURL`.
 * An unsupported or empty number shows the existing "call not supported" copy.
 */
export async function placeEmergencyCall(
  phone: string,
  unsupported: { readonly title: string; readonly body: string },
): Promise<void> {
  const url = toTelUrl(phone);
  if (!url) {
    Alert.alert(unsupported.title, unsupported.body);
    return;
  }
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return;
  }
  Alert.alert(unsupported.title, unsupported.body);
}
