import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Body of a tab screen. The app shell already insets the status bar and the
 * navigation bar, so this frame does not.
 */
export function ScreenFrame({ title, subtitle, children }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  headerTitle: {
    fontSize: typography.headline,
    fontWeight: '800',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: typography.small,
    color: colors.slate500,
    marginTop: spacing.xxs,
  },
});
