import { Pressable, type ViewStyle } from 'react-native';

import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function FilterChip({ label, selected, onPress, style, testID }: FilterChipProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`mr-2 flex-row items-center justify-center rounded-full border px-4 py-2 ${
        selected ? 'border-accent bg-accent' : 'border-border bg-surface'
      }`}
      style={[{ minHeight: touchTargetMinDp, minWidth: touchTargetMinDp }, style]}
    >
      <AppText
        emphasis={selected}
        className={`text-sm ${selected ? 'font-bold text-onAccent' : 'font-medium text-ink'}`}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
