import { Redirect } from 'expo-router';

import DecoderSpikeScreen from '@/screens/decoder-spike';

export default function DecoderSpikeRoute() {
  // Paczka release wycina src/app/dev. Gdy plik jednak wejdzie do bundla,
  // grzybobranie://dev/decoder nie może otworzyć spike'a.
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <DecoderSpikeScreen />;
}
