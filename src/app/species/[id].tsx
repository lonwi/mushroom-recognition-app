import { useLocalSearchParams } from 'expo-router';

import { SpeciesDetailScreen } from '@/screens/species-detail';

export default function SpeciesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <SpeciesDetailScreen id={id} />;
}
