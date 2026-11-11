import { View } from 'react-native';

import { AppText } from '@/ui/text';
import { deadlyBadge, edibilityColor, type StoredEdibility } from '@/ui/tokens';

export interface EdibilityBadgeProps {
  status: StoredEdibility | null;
  statusDisputed?: boolean;
  label: string;
}

export function EdibilityBadge({ status, statusDisputed = false, label }: EdibilityBadgeProps) {
  if (!status) return null;

  const isDeadly = status === 'DEADLY_POISONOUS';
  const color = edibilityColor(status, statusDisputed);

  if (isDeadly) {
    return (
      <View
        className="rounded border px-2 py-1"
        style={{
          backgroundColor: deadlyBadge.background,
          borderColor: deadlyBadge.border,
        }}
        accessibilityRole="text"
      >
        <AppText emphasis className="text-xs" style={{ color: deadlyBadge.text }}>
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <View
      className="rounded border px-2 py-1"
      style={{
        backgroundColor: color + '1F',
        borderColor: color,
      }}
      accessibilityRole="text"
    >
      <AppText emphasis className="text-xs" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}
