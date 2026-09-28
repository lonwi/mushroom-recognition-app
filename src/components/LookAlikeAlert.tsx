import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConfusionRisk } from '../types/mushroom';
import { EdibilityBadge } from './EdibilityBadge';

interface Props {
  risks: ConfusionRisk[];
}

export const LookAlikeAlert: React.FC<Props> = ({ risks }) => {
  if (!risks || risks.length === 0) {
    return (
      <View style={styles.safeContainer}>
        <Text style={styles.safeTitle}>✓ Brak niebezpiecznych sobowtórów</Text>
        <Text style={styles.safeDesc}>
          Ten gatunek nie posiada w Polsce łatwych do pomylenia, śmiertelnie trujących odpowiedników.
        </Text>
      </View>
    );
  }

  const hasFatal = risks.some((r) => r.fatal);

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

      {risks.map((risk, idx) => (
        <View key={idx} style={styles.riskCard}>
          <View style={styles.riskTop}>
            <Text style={styles.riskName}>Można pomylić z: {risk.confusedWithName}</Text>
            <EdibilityBadge status={risk.confusedWithStatus} size="small" />
          </View>
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
      ))}
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
  safeContainer: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  safeTitle: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 14,
  },
  safeDesc: {
    color: '#388E3C',
    fontSize: 12,
    marginTop: 2,
  },
});
