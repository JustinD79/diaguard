import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, TriangleAlert as AlertTriangle, Clock, Target } from 'lucide-react-native';

interface InsulinSettings {
  carbRatio: number;
  correctionFactor: number;
  targetBG: number;
  maxBG: number;
}

export default function InsulinCalculatorScreen() {
  const [currentBG, setCurrentBG] = useState('');
  const [carbs, setCarbs] = useState('');
  const [insulinSettings] = useState<InsulinSettings>({
    carbRatio: 15, // 1 unit per 15g carbs
    correctionFactor: 50, // 1 unit per 50 mg/dL above target
    targetBG: 100,
    maxBG: 300,
  });
  const [calculatedDose, setCalculatedDose] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const calculateInsulin = () => {
    const bgValue = parseFloat(currentBG);
    const carbValue = parseFloat(carbs);

    if (isNaN(bgValue) || isNaN(carbValue)) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for blood glucose and carbohydrates.');
      return;
    }

    if (bgValue > insulinSettings.maxBG) {
      setShowWarning(true);
      Alert.alert(
        'High Blood Glucose Warning',
        'Your blood glucose is extremely high. Please contact your healthcare provider immediately.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (bgValue < 70) {
      setShowWarning(true);
      Alert.alert(
        'Low Blood Glucose Warning',
        'Your blood glucose is low. Treat hypoglycemia before taking insulin.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Calculate meal insulin (carb coverage)
    const mealInsulin = carbValue / insulinSettings.carbRatio;

    // Calculate correction insulin
    let correctionInsulin = 0;
    if (bgValue > insulinSettings.targetBG) {
      correctionInsulin = (bgValue - insulinSettings.targetBG) / insulinSettings.correctionFactor;
    }

    const totalInsulin = mealInsulin + correctionInsulin;
    setCalculatedDose(Math.round(totalInsulin * 2) / 2); // Round to nearest 0.5 unit
    setShowWarning(false);
  };

  const clearCalculation = () => {
    setCurrentBG('');
    setCarbs('');
    setCalculatedDose(null);
    setShowWarning(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View accessibilityRole="banner" accessible={true} accessibilityLabel="Insulin calculator page header">
        <View style={styles.header}>
          <Text style={styles.title}>Insulin Calculator</Text>
          <Text style={styles.subtitle}>Calculate your insulin dose based on blood glucose and carbs</Text>
        </View>
      </View>

      <View accessibilityRole="main" accessible={true} accessibilityLabel="Insulin calculator main content">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.disclaimer} accessibilityRole="alert" accessible={true} accessibilityLabel="Medical disclaimer and safety warning">
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.disclaimerText}>
            This calculator is for educational purposes only. Always consult with your healthcare provider before making insulin dosing decisions.
          </Text>
        </View>

        <View style={styles.inputSection} accessibilityRole="form" accessible={true} accessibilityLabel="Blood glucose and carbohydrate input form">
          <Text style={styles.sectionTitle}>Current Readings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Blood Glucose (mg/dL)</Text>
            <TextInput
              style={styles.input}
              value={currentBG}
              onChangeText={setCurrentBG}
              placeholder="Enter current BG"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              accessibilityLabel="Blood glucose input"
              accessibilityHint="Enter your current blood glucose reading in milligrams per deciliter"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Carbohydrates (grams)</Text>
            <TextInput
              style={styles.input}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="Enter carbs to consume"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              accessibilityLabel="Carbohydrates input"
              accessibilityHint="Enter the grams of carbohydrates you plan to consume"
            />
          </View>
        </View>

        <View style={styles.settingsSection} accessibilityRole="complementary" accessible={true} accessibilityLabel="Your insulin calculation settings">
          <Text style={styles.sectionTitle}>Your Settings</Text>
          
          <View style={styles.settingItem} accessibilityRole="text" accessible={true} accessibilityLabel={`Carb ratio setting: 1 unit per ${insulinSettings.carbRatio} grams carbs`}>
            <View style={styles.settingIcon}>
              <Target size={20} color="#2563EB" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Carb Ratio</Text>
              <Text style={styles.settingValue}>1 unit per {insulinSettings.carbRatio}g carbs</Text>
            </View>
          </View>

          <View style={styles.settingItem} accessibilityRole="text" accessible={true} accessibilityLabel={`Correction factor: 1 unit per ${insulinSettings.correctionFactor} milligrams per deciliter`}>
            <View style={styles.settingIcon}>
              <Calculator size={20} color="#2563EB" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Correction Factor</Text>
              <Text style={styles.settingValue}>1 unit per {insulinSettings.correctionFactor} mg/dL</Text>
            </View>
          </View>

          <View style={styles.settingItem} accessibilityRole="text" accessible={true} accessibilityLabel={`Target blood glucose: ${insulinSettings.targetBG} milligrams per deciliter`}>
            <View style={styles.settingIcon}>
              <Target size={20} color="#2563EB" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Target BG</Text>
              <Text style={styles.settingValue}>{insulinSettings.targetBG} mg/dL</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer} accessibilityRole="group" accessible={true} accessibilityLabel="Calculator action buttons">
          <TouchableOpacity
            style={[styles.button, styles.calculateButton]}
            onPress={calculateInsulin}
            accessibilityRole="button"
            accessible={true}
            accessibilityLabel="Calculate insulin dose"
            accessibilityHint="Calculate educational insulin dose based on entered values"
          >
            <Calculator size={20} color="#FFFFFF" />
            <Text style={styles.calculateButtonText}>Calculate Dose</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearCalculation}
            accessibilityRole="button"
            accessible={true}
            accessibilityLabel="Clear calculator"
            accessibilityHint="Clear all entered values and reset calculator"
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {calculatedDose !== null && (
          <View 
            style={[styles.resultSection, showWarning && styles.warningResult]}
            accessibilityRole="alert"
            accessible={true}
            accessibilityLabel={`Calculated educational insulin dose: ${calculatedDose} units. Remember this is for educational purposes only`}
          >
            <Text style={styles.resultTitle}>Calculated Insulin Dose</Text>
            <Text style={styles.resultDose}>{calculatedDose} units</Text>
            <Text style={styles.resultNote}>
              Always double-check your calculation and consult your healthcare provider if unsure.
            </Text>
          </View>
        )}

        <View style={styles.recentDoses} accessibilityRole="region" accessible={true} accessibilityLabel="Recent insulin dose history">
          <Text style={styles.sectionTitle}>Recent Doses</Text>
          
          <View style={styles.doseItem} accessibilityRole="listitem" accessible={true} accessibilityLabel="Recent dose: 4.5 units at 2:30 PM, blood glucose 145, carbs 45 grams">
            <View style={styles.doseInfo}>
              <Text style={styles.doseAmount}>4.5 units</Text>
              <Text style={styles.doseDetails}>BG: 145 mg/dL • Carbs: 45g</Text>
            </View>
            <View style={styles.doseTime}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.doseTimeText}>2:30 PM</Text>
            </View>
          </View>

          <View style={styles.doseItem} accessibilityRole="listitem" accessible={true} accessibilityLabel="Recent dose: 3.0 units at 8:15 AM, blood glucose 120, carbs 30 grams">
            <View style={styles.doseInfo}>
              <Text style={styles.doseAmount}>3.0 units</Text>
              <Text style={styles.doseDetails}>BG: 120 mg/dL • Carbs: 30g</Text>
            </View>
            <View style={styles.doseTime}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.doseTimeText}>8:15 AM</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2F3A4F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFB74D',
    marginLeft: 12,
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2F3A4F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EAE6F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#EAE6F7',
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#EAE6F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculateButton: {
    backgroundColor: '#6B4EFF',
    flexDirection: 'row',
    gap: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#EAE6F7',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  resultSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1CC7A8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningResult: {
    borderColor: '#FFB74D',
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2F3A4F',
    marginBottom: 8,
  },
  resultDose: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#6B4EFF',
    marginBottom: 8,
  },
  resultNote: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  recentDoses: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  doseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  doseInfo: {
    flex: 1,
  },
  doseAmount: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  doseDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  doseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doseTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});