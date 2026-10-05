import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ConfusionRisk } from '../types/mushroom';
import { EdibilityBadge } from './EdibilityBadge';

interface Props {
  risks: ConfusionRisk[];
  /**
   * Shown only when the list is empty AND this is a deliberate sourced statement.
   * A missing or blank value never means "no dangerous look-alikes".
   */
  noDangerousLookAlikesSource?: string;
  /** Ids that have an atlas card. Unknown ids are named without a link. */
  catalogIds?: ReadonlySet<string>;
  onOpenSpecies?: (speciesId: string) => void;
}

export const INCOMPLETE_LOOKALIKE_TITLE = 'Informacja o sobowtórach jest niepełna';
export const INCOMPLETE_LOOKALIKE_BODY =
  'Pusta lista nie oznacza braku groźnych sobowtórów. Nie traktuj jej jako zgody na zbiór. Oznaczenie potwierdź u grzyboznawcy lub w stacji Sanepid.';

export const LookAlikeAlert: React.FC<Props> = ({
  risks,
  noDangerousLookAlikesSource,
  catalogIds,
  onOpenSpecies,
}) => {
  const list = risks ?? [];
  const source = noDangerousLookAlikesSource?.trim() ?? '';

  if (list.length === 0) {
    if (source) {
      return (
        <View style={styles.sourcedContainer} testID="lookalike-sourced-clearance">
          <Text style={styles.sourcedTitle}>W danych zapisano brak groźnych sobowtórów</Text>
          <Text style={styles.sourcedDesc}>
            To świadomy wpis ze źródłem, a nie wniosek z pustej listy. Źródło: {source}. Przed
            spożyciem i tak potwierdź oznaczenie u grzyboznawcy.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.incompleteContainer} testID="lookalike-incomplete">
        <Text style={styles.incompleteTitle}>{INCOMPLETE_LOOKALIKE_TITLE}</Text>
        <Text style={styles.incompleteDesc}>{INCOMPLETE_LOOKALIKE_BODY}</Text>
      </View>
    );
  }

  const hasFatal = list.some((r) => r.fatal);

  return (
    <View style={[styles.container, hasFatal ? styles.fatalBorder : styles.warningBorder]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerIcon}>{hasFatal ? '☠' : '⚠'}</Text>
        <View style={styles.headerTextCol}>
          <Text style={[styles.headerTitle, hasFatal && styles.fatalTitle]}>
            {hasFatal ? 'ŚMIERTELNIE GROŹNE SOBOWTÓRY!' : 'Uwaga na możliwe pomyłki'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Przed zbiorem koniecznie sprawdź poniższe różnice morfologiczne:
          </Text>
        </View>
      </View>

      {list.map((risk, idx) => {
        const inCatalog = catalogIds?.has(risk.confusedWithId) ?? false;
        const canOpen = inCatalog && !!onOpenSpecies;
        return (
          <View key={`${risk.confusedWithId}-${idx}`} style={styles.riskCard}>
            <View style={styles.riskTop}>
              <Text style={styles.riskName}>Można pomylić z: {risk.confusedWithName}</Text>
              <EdibilityBadge status={risk.confusedWithStatus} size="small" />
            </View>
            {canOpen ? (
              <TouchableOpacity
                onPress={() => onOpenSpecies?.(risk.confusedWithId)}
                testID={`lookalike-link-${risk.confusedWithId}`}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Zobacz kartę w atlasie</Text>
              </TouchableOpacity>
            ) : null}
            {catalogIds && !inCatalog ? (
              <Text style={styles.unlinkedNote} testID={`lookalike-unlinked-${risk.confusedWithId}`}>
                Brak karty w atlasie — nazwa tylko informacyjna, bez linku.
              </Text>
            ) : null}
            <View style={styles.differencesBox}>
              <Text style={styles.diffLabel}>Kluczowe różnice rozpoznawcze:</Text>
              {risk.keyDifferences.map((diff, dIdx) => (
                <View key={dIdx} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{diff}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    backgroundColor: '#FFF',
  },
  warningBorder: {
    borderWidth: 1.5,
    borderColor: '#FFA000',
    backgroundColor: '#FFFDE7',
  },
  fatalBorder: {
    borderWidth: 2,
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D84315',
  },
  fatalTitle: {
    color: '#B71C1C',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  riskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  riskName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B3B22',
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  unlinkedNote: {
    fontSize: 12,
    color: '#6D4C41',
    fontWeight: '600',
    marginBottom: 8,
  },
  differencesBox: {
    marginTop: 4,
  },
  diffLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    color: '#D32F2F',
    fontSize: 14,
    lineHeight: 18,
    marginRight: 6,
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    lineHeight: 17,
  },
  incompleteContainer: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFB300',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  incompleteTitle: {
    color: '#E65100',
    fontWeight: '800',
    fontSize: 14,
  },
  incompleteDesc: {
    color: '#6D4C41',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  sourcedContainer: {
    backgroundColor: '#F1F5F9',
    borderColor: '#64748B',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  sourcedTitle: {
    color: '#1E293B',
    fontWeight: '800',
    fontSize: 14,
  },
  sourcedDesc: {
    color: '#334155',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
});
