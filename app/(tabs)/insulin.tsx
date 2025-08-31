import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Insulin Calculator</Text>
          <Text style={styles.subtitle}>Educational purposes only</Text>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ This calculator is for educational purposes only. Always consult your healthcare provider.
          </Text>
        </View>

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
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Calculated Dose</Text>
            <Text style={styles.resultValue}>{result} units</Text>
            <Text style={styles.resultNote}>
              Always verify with your healthcare provider
            </Text>
          </View>
        )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  disclaimer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
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
    borderColor: '#10B981',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  resultNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});