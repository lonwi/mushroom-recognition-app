import { Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { fontFamily, touchTargetMinDp } from '@/ui/tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  textColor?: string;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
  testID?: string;
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Line
        x1="16.5"
        y1="16.5"
        x2="21"
        y2="21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClearIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = '#6e7a72',
  textColor,
  onClear,
  clearAccessibilityLabel = 'Wyczyść',
  testID,
}: SearchBarProps) {
  return (
    <View
      className="flex-row items-center rounded-xl border border-border bg-surface pl-3 pr-1 shadow-2xs"
      style={{ minHeight: touchTargetMinDp }}
    >
      <View className="mr-2 items-center justify-center opacity-70">
        <SearchIcon color={placeholderTextColor} />
      </View>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={{
          flex: 1,
          color: textColor,
          fontFamily: fontFamily.regular,
          fontSize: 15,
          minHeight: touchTargetMinDp,
          paddingVertical: 8,
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
          className="items-center justify-center"
          style={{ minWidth: touchTargetMinDp, minHeight: touchTargetMinDp }}
        >
          <View className="h-6 w-6 items-center justify-center rounded-full bg-paperActive">
            <ClearIcon color={placeholderTextColor} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
