import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Dispatched on web (and in browser e2e) because react-native-web's
 * BackHandler is a stub that also logs an error when subscribed.
 * Android uses BackHandler directly and does not listen for this event.
 */
export const HARDWARE_BACK_EVENT = 'hardwareBackPress';

type HardwareBackHandler = () => boolean;

const webHandlers: HardwareBackHandler[] = [];
let webListenerAttached = false;

function emitWebHardwareBack(): void {
  for (let index = webHandlers.length - 1; index >= 0; index -= 1) {
    if (webHandlers[index]()) return;
  }
}

function ensureWebListener(): void {
  if (webListenerAttached || typeof window === 'undefined') return;
  webListenerAttached = true;
  window.addEventListener(HARDWARE_BACK_EVENT, emitWebHardwareBack);
}

function removeWebHandler(handler: HardwareBackHandler): void {
  const index = webHandlers.lastIndexOf(handler);
  if (index >= 0) webHandlers.splice(index, 1);
}

/**
 * Last subscriber runs first, matching Android's BackHandler.
 * Photo credits registers its own listener when it opens, so this must not
 * re-subscribe on each render or it would handle the event before credits do.
 */
function subscribeHardwareBack(handler: HardwareBackHandler): () => void {
  if (Platform.OS === 'web') {
    webHandlers.push(handler);
    ensureWebListener();
    return () => removeWebHandler(handler);
  }
  const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
  return () => subscription.remove();
}

export function useHardwareBack(handler: HardwareBackHandler): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => subscribeHardwareBack(() => handlerRef.current()), []);
}
