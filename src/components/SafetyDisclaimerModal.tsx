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
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  visible: boolean;
  onAccept: () => void;
}

export const SafetyDisclaimerModal: React.FC<Props> = ({ visible, onAccept }) => {
  const { t } = useLanguage();
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>⚠️</Text>
            <Text style={styles.headerTitle}>{t('disclaimer.title')}</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.alertBox}>
              <Text style={styles.alertBoxTitle}>{t('disclaimer.alertTitle')}</Text>
              <Text style={styles.alertBoxText}>{t('disclaimer.alertBody')}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('disclaimer.sectionTitle')}</Text>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>1</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>{t('disclaimer.point1Label')}</Text> {t('disclaimer.point1Body')}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>2</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>{t('disclaimer.point2Label')}</Text> {t('disclaimer.point2Body')}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>3</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>{t('disclaimer.point3Label')}</Text> {t('disclaimer.point3Body')}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointNum}>4</Text>
              <Text style={styles.pointText}>
                <Text style={styles.bold}>{t('disclaimer.point4Label')}</Text> {t('disclaimer.point4Body')}
              </Text>
            </View>

            <View style={styles.emergencyBanner}>
              <Text style={styles.emergencyTitle}>{t('disclaimer.emergencyTitle')}</Text>
              <Text style={styles.emergencyText}>
                {t('disclaimer.emergencyBefore')}
                <Text style={styles.bold}>{t('disclaimer.emergencyNumber')}</Text>
                {t('disclaimer.emergencyAfter')}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onAccept} activeOpacity={0.8}>
              <Text style={styles.buttonText}>{t('disclaimer.accept')}</Text>
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
