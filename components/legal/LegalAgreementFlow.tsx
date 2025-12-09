import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, FileText, Shield, CheckSquare, Square, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LegalAgreementFlowProps {
  visible: boolean;
  onComplete: () => void;
  onDecline: () => void;
}

export default function LegalAgreementFlow({
  visible,
  onComplete,
  onDecline,
}: LegalAgreementFlowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [acceptances, setAcceptances] = useState({
    medicalDisclaimer: false,
    termsOfService: false,
    privacyPolicy: false,
    dataAccuracy: false,
    noLiability: false,
    emergencyAwareness: false,
  });

  const allAccepted = Object.values(acceptances).every(Boolean);

  const toggleAcceptance = (key: keyof typeof acceptances) => {
    setAcceptances(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveConsent = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('legal_consents').insert({
        user_id: user.id,
        terms_version: '1.0',
        privacy_version: '1.0',
        medical_disclaimer_accepted: true,
        consent_type: 'initial',
        accepted_at: new Date().toISOString(),
      });

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error saving consent:', error);
      Alert.alert('Error', 'Failed to save your consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Agreement Required',
      'You must accept all terms and disclaimers to use DiabetesCare. The app cannot function without your acknowledgment of these important safety warnings.',
      [
        { text: 'Review Again', style: 'cancel' },
        { text: 'Exit App', style: 'destructive', onPress: onDecline },
      ]
    );
  };

  const renderMedicalDisclaimerStep = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentContainer}>
      <View style={styles.warningHeader}>
        <AlertTriangle size={48} color="#DC2626" />
        <Text style={styles.warningTitle}>CRITICAL MEDICAL DISCLAIMER</Text>
      </View>

      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>
          ⚠️ <Text style={styles.bold}>This calculator is for educational purposes only. Always consult your healthcare provider.</Text>
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Important Warnings:</Text>

      <View style={styles.warningList}>
        <View style={styles.warningItem}>
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.warningItemText}>
            <Text style={styles.bold}>NOT A MEDICAL DEVICE:</Text> DiabetesCare is a health management tool, NOT a substitute for professional medical advice, diagnosis, or treatment.
          </Text>
        </View>

        <View style={styles.warningItem}>
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.warningItemText}>
            <Text style={styles.bold}>AI MAY BE INACCURATE:</Text> AI-generated nutritional information and food recognition may contain errors. Always verify critical data.
          </Text>
        </View>

        <View style={styles.warningItem}>
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.warningItemText}>
            <Text style={styles.bold}>VERIFY INSULIN DOSES:</Text> All insulin dosage calculations are ESTIMATES only. Always consult your doctor before administering insulin.
          </Text>
        </View>

        <View style={styles.warningItem}>
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.warningItemText}>
            <Text style={styles.bold}>NEVER IGNORE MEDICAL ADVICE:</Text> Do not disregard, avoid, or delay professional medical advice based on app information.
          </Text>
        </View>

        <View style={styles.warningItem}>
          <Phone size={20} color="#DC2626" />
          <Text style={styles.warningItemText}>
            <Text style={styles.bold}>CALL 911 IN EMERGENCIES:</Text> In case of medical emergency, hypoglycemia, or severe hyperglycemia, call 911 immediately.
          </Text>
        </View>
      </View>

      <Card style={styles.acknowledgmentCard}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => toggleAcceptance('medicalDisclaimer')}
        >
          {acceptances.medicalDisclaimer ? (
            <CheckSquare size={24} color="#2563EB" />
          ) : (
            <Square size={24} color="#6B7280" />
          )}
          <Text style={styles.checkboxText}>
            I understand and acknowledge this medical disclaimer. I will consult my healthcare provider for all medical decisions.
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );

  const renderTermsStep = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentContainer}>
      <View style={styles.iconHeader}>
        <FileText size={48} color="#2563EB" />
        <Text style={styles.stepTitle}>Terms of Service & Liability</Text>
      </View>

      <Text style={styles.sectionDescription}>
        Please read and accept the following terms:
      </Text>

      <Card style={styles.termsCard}>
        <Text style={styles.termsTitle}>1. Limited Liability</Text>
        <Text style={styles.termsText}>
          DiabetesCare and its developers SHALL NOT BE LIABLE for any health complications, medical decisions, adverse events, or damages arising from use of this app. Use at your own risk.
        </Text>
      </Card>

      <Card style={styles.termsCard}>
        <Text style={styles.termsTitle}>2. Data Accuracy Disclaimer</Text>
        <Text style={styles.termsText}>
          Nutritional data, carbohydrate counts, and insulin recommendations are ESTIMATES. We do not guarantee accuracy or completeness of information.
        </Text>
      </Card>

      <Card style={styles.termsCard}>
        <Text style={styles.termsTitle}>3. No Warranty</Text>
        <Text style={styles.termsText}>
          The app is provided "AS IS" without warranties of any kind, including accuracy, fitness for medical use, or uninterrupted operation.
        </Text>
      </Card>

      <Card style={styles.termsCard}>
        <Text style={styles.termsTitle}>4. User Responsibility</Text>
        <Text style={styles.termsText}>
          YOU are responsible for verifying all data, consulting healthcare providers, and making informed medical decisions. The app provides information only.
        </Text>
      </Card>

      <View style={styles.checkboxList}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => toggleAcceptance('termsOfService')}
        >
          {acceptances.termsOfService ? (
            <CheckSquare size={24} color="#2563EB" />
          ) : (
            <Square size={24} color="#6B7280" />
          )}
          <Text style={styles.checkboxText}>
            I have read and accept the full Terms of Service
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => toggleAcceptance('noLiability')}
        >
          {acceptances.noLiability ? (
            <CheckSquare size={24} color="#2563EB" />
          ) : (
            <Square size={24} color="#6B7280" />
          )}
          <Text style={styles.checkboxText}>
            I acknowledge DiabetesCare is not liable for medical outcomes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => toggleAcceptance('dataAccuracy')}
        >
          {acceptances.dataAccuracy ? (
            <CheckSquare size={24} color="#2563EB" />
          ) : (
            <Square size={24} color="#6B7280" />
          )}
          <Text style={styles.checkboxText}>
            I understand AI data may be inaccurate and will verify important information
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.viewFullLink}
        onPress={() => router.push('/(tabs)/terms-of-service')}
      >
        <FileText size={16} color="#2563EB" />
        <Text style={styles.viewFullLinkText}>View Full Terms of Service</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPrivacyStep = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentContainer}>
      <View style={styles.iconHeader}>
        <Shield size={48} color="#059669" />
        <Text style={styles.stepTitle}>Privacy & Data Usage</Text>
      </View>

      <Card style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>Your Health Data</Text>
        <Text style={styles.privacyText}>
          • Food logs, glucose readings, and insulin data are stored securely{'\n'}
          • Images are processed by AI services (Anthropic/OpenAI){'\n'}
          • Data may be used to improve app functionality{'\n'}
          • You can export or delete your data anytime
        </Text>
      </Card>

      <Card style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>Third-Party Services</Text>
        <Text style={styles.privacyText}>
          We share data with:{'\n'}
          • Supabase (secure cloud storage){'\n'}
          • Stripe (payment processing){'\n'}
          • AI providers (food analysis){'\n'}
          • Your healthcare providers (if you choose to share)
        </Text>
      </Card>

      <View style={styles.checkboxList}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => toggleAcceptance('privacyPolicy')}
        >
          {acceptances.privacyPolicy ? (
            <CheckSquare size={24} color="#2563EB" />
          ) : (
            <Square size={24} color="#6B7280" />
          )}
          <Text style={styles.checkboxText}>
            I have read and accept the Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.viewFullLink}
        onPress={() => router.push('/(tabs)/privacy-policy')}
      >
        <Shield size={16} color="#2563EB" />
        <Text style={styles.viewFullLinkText}>View Full Privacy Policy</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderEmergencyStep = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentContainer}>
      <View style={styles.emergencyHeader}>
        <Phone size={48} color="#DC2626" />
        <Text style={styles.emergencyTitle}>Emergency Protocol</Text>
      </View>

      <Card style={styles.emergencyCard}>
        <Text style={styles.emergencyInstructions}>
          <Text style={styles.bold}>IF YOU EXPERIENCE:</Text>
        </Text>
        <Text style={styles.emergencyList}>
          • Severe hypoglycemia (blood sugar below 54 mg/dL){'\n'}
          • Loss of consciousness{'\n'}
          • Confusion or inability to function{'\n'}
          • Severe hyperglycemia with ketones{'\n'}
          • Chest pain or difficulty breathing{'\n'}
          • Any life-threatening symptoms
        </Text>
        <View style={styles.callEmergency}>
          <Phone size={32} color="#FFFFFF" />
          <Text style={styles.callEmergencyText}>CALL 911 IMMEDIATELY</Text>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>DO NOT rely on this app in emergencies</Text>
        <Text style={styles.infoText}>
          DiabetesCare is a tracking and estimation tool. In medical emergencies, always call emergency services or go to the nearest emergency room.
        </Text>
      </Card>

      <View style={styles.checkboxList}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => toggleAcceptance('emergencyAwareness')}
        >
          {acceptances.emergencyAwareness ? (
            <CheckSquare size={24} color="#2563EB" />
          ) : (
            <Square size={24} color="#6B7280" />
          )}
          <Text style={styles.checkboxText}>
            I understand this app is NOT for emergencies and will call 911 if needed
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const steps = [
    {
      title: 'Medical Disclaimer',
      component: renderMedicalDisclaimerStep,
      required: true,
    },
    {
      title: 'Terms & Liability',
      component: renderTermsStep,
      required: true,
    },
    {
      title: 'Privacy Policy',
      component: renderPrivacyStep,
      required: true,
    },
    {
      title: 'Emergency Protocol',
      component: renderEmergencyStep,
      required: true,
    },
  ];

  const canProceed = () => {
    if (currentStep === 0) return acceptances.medicalDisclaimer;
    if (currentStep === 1) return acceptances.termsOfService && acceptances.noLiability && acceptances.dataAccuracy;
    if (currentStep === 2) return acceptances.privacyPolicy;
    if (currentStep === 3) return acceptances.emergencyAwareness;
    return false;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (allAccepted) {
      saveConsent();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Legal Agreement Required</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Step {currentStep + 1} of {steps.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / steps.length) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {steps[currentStep].component()}

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {currentStep > 0 && (
              <Button
                title="Back"
                onPress={handleBack}
                variant="outline"
                style={styles.backButton}
              />
            )}

            {currentStep === 0 && (
              <Button
                title="Decline & Exit"
                onPress={handleDecline}
                variant="outline"
                style={styles.declineButton}
              />
            )}

            <Button
              title={currentStep === steps.length - 1 ? (loading ? 'Saving...' : 'Accept & Continue') : 'Next'}
              onPress={handleNext}
              disabled={!canProceed() || loading}
              style={styles.nextButton}
            />
          </View>

          <Text style={styles.footerNote}>
            All agreements must be accepted to use DiabetesCare
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    padding: 20,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  disclaimerCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 3,
    borderColor: '#DC2626',
    padding: 16,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F1D1D',
    lineHeight: 24,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  warningList: {
    gap: 16,
    marginBottom: 24,
  },
  warningItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  warningItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  acknowledgmentCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#2563EB',
    padding: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  termsCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  checkboxList: {
    gap: 16,
    marginBottom: 16,
  },
  viewFullLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  viewFullLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  privacyCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
  },
  emergencyHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 12,
    textAlign: 'center',
  },
  emergencyCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 3,
    borderColor: '#DC2626',
    padding: 20,
    marginBottom: 16,
  },
  emergencyInstructions: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7F1D1D',
    marginBottom: 12,
  },
  emergencyList: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 22,
    marginBottom: 16,
  },
  callEmergency: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  callEmergencyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
    borderColor: '#DC2626',
  },
  nextButton: {
    flex: 2,
  },
  footerNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
