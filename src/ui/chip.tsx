import { Pressable, type ViewStyle } from 'react-native';

import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function FilterChip({ label, selected, onPress, style }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`mr-2 justify-center rounded-full border px-4 py-2 ${
        selected ? 'border-accent bg-accent' : 'border-border bg-surface'
      }`}
      style={[{ minHeight: touchTargetMinDp }, style]}
    >
      <AppText emphasis={selected} className={`text-sm ${selected ? 'text-onAccent' : 'text-ink'}`}>
        {label}
      </AppText>
    </Pressable>
  );
}
