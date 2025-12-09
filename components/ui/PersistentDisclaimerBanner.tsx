import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface PersistentDisclaimerBannerProps {
  variant?: 'compact' | 'full';
}

export default function PersistentDisclaimerBanner({
  variant = 'compact'
}: PersistentDisclaimerBannerProps) {
  const router = useRouter();

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <AlertTriangle size={16} color="#DC2626" />
        <Text style={styles.compactText}>
          ⚠️ Educational purposes only. Always consult your healthcare provider.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <View style={styles.header}>
        <AlertTriangle size={24} color="#DC2626" />
        <Text style={styles.title}>IMPORTANT MEDICAL DISCLAIMER</Text>
      </View>

      <Text style={styles.mainText}>
        ⚠️ This calculator is for educational purposes only. Always consult your healthcare provider.
      </Text>

      <View style={styles.warningList}>
        <Text style={styles.warningItem}>• NOT a substitute for professional medical advice</Text>
        <Text style={styles.warningItem}>• AI-generated data may contain errors</Text>
        <Text style={styles.warningItem}>• Verify ALL insulin calculations with your doctor</Text>
      </View>

      <Pressable
        style={styles.emergencyButton}
        onPress={() => router.push('/(tabs)/emergency')}
      >
        <Phone size={16} color="#FFFFFF" />
        <Text style={styles.emergencyText}>Emergency: Call 911</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    lineHeight: 16,
  },
  fullContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 3,
    borderColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7F1D1D',
    lineHeight: 22,
    marginBottom: 12,
  },
  warningList: {
    gap: 6,
    marginBottom: 12,
  },
  warningItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F1D1D',
    lineHeight: 18,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
