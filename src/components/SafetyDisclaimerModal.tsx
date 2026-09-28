import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onAccept: () => void;
}

export const SafetyDisclaimerModal: React.FC<Props> = ({ visible, onAccept }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>⚠️</Text>
            <Text style={styles.headerTitle}>Ważne Ostrzeżenie i Zasady Bezpieczeństwa</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.alertBox}>
              <Text style={styles.alertBoxTitle}>
                NIGDY NIE SPOŻYWAJ GRZYBÓW WYŁĄCZNIE NA PODSTAWIE WSKAZAŃ APLIKACJI!
              </Text>
              <Text style={styles.alertBoxText}>
                Algorytmy sztucznej inteligencji (AI/ML) mają wyłącznie charakter pomocniczy i edukacyjny.
                Nawet najbardziej zaawansowany model może pomylić gatunek ze względu na oświetlenie, wiek owocnika, zanieczyszczenia lub uszkodzenia.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Pamiętaj o nadrzędnych zasadach:</Text>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>1</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>Jeden błąd może kosztować życie:</Text> Muchomor sromotnikowy
                (zielonawy) zawiera amatoksyny, których zjedzenie niszczy wątrobę i często kończy się śmiercią.
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>2</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>Zasada ograniczonego zaufania:</Text> Jeśli masz choć cień
                wątpliwości – ZOSTAW GRZYBA W LESIE!
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>3</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>Weryfikacja w Sanepidzie:</Text> W każdym powiatowym
                inspektoracie sanitarno-epidemiologicznym w Polsce dyżurują klasyfikatorzy i grzyboznawcy,
                którzy BEZPŁATNIE oceniają zebrane okazy.
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>4</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>Zawsze fotografuj cały owocnik:</Text> Zarówno wierzch kapelusza,
                spód (blaszki/rurki), jak i podstawę trzonu wykręconą z ściółki.
              </Text>
            </View>

            <View style={styles.emergencyBanner}>
              <Text style={styles.emergencyTitle}>W razie podejrzenia zatrucia:</Text>
              <Text style={styles.emergencyText}>
                Natychmiast zadzwoń pod numer alarmowy <Text style={styles.bold}>112</Text> lub skontaktuj
                się z najbliższym szpitalnym oddziałem toksykologii.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onAccept} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Rozumiem i akceptuję zasady</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FBF9',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    marginVertical: 16,
  },
  headerIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3B22',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  alertBox: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  alertBoxTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B71C1C',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  alertBoxText: {
    fontSize: 13,
    color: '#491217',
    lineHeight: 18,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3B22',
    marginBottom: 14,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pointNum: {
    backgroundColor: '#2E7D32',
    color: '#FFF',
    fontWeight: 'bold',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 10,
    fontSize: 12,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  emergencyBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  emergencyTitle: {
    fontWeight: '800',
    color: '#92400E',
    fontSize: 14,
    marginBottom: 4,
  },
  emergencyText: {
    color: '#78350F',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    backgroundColor: '#1B3B22',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1B3B22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
