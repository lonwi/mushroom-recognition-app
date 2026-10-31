import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface Props {
  /** Zmiana klucza (inna karta albo inna trasa) czyści błąd. */
  resetKey: string;
  children: React.ReactNode;
  /** Testy i historie podają schemat. Powłoka zostawia to puste i idzie za systemem. */
  colorScheme?: 'light' | 'dark' | null;
}

interface State {
  hasError: boolean;
}

/**
 * Łapie błąd renderu treści karty. Nagłówek i pasek kart są poza granicą,
 * więc „Pomoc” z numerami alarmowymi zostaje dostępna.
 */
export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Bez error.message i stosu: komunikat może zawierać notatkę z dziennika,
    // współrzędne albo ścieżkę zdjęcia. Logujemy tylko typ błędu i trasę.
    const errorName = error instanceof Error ? error.name : typeof error;
    console.error('[ScreenErrorBoundary] Błąd renderu ekranu', {
      screen: this.props.resetKey,
      errorName,
    });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Czyść dopiero, gdy fallback był już pokazany dla poprzedniego klucza.
    // Błąd złapany w tym samym renderze, który zmienia resetKey, zostaje:
    // inaczej granica od razu rysuje zepsuty ekran drugi raz.
    if (prevState.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ScreenErrorFallback onRetry={this.retry} colorScheme={this.props.colorScheme} />;
    }
    return this.props.children;
  }
}

function ScreenErrorFallback({
  onRetry,
  colorScheme,
}: {
  onRetry: () => void;
  colorScheme?: 'light' | 'dark' | null;
}) {
  const { t } = useLanguage();
  const systemScheme = useColorScheme();
  const dark = (colorScheme === undefined ? systemScheme : colorScheme) === 'dark';
  const retryLabel = t('screenError.retry');
  return (
    <View
      style={[styles.container, dark ? styles.containerDark : styles.containerLight]}
      testID="screen-error-fallback"
    >
      <Text
        style={[styles.title, dark ? styles.titleDark : styles.titleLight]}
        accessibilityRole="header"
      >
        {t('screenError.title')}
      </Text>
      <Text
        style={[styles.body, dark ? styles.bodyDark : styles.bodyLight]}
        testID="screen-error-body"
      >
        {t('screenError.body', { tab: t('nav.safety') })}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        testID="screen-error-retry"
      >
        <Text style={styles.buttonText}>{retryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  containerLight: {
    backgroundColor: colors.background,
  },
  containerDark: {
    backgroundColor: colors.slate900,
  },
  title: {
    fontSize: typography.headline,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  titleLight: {
    color: colors.slate900,
  },
  titleDark: {
    color: colors.slate200,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  bodyLight: {
    color: colors.slate700,
  },
  bodyDark: {
    color: colors.slate200,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
});
