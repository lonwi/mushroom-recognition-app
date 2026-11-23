import { Redirect } from 'expo-router';

import { devToolsEnabled } from '@/core/config/dev-tools';
import FtsSpikeScreen from '@/screens/fts-spike';

export default function FtsSpikeRoute() {
  // Produkcja wycina src/app/dev. Przy EXPO_PUBLIC_DEV_TOOLS=1 plik zostaje.
  // Bez tej flagi grzybobranie://dev/fts nie może otworzyć spike'a.
  if (!devToolsEnabled()) {
    return <Redirect href="/" />;
  }
  return <FtsSpikeScreen />;
}
