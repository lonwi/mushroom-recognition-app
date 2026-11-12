import { useLocalSearchParams } from 'expo-router';

import { LookAlikeComparisonScreen } from '@/screens/look-alike-comparison';

export default function LookAlikeRoute() {
  const { 'pair-id': pairId } = useLocalSearchParams<{ 'pair-id': string }>();

  if (!pairId) return null;

  return <LookAlikeComparisonScreen pairId={pairId} />;
}
