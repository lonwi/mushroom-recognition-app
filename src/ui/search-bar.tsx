import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/ui/text';
import { fontFamily, touchTargetMinDp } from '@/ui/tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  textColor?: string;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  textColor,
  onClear,
  clearAccessibilityLabel = 'Wyczyść',
}: SearchBarProps) {
  return (
    <View
      className="flex-row items-center rounded-lg border border-border bg-surface px-3"
      style={{ minHeight: touchTargetMinDp }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={{
          flex: 1,
          color: textColor,
          fontFamily: fontFamily.regular,
          fontSize: 16,
          minHeight: touchTargetMinDp,
        }}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          onPress={onClear ?? (() => onChangeText(''))}
          className="items-center justify-center p-2"
          style={{ minWidth: 40, minHeight: 40 }}
        >
          <AppText className="text-sm text-muted">✕</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
