import { Redirect } from 'expo-router';

import { devToolsEnabled } from '@/core/config/dev-tools';
import InferenceSpikeScreen from '@/screens/inference-spike';

export default function InferenceSpikeRoute() {
  // Produkcja wycina src/app/dev. Przy EXPO_PUBLIC_DEV_TOOLS=1 plik zostaje.
  // Bez tej flagi grzybobranie://dev/inference nie może otworzyć spike'a.
  if (!devToolsEnabled()) {
    return <Redirect href="/" />;
  }
  return <InferenceSpikeScreen />;
}
