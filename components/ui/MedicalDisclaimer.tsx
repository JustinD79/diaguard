import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface MedicalDisclaimerProps {
  style?: ViewStyle;
  variant?: 'warning' | 'danger' | 'info';
  compact?: boolean;
}

export default function MedicalDisclaimer({
  style,
  variant = 'warning',
  compact = false,
}: MedicalDisclaimerProps) {
  const backgroundColor = {
    warning: '#FEF3C7',
    danger: '#FEE2E2',
    info: '#DBEAFE',
  }[variant];

  const borderColor = {
    warning: '#F59E0B',
    danger: '#DC2626',
    info: '#3B82F6',
  }[variant];

  const textColor = {
    warning: '#92400E',
    danger: '#991B1B',
    info: '#1E40AF',
  }[variant];

  const iconColor = {
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',
  }[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderLeftColor: borderColor,
        },
        style,
      ]}
    >
      <AlertCircle size={compact ? 20 : 24} color={iconColor} style={styles.icon} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>Medical Disclaimer</Text>
        {!compact && (
          <>
            <Text style={[styles.text, { color: textColor }]}>
              This app is a health management tool and NOT a substitute for professional medical
              advice, diagnosis, or treatment.
            </Text>
            <Text style={[styles.text, { color: textColor }]}>
              • Always consult your healthcare provider before making medical decisions
            </Text>
            <Text style={[styles.text, { color: textColor }]}>
              • AI-generated nutritional data may contain errors
            </Text>
            <Text style={[styles.text, { color: textColor }]}>
              • Verify all insulin dosage calculations with your doctor
            </Text>
            <Text style={[styles.text, { color: textColor }]}>
              • In case of emergency, call 911 immediately
            </Text>
          </>
        )}
        {compact && (
          <Text style={[styles.text, { color: textColor }]}>
            Not a substitute for professional medical advice. Always consult your healthcare provider.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginVertical: 8,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
});
