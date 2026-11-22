import { Redirect } from 'expo-router';

import { devToolsEnabled } from '@/core/config/dev-tools';
import StylingSpikeScreen from '@/screens/styling-spike';

export default function StylingSpikeRoute() {
  // Produkcja wycina src/app/dev. Przy EXPO_PUBLIC_DEV_TOOLS=1 plik zostaje.
  // Bez tej flagi grzybobranie://dev/styling nie może otworzyć spike'a.
  if (!devToolsEnabled()) {
    return <Redirect href="/" />;
  }
  return <StylingSpikeScreen />;
}
