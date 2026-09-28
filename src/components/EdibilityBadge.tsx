import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EdibilityStatus } from '../types/mushroom';

interface Props {
  status: EdibilityStatus;
  size?: 'small' | 'medium' | 'large';
}

export const EdibilityBadge: React.FC<Props> = ({ status, size = 'medium' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'EDIBLE':
        return {
          label: 'JADALNY',
          bgColor: '#E8F5E9',
          textColor: '#2E7D32',
          borderColor: '#81C784',
          icon: '✓',
        };
      case 'INEDIBLE':
        return {
          label: 'NIEJADALNY',
          bgColor: '#FFF3E0',
          textColor: '#E65100',
          borderColor: '#FFB74D',
          icon: '⚠',
        };
      case 'POISONOUS':
        return {
          label: 'TRUJĄCY',
          bgColor: '#FFEBEE',
          textColor: '#C62828',
          borderColor: '#EF5350',
          icon: '✕',
        };
      case 'DEADLY_POISONOUS':
        return {
          label: 'ŚMIERTELNIE TRUJĄCY',
          bgColor: '#3E000C',
          textColor: '#FF4560',
          borderColor: '#FF1744',
          icon: '☠',
        };
    }
  };

  const config = getBadgeConfig();

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          paddingVertical: isSmall ? 2 : isLarge ? 8 : 4,
          paddingHorizontal: isSmall ? 6 : isLarge ? 14 : 10,
        },
      ]}
    >
      <Text
        style={[
          styles.icon,
          {
            color: config.textColor,
            fontSize: isSmall ? 10 : isLarge ? 16 : 12,
            marginRight: 4,
          },
        ]}
      >
        {config.icon}
      </Text>
      <Text
        style={[
          styles.text,
          {
            color: config.textColor,
            fontSize: isSmall ? 10 : isLarge ? 14 : 12,
            fontWeight: '700',
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    fontWeight: 'bold',
  },
  text: {
    letterSpacing: 0.5,
  },
});
