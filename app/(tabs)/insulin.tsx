import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Phone } from 'lucide-react-native';
import PersistentDisclaimerBanner from '@/components/ui/PersistentDisclaimerBanner';
import MedicalDisclaimer from '@/components/ui/MedicalDisclaimer';

export default function InsulinScreen() {
  const [bloodGlucose, setBloodGlucose] = useState('');
  const [carbs, setCarbs] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculateInsulin = () => {
    const bg = parseFloat(bloodGlucose);
    const carbValue = parseFloat(carbs);

    if (isNaN(bg) || isNaN(carbValue)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    // Simple calculation (educational purposes only)
    const carbRatio = 15; // 1 unit per 15g carbs
    const correctionFactor = 50; // 1 unit per 50 mg/dL above 100
    const targetBG = 100;

    const mealInsulin = carbValue / carbRatio;
    const correctionInsulin = Math.max(0, (bg - targetBG) / correctionFactor);
    const totalInsulin = mealInsulin + correctionInsulin;

    setResult(Math.round(totalInsulin * 2) / 2); // Round to nearest 0.5
  };

  return (
    <SafeAreaView style={styles.container}>
      <PersistentDisclaimerBanner variant="compact" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Insulin Calculator</Text>
          <Text style={styles.subtitle}>EDUCATIONAL TOOL - NOT MEDICAL ADVICE</Text>
        </View>

        <View style={styles.criticalWarning}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={32} color="#DC2626" />
            <Text style={styles.warningTitle}>CRITICAL WARNING</Text>
          </View>
          <Text style={styles.warningText}>
            ⚠️ This calculator is for educational purposes only. Always consult your healthcare provider before making any insulin dosing decisions.
          </Text>
          <Text style={styles.warningText}>
            • Calculations are ESTIMATES only{'\n'}
            • NOT a substitute for medical advice{'\n'}
            • Your doctor must verify all dosages{'\n'}
            • Incorrect dosing can be life-threatening
          </Text>
        </View>

        <MedicalDisclaimer variant="danger" />

        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Blood Glucose (mg/dL)</Text>
            <TextInput
              style={styles.input}
              value={bloodGlucose}
              onChangeText={setBloodGlucose}
              placeholder="Enter current BG"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Carbohydrates (grams)</Text>
            <TextInput
              style={styles.input}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="Enter carbs"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.calculateButton} onPress={calculateInsulin}>
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>
        </View>

        {result !== null && (
          <>
            <View style={styles.resultWarning}>
              <AlertTriangle size={20} color="#DC2626" />
              <Text style={styles.resultWarningText}>
                ESTIMATE ONLY - Not medical advice. Verify with your doctor before administering insulin.
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>ESTIMATED Dose</Text>
              <Text style={styles.resultValue}>{result} units</Text>
              <View style={styles.resultDisclaimer}>
                <Text style={styles.resultDisclaimerText}>
                  ⚠️ This is an educational estimate based on standard ratios. Your personal ratios may differ. ALWAYS verify with your healthcare provider before administering insulin. Incorrect insulin dosing can cause severe hypoglycemia or death.
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.emergencySection}>
          <View style={styles.emergencyHeader}>
            <Phone size={24} color="#DC2626" />
            <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
          </View>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyText}>If you experience severe hypoglycemia, confusion, or medical emergency:</Text>
            <TouchableOpacity style={styles.emergencyButton}>
              <Phone size={20} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>CALL 911 IMMEDIATELY</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.finalDisclaimer}>
          <Text style={styles.finalDisclaimerText}>
            BY USING THIS CALCULATOR, YOU ACKNOWLEDGE THAT:
          </Text>
          <Text style={styles.finalDisclaimerBullet}>
            • This tool is for educational purposes only{'\n'}
            • You will consult your healthcare provider for all insulin decisions{'\n'}
            • You understand incorrect dosing can be life-threatening{'\n'}
            • DiaGaurd is not liable for medical outcomes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  criticalWarning: {
    backgroundColor: '#FEE2E2',
    borderWidth: 3,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 8,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  calculateButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  resultWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#2563EB',
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 16,
  },
  resultDisclaimer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  resultDisclaimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 18,
  },
  emergencySection: {
    marginBottom: 20,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  emergencyCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F1D1D',
    marginBottom: 12,
    lineHeight: 20,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  finalDisclaimer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  finalDisclaimerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  finalDisclaimerBullet: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 18,
  },
});