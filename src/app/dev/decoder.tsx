import { Redirect } from 'expo-router';

import { devToolsEnabled } from '@/core/config/dev-tools';
import DecoderSpikeScreen from '@/screens/decoder-spike';

export default function DecoderSpikeRoute() {
  // Produkcja wycina src/app/dev. Przy EXPO_PUBLIC_DEV_TOOLS=1 plik zostaje.
  // Bez tej flagi grzybobranie://dev/decoder nie może otworzyć spike'a.
  if (!devToolsEnabled()) {
    return <Redirect href="/" />;
  }
  return <DecoderSpikeScreen />;
}
